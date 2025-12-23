// scripts/validateCards.ts
// public/cards.json の整合性チェック（warn / strict）
//
// - warn（デフォルト）: unknown/未知RAW_KEYSがあっても exit(0) だが一覧を出す
// - strict（STRICT=1）: normalize後 unknown が1件でも exit(1)
//
// 実行:
// - npm run validate:cards
// - STRICT=1 npm run validate:cards
//   ※Windows PowerShell の場合: $env:STRICT=1; npm run validate:cards

import fs from "node:fs";
import path from "node:path";

import { BASE_CARDS } from "../src/game/baseCards";
import { DEFAULT_DECKS } from "../src/ui/uiTypes";
import { convertRawCardToGameCard, type RawCard } from "../src/game/cardRegistry";

type IssueLevel = "WARN" | "ERROR";

type Issue = {
  level: IssueLevel;
  cardId: string;
  message: string;
};

const KNOWN_ERAS = new Set([
  "ancient",
  "medieval",
  "medieval_europe",
  "sengoku",
  "edo",
  "meiji",
  "ancient_mediterranean",
  "islamic_world",
  "east_asia",
  "south_asia"
]);

// cards.json の category として許容する値（プロジェクト側で将来拡張しても壊れにくいよう広め）
const KNOWN_CATEGORIES = new Set([
  "resource",
  "victory",
  "person",
  "event",
  "structure",
  "culture",
  "religion",
  "society",
  "social",
  "ideology",
  "philosophy",
  "art",
  "literature",
  "technology",
  "science"
]);

const KNOWN_RAW_KEYS = new Set([
  "conditional",
  "gainKnowledge",
  "draw",
  "attackDiscard",
  "gainRice",
  "trashFromHand",
  "gainVP",
  "reduceCostThisTurn",
  "selfDiscard",
  // 表記ゆれ・将来拡張
  "addActions",
  "addBuys",
  // 正規DSL（type: "gain" 等）
  "type"
]);

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function isNonNegativeInt(v: unknown): boolean {
  return typeof v === "number" && Number.isInteger(v) && v >= 0;
}

function readCardsJson(): RawCard[] {
  const p = path.join(process.cwd(), "public", "cards.json");
  const raw = JSON.parse(fs.readFileSync(p, "utf8"));
  const cards = (raw.cards ?? raw) as any[];
  if (!Array.isArray(cards)) {
    throw new Error("public/cards.json: root must be array or { cards: array }");
  }
  return cards as RawCard[];
}

function collectRawKeys(effects: any[] | undefined): string[] {
  if (!effects || !Array.isArray(effects)) return [];
  const set = new Set<string>();
  for (const ef of effects) {
    if (!ef || typeof ef !== "object") continue;
    for (const k of Object.keys(ef)) set.add(k);
  }
  return Array.from(set.values()).sort();
}

function main() {
  const strict = process.env.STRICT === "1";

  const issues: Issue[] = [];
  const rawCards = readCardsJson();

  // A) 構造 / 一意性
  const idSet = new Set<string>();
  for (const c of rawCards) {
    const id = (c as any)?.id;
    if (!isNonEmptyString(id)) {
      issues.push({ level: "ERROR", cardId: String(id ?? "(missing)"), message: "id が空です" });
      continue;
    }
    if (idSet.has(id)) {
      issues.push({ level: "ERROR", cardId: id, message: "id が重複しています" });
    } else {
      idSet.add(id);
    }

    if (!isNonEmptyString((c as any).name)) {
      issues.push({ level: "ERROR", cardId: id, message: "name が空です" });
    }

    const era = (c as any).era;
    if (!KNOWN_ERAS.has(String(era))) {
      issues.push({ level: "ERROR", cardId: id, message: `era が不正です: ${String(era)}` });
    }

    const category = String((c as any).category ?? "");
    if (!KNOWN_CATEGORIES.has(category)) {
      issues.push({ level: "ERROR", cardId: id, message: `category が未知です: ${category}` });
    }

    if (!isNonNegativeInt((c as any).cost)) {
      issues.push({ level: "ERROR", cardId: id, message: "cost は 0以上の整数である必要があります" });
    }

    // cards.json にある場合だけ検証（将来拡張用）
    if ((c as any).knowledgeRequired != null && !isNonNegativeInt((c as any).knowledgeRequired)) {
      issues.push({ level: "ERROR", cardId: id, message: "knowledgeRequired は 0以上の整数である必要があります" });
    }
    if ((c as any).supplyCount != null && !isNonNegativeInt((c as any).supplyCount)) {
      issues.push({ level: "ERROR", cardId: id, message: "supplyCount は 0以上の整数である必要があります" });
    }

    if ((c as any).effects != null && !Array.isArray((c as any).effects)) {
      issues.push({ level: "ERROR", cardId: id, message: "effects は配列である必要があります" });
    }
  }

  // B) 参照整合（DEFAULT_DECKS が参照するID）
  const baseIds = new Set(BASE_CARDS.map((c) => c.id));
  const allKnownIds = new Set<string>([...idSet, ...baseIds]);

  for (const deck of DEFAULT_DECKS) {
    for (const id of deck.initialDeck) {
      if (!allKnownIds.has(id)) {
        issues.push({
          level: "ERROR",
          cardId: id,
          message: `スターターデッキ参照が未定義です（deck=${deck.id}）`
        });
      }
    }
  }

  // C) 効果（RAW_KEYS & normalize unknown）
  const unknownEffects: Issue[] = [];
  const unknownRawKeys: Issue[] = [];

  for (const c of rawCards) {
    const cardId = String((c as any).id ?? "(missing)");
    const rawKeys = collectRawKeys((c as any).effects);
    const unknownKeys = rawKeys.filter((k) => !KNOWN_RAW_KEYS.has(k));
    if (unknownKeys.length > 0) {
      unknownRawKeys.push({
        level: "WARN",
        cardId,
        message: `未知RAW_KEYS: ${unknownKeys.join(", ")}`
      });
    }

    // normalize の結果で unknown が出るか（カード単体の効果のみ）
    const gameCard = convertRawCardToGameCard(c as any);
    const unknown = (gameCard.effects ?? []).filter((e) => (e as any).type === "unknown");
    if (unknown.length > 0) {
      unknownEffects.push({
        level: strict ? "ERROR" : "WARN",
        cardId,
        message: `normalize後に unknown 効果が ${unknown.length} 件あります`
      });
    }
  }

  issues.push(...unknownRawKeys);
  issues.push(...unknownEffects);

  // 集計
  const errorCount = issues.filter((i) => i.level === "ERROR").length;
  const warnCount = issues.filter((i) => i.level === "WARN").length;
  const okCount = rawCards.length;

  const header = `validate:cards (${strict ? "strict" : "warn"})`;
  console.log("=".repeat(header.length));
  console.log(header);
  console.log("=".repeat(header.length));
  console.log(`OK cards: ${okCount}`);
  console.log(`WARN: ${warnCount}`);
  console.log(`ERROR: ${errorCount}`);
  console.log("");

  const byCard = new Map<string, number>();
  for (const i of issues) {
    byCard.set(i.cardId, (byCard.get(i.cardId) ?? 0) + 1);
  }

  const print = (lvl: IssueLevel) => {
    const list = issues.filter((i) => i.level === lvl);
    if (list.length === 0) return;
    console.log(`[${lvl}]`);
    for (const i of list) {
      console.log(`- ${i.cardId}: ${i.message}`);
    }
    console.log("");
  };

  print("ERROR");
  print("WARN");

  const top = Array.from(byCard.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  if (top.length > 0) {
    console.log("次に直すべきカードID上位:");
    for (const [id, n] of top) {
      console.log(`- ${id}: ${n} 件`);
    }
    console.log("");
  }

  if (errorCount > 0) {
    process.exit(1);
  }
  process.exit(0);
}

main();


