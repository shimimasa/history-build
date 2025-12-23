// scripts/validateAssets.ts
// public/cards.json の card.image が public 配下の実在ファイルを指すか検証する。
//
// 実行:
// - npm run validate:assets
//
// 仕様:
// - image が空/未設定 → ERROR（cardId）
// - public 配下に実ファイルが存在しない → ERROR（cardId, image）
// - 1MB以上 → WARN（cardId, image, size）

import fs from "node:fs";
import path from "node:path";

type Level = "WARN" | "ERROR";
type Issue = { level: Level; cardId: string; message: string; sizeBytes?: number };

const HEAVY_THRESHOLD_BYTES = 1_000_000;

function readCardsJson(): any[] {
  const p = path.join(process.cwd(), "public", "cards.json");
  const raw = JSON.parse(fs.readFileSync(p, "utf8"));
  const cards = (raw.cards ?? raw) as any[];
  if (!Array.isArray(cards)) {
    throw new Error("public/cards.json: root must be array or { cards: array }");
  }
  return cards;
}

function toPublicFsPath(imagePath: string): string {
  // 例: "/assets/cards/AN_E01.webp" -> "<cwd>/public/assets/cards/AN_E01.webp"
  const rel = imagePath.startsWith("/") ? imagePath.slice(1) : imagePath;
  return path.join(process.cwd(), "public", rel);
}

function toPublicCandidatePng(cardEra: string | undefined, cardId: string): { url: string; fsPath: string } | null {
  if (!cardEra) return null;
  // public/assets/カード画像　全種類/<era>/<id>.png
  const url = `/assets/カード画像　全種類/${cardEra}/${cardId}.png`;
  const fsPath = path.join(process.cwd(), "public", "assets", "カード画像　全種類", cardEra, `${cardId}.png`);
  return { url, fsPath };
}

function fmtBytes(n: number): string {
  if (n >= 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(2)}MB`;
  if (n >= 1024) return `${(n / 1024).toFixed(1)}KB`;
  return `${n}B`;
}

function main() {
  const cards = readCardsJson();
  const issues: Issue[] = [];

  let ok = 0;

  for (const c of cards) {
    const cardId = String(c?.id ?? "(missing)");
    const img = c?.image;
    const era = typeof c?.era === "string" ? c.era : undefined;

    if (typeof img !== "string" || img.trim() === "") {
      issues.push({ level: "ERROR", cardId, message: "image が空/未設定です" });
      continue;
    }

    // URL など public に存在しない形式は対象外にしたいが、現状 cards.json は public パス前提なので ERROR にする
    if (/^https?:\/\//i.test(img)) {
      issues.push({ level: "ERROR", cardId, message: `image がURL形式です（public配下を想定）: ${img}` });
      continue;
    }

    const fsPath = toPublicFsPath(img);
    if (!fs.existsSync(fsPath)) {
      const cand = toPublicCandidatePng(era, cardId);
      const candMsg =
        cand && fs.existsSync(cand.fsPath)
          ? `（候補: ${cand.url} は存在）`
          : "";
      issues.push({ level: "ERROR", cardId, message: `image が存在しません: ${img} ${candMsg}`.trim() });
      continue;
    }

    try {
      const st = fs.statSync(fsPath);
      if (st.isFile()) {
        ok++;
        if (st.size >= HEAVY_THRESHOLD_BYTES) {
          issues.push({
            level: "WARN",
            cardId,
            message: `重い画像: ${img} (${fmtBytes(st.size)})`,
            sizeBytes: st.size
          });
        }
      } else {
        issues.push({ level: "ERROR", cardId, message: `image がファイルではありません: ${img}` });
      }
    } catch (e) {
      issues.push({ level: "ERROR", cardId, message: `image の stat に失敗: ${img} (${String(e)})` });
    }
  }

  const warn = issues.filter((i) => i.level === "WARN");
  const err = issues.filter((i) => i.level === "ERROR");

  const header = "validate:assets";
  console.log("=".repeat(header.length));
  console.log(header);
  console.log("=".repeat(header.length));
  console.log(`OK: ${ok}`);
  console.log(`WARN: ${warn.length}`);
  console.log(`ERROR: ${err.length}`);
  console.log("");

  if (err.length > 0) {
    console.log("[ERROR]");
    for (const i of err) {
      console.log(`- ${i.cardId}: ${i.message}`);
    }
    console.log("");
  }

  if (warn.length > 0) {
    console.log("[WARN] 重い画像（サイズ上位）");
    const top = [...warn]
      .sort((a, b) => (b.sizeBytes ?? 0) - (a.sizeBytes ?? 0))
      .slice(0, 10);
    for (const i of top) {
      console.log(`- ${i.cardId}: ${i.message}`);
    }
    console.log("");
  }

  if (err.length > 0) process.exit(1);
  process.exit(0);
}

main();


