// src/game/cardRegistry.ts
// public/cards.json を読み込んで保持する CardRegistry と、
// ゲーム内で使う v1.5 Card 型への変換ヘルパーを提供する。

import type { Card, Effect, EffectsMeta } from "./gameState";
import type { EraId } from "./era";

/**
 * public/cards.json の 1 エントリに対応する生データ型
 * （完全な DSL はここでは保持のみ。ゲームロジック側では必要な部分だけを v1.5 Effect にマッピングする）
 */
export interface RawCard {
  id: string;
  name: string;
  era: EraId;
  category: string; // "resource" | "victory" | "person" | "event" など
  cost: number;
  effects?: any[];
  image?: string;
  notes?: string;
  // 将来用: 個別に供給枚数を指定したい場合
  supplyCount?: number;
}

export interface CardRegistry {
  all: RawCard[];
  byId: Record<string, RawCard>;
  byEra: Record<EraId, RawCard[]>;
}

let registryPromise: Promise<CardRegistry> | null = null;

/**
 * public/cards.json をフェッチして CardRegistry を生成する。
 * - 1度ロードしたらモジュール内で Promise を共有し、以降は同じインスタンスを返す。
 */
export async function loadCardRegistry(): Promise<CardRegistry> {
  if (registryPromise) {
    return registryPromise;
  }

  registryPromise = (async () => {
    const res = await fetch("/cards.json");
    if (!res.ok) {
      throw new Error(`Failed to load cards.json: ${res.status} ${res.statusText}`);
    }
    const json = await res.json();
    const rawCards: RawCard[] = (json.cards ?? json) as RawCard[];

    const byId: Record<string, RawCard> = {};
    const byEra: Record<EraId, RawCard[]> = {
      ancient: [],
      medieval: [],
      medieval_europe: [],
      sengoku: [],
      edo: [],
      meiji: [],
      ancient_mediterranean: [],
      islamic_world: [],
      east_asia: [],
      south_asia: [],
      southeast_asia: [],
      central_asia: [],
      sub_saharan_africa: [],
      north_america: [],
      latin_america: [],
      oceania: []
    };

    for (const c of rawCards) {
      byId[c.id] = c;
      if (c.era && (byEra as any)[c.era]) {
        (byEra as any)[c.era].push(c);
      }
    }

    return {
      all: rawCards,
      byId,
      byEra
    };
  })();

  return registryPromise;
}

// ------------------------------------------------------
// v1.5 Card への変換
// ------------------------------------------------------

/**
 * RawCard.category を v1.5 Card.type にマッピングする。
 * - 既知のカテゴリー以外は一旦 "event" として扱う（将来拡張用）。
 */
function mapCategoryToType(category: string): Card["type"] {
  switch (category) {
    case "resource":
      return "resource";
    case "victory":
      return "victory";
    case "person":
      return "person";
    case "event":
      return "event";
    default:
      return "event";
  }
}

/**
 * cards.json の effects 配列を「正規DSL（Effect 型）」の配列に正規化する。
 * - v1.5 互換表現（addRice など）と DSL 表現（gainRice / discount / conditional 型など）を吸収する。
 * - 今後 cards.json が正規DSL（type: "gain" など）で書かれても同じ Effect 配列が得られる。
 */
export function normalizeEffects(rawCard: RawCard): Effect[] {
  const rawEffects = rawCard.effects;
  if (!rawEffects || rawEffects.length === 0) return [];

  const result: Effect[] = [];

  for (const ef of rawEffects) {
    if (!ef || typeof ef !== "object") continue;

    // すでに正規DSL（type フィールドあり）の場合
    if (typeof (ef as any).type === "string") {
      const typed = normalizeTypedEffect(rawCard.id, ef as any);
      if (typed) {
        if (Array.isArray(typed)) {
          result.push(...typed);
        } else {
          result.push(typed);
        }
      }
      continue;
    }

    // 旧 DSL / v1.5 互換表現の場合
    const legacy = normalizeLegacyEffect(rawCard.id, ef);
    if (legacy) {
      if (Array.isArray(legacy)) {
        result.push(...legacy);
      } else {
        result.push(legacy);
      }
    }
  }

  return result;
}

function normalizeTypedEffect(cardId: string, ef: any): Effect | Effect[] | null {
  const raw = ef;
  switch (ef.type) {
    case "gain": {
      // canonical: {type:"gain", gain:{...}}
      // 互換吸収: 旧キー（gainRice / gainKnowledge / gainVP / draw / addActions / addBuys 等）も受ける
      const rice = ef.gain?.rice ?? ef.rice ?? ef.gainRice ?? ef.addRice ?? 0;
      const knowledge =
        ef.gain?.knowledge ?? ef.knowledge ?? ef.gainKnowledge ?? ef.addKnowledge ?? 0;
      const draw = ef.gain?.draw ?? ef.draw ?? 0;
      const actions = ef.gain?.actions ?? ef.actions ?? ef.addActions ?? 0;
      const buys = ef.gain?.buys ?? ef.buys ?? ef.addBuys ?? 0;
      const vp = ef.gain?.vp ?? ef.vp ?? ef.gainVP ?? ef.addVictory ?? 0;

      const gain = {
        rice: rice || undefined,
        knowledge: knowledge || undefined,
        draw: draw || undefined,
        actions: actions || undefined,
        buys: buys || undefined,
        vp: vp || undefined
      };

      if (!gain.rice && !gain.knowledge && !gain.draw && !gain.actions && !gain.buys && !gain.vp) {
        warnUnknown(cardId, raw);
        return { type: "unknown", raw, __cardId: cardId };
      }

      return { type: "gain", gain, __cardId: cardId, raw };
    }
    case "discount": {
      const n =
        typeof ef.discountThisTurn === "number"
          ? ef.discountThisTurn
          : 0;
      if (!n) return null;
      return { type: "discount", discountThisTurn: n, __cardId: cardId, raw };
    }
    case "trashFromHand": {
      const count = typeof ef.count === "number" ? ef.count : 1;
      if (count <= 0) return null;
      return { type: "trashFromHand", count, __cardId: cardId, raw };
    }
    case "attackDiscard": {
      const count = typeof ef.count === "number" ? ef.count : 1;
      if (count <= 0) return null;
      return { type: "attackDiscard", count, __cardId: cardId, raw };
    }
    case "selfDiscard": {
      const count = typeof ef.count === "number" ? ef.count : 1;
      if (count <= 0) return null;
      return { type: "selfDiscard", count, __cardId: cardId, raw };
    }
    case "conditional": {
      const ifStr =
        typeof ef.if === "string"
          ? ef.if
          : typeof ef.condition === "string"
            ? ef.condition
            : "";
      const thenEffects = normalizeEffectsFromArray(cardId, ef.then);
      const elseEffects =
        ef.else && Array.isArray(ef.else)
          ? normalizeEffectsFromArray(cardId, ef.else)
          : undefined;
      return {
        type: "conditional",
        if: ifStr,
        then: thenEffects,
        else: elseEffects,
        __cardId: cardId,
        raw
      };
    }
    default:
      warnUnknown(cardId, raw);
      return { type: "unknown", raw, __cardId: cardId };
  }
}

function normalizeLegacyEffect(cardId: string, ef: any): Effect | Effect[] | null {
  const raw = ef;
  const result: Effect[] = [];

  // gain 系（public/cards.json の RAW_KEYS を完全吸収）
  const rice = ef.gainRice ?? ef.addRice ?? 0;
  const knowledge = ef.gainKnowledge ?? ef.addKnowledge ?? 0;
  const draw = ef.draw ?? 0;
  const vp = ef.gainVP ?? ef.gainVictory ?? ef.addVictory ?? 0;
  const actions = ef.addActions ?? ef.actions ?? 0;
  const buys = ef.addBuys ?? ef.buys ?? 0;

  if (rice || knowledge || draw || vp || actions || buys) {
    result.push({
      type: "gain",
      gain: {
        rice: rice || undefined,
        knowledge: knowledge || undefined,
        draw: draw || undefined,
        actions: actions || undefined,
        buys: buys || undefined,
        vp: vp || undefined
      },
      __cardId: cardId,
      raw
    });
  }

  // trashFromHand
  if (typeof ef.trashFromHand === "number" && ef.trashFromHand > 0) {
    result.push({
      type: "trashFromHand",
      count: ef.trashFromHand,
      __cardId: cardId,
      raw
    });
  }

  // discount（reduceCostThisTurn）
  if (typeof ef.reduceCostThisTurn === "number" && ef.reduceCostThisTurn !== 0) {
    result.push({
      type: "discount",
      discountThisTurn: ef.reduceCostThisTurn,
      __cardId: cardId,
      raw
    });
  }

  // 攻撃（手札破棄）
  if (typeof ef.attackDiscard === "number" && ef.attackDiscard > 0) {
    result.push({
      type: "attackDiscard",
      count: ef.attackDiscard,
      __cardId: cardId,
      raw
    });
  }

  // selfDiscard
  if (typeof ef.selfDiscard === "number" && ef.selfDiscard > 0) {
    result.push({
      type: "selfDiscard",
      count: ef.selfDiscard,
      __cardId: cardId,
      raw
    });
  }

  // 条件付き効果（文字列表現 if: "..." ）
  const condSrc = ef.conditional ?? ef.condition;
  if (condSrc && typeof condSrc === "object") {
    const ifStr = typeof condSrc.if === "string" ? condSrc.if : "";
    const thenEffects = normalizeEffectsFromArray(cardId, condSrc.then);
    const elseEffects =
      condSrc.else && Array.isArray(condSrc.else)
        ? normalizeEffectsFromArray(cardId, condSrc.else)
        : undefined;

    result.push({
      type: "conditional",
      if: ifStr,
      then: thenEffects,
      else: elseEffects,
      __cardId: cardId,
      raw: condSrc
    });
  }

  if (result.length === 0) {
    // 何も解釈できない場合は unknown として保持（クラッシュ禁止＋可視化）
    warnUnknown(cardId, raw);
    return { type: "unknown", raw, __cardId: cardId };
  }

  return result;
}

function normalizeEffectsFromArray(cardId: string, effects: any[] | undefined): Effect[] {
  if (!effects || !Array.isArray(effects)) return [];
  const out: Effect[] = [];
  for (const ef of effects) {
    if (!ef || typeof ef !== "object") continue;
    if (typeof (ef as any).type === "string") {
      const n = normalizeTypedEffect(cardId, ef as any);
      if (n) {
        if (Array.isArray(n)) out.push(...n);
        else out.push(n);
      }
    } else {
      const n = normalizeLegacyEffect(cardId, ef);
      if (n) {
        if (Array.isArray(n)) out.push(...n);
        else out.push(n);
      }
    }
  }
  return out;
}

function warnUnknown(cardId: string, raw: any): void {
  const keys = raw && typeof raw === "object" ? Object.keys(raw) : [];
  // normalize は GameState を持たないので、ここは console.warn（[WARN]）で出す
  try {
    console.warn(
      `[WARN] normalizeEffects unknown: cardId=${cardId} keys=${keys.join(",")} raw=${JSON.stringify(raw)}`
    );
  } catch {
    console.warn(
      `[WARN] normalizeEffects unknown: cardId=${cardId} keys=${keys.join(",")} raw=${String(raw)}`
    );
  }
}

/**
 * RawCard -> v1.5 Card への変換。
 * - knowledgeRequired は public/cards.json には存在しないため、現時点では 0 固定とする。
 * - text には notes をそのまま入れる（説明文がない場合は空文字）。
 */
export function convertRawCardToGameCard(raw: RawCard): Card {
  const effects = normalizeEffects(raw);
  const rawKeys = collectRawEffectKeys(raw.effects);
  const effectsMeta: EffectsMeta = {
    rawCount: raw.effects?.length ?? 0,
    normCount: effects.length,
    types: effects.map((e) => e.type),
    rawKeys
  };

  return {
    id: raw.id,
    name: raw.name,
    type: mapCategoryToType(raw.category),
    category: raw.category,
    cost: typeof raw.cost === "number" ? raw.cost : 0,
    knowledgeRequired: 0,
    effects,
    effectsMeta,
    text: raw.notes ?? "",
    image: raw.image
  };
}

function collectRawEffectKeys(rawEffects: any[] | undefined): string[] {
  if (!rawEffects || !Array.isArray(rawEffects)) return [];
  const set = new Set<string>();
  for (const ef of rawEffects) {
    if (!ef || typeof ef !== "object") continue;
    for (const k of Object.keys(ef)) {
      set.add(k);
    }
  }
  return Array.from(set.values()).sort();
}

