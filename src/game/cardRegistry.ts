// src/game/cardRegistry.ts
// public/cards.json を読み込んで保持する CardRegistry と、
// ゲーム内で使う v1.5 Card 型への変換ヘルパーを提供する。

import type { Card, Effect, ConditionDSL } from "./gameState";

// era / deckType は将来の拡張も見越して型として定義しておく
export type EraId = "ancient" | "medieval" | "sengoku" | "edo" | "meiji";

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
      sengoku: [],
      edo: [],
      meiji: []
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
      const typed = normalizeTypedEffect(ef as any);
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
    const legacy = normalizeLegacyEffect(ef);
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

function normalizeTypedEffect(ef: any): Effect | Effect[] | null {
  const raw = ef;
  switch (ef.type) {
    case "gain": {
      const rice = ef.riceDelta ?? 0;
      const knowledge = ef.knowledgeDelta ?? 0;
      const draw = ef.draw ?? 0;
      const victory = ef.victoryDelta ?? 0;
      const actions = ef.actionsDelta ?? 0;
      const buys = ef.buysDelta ?? 0;
      if (
        !rice &&
        !knowledge &&
        !draw &&
        !victory &&
        !actions &&
        !buys
      ) {
        return { type: "gain", raw };
      }
      return {
        type: "gain",
        riceDelta: rice || undefined,
        knowledgeDelta: knowledge || undefined,
        draw: draw || undefined,
        victoryDelta: victory || undefined,
        actionsDelta: actions || undefined,
        buysDelta: buys || undefined,
        raw
      };
    }
    case "trash": {
      const count = typeof ef.count === "number" ? ef.count : 1;
      const from = ef.from ?? "hand";
      return { type: "trash", from, count, raw };
    }
    case "discount": {
      const amount = typeof ef.amount === "number" ? ef.amount : 0;
      if (!amount) return null;
      const scope = ef.scope ?? "nextBuyThisTurn";
      return { type: "discount", amount, scope, raw };
    }
    case "attackDiscard": {
      const count = typeof ef.count === "number" ? ef.count : 1;
      if (count <= 0) return null;
      return { type: "attackDiscard", count, raw };
    }
    case "conditional": {
      const condition: ConditionDSL =
        normalizeConditionObject(ef.condition) ?? {
          kind: "custom",
          expr: JSON.stringify(ef.condition)
        };
      const thenEffects = normalizeEffectsFromArray(ef.then);
      const elseEffects =
        ef.else && Array.isArray(ef.else)
          ? normalizeEffectsFromArray(ef.else)
          : undefined;
      return {
        type: "conditional",
        condition,
        then: thenEffects,
        else: elseEffects,
        raw
      };
    }
    default:
      return null;
  }
}

function normalizeLegacyEffect(ef: any): Effect | Effect[] | null {
  const raw = ef;
  const result: Effect[] = [];

  // gain 系（v1.5 / v2 DSL 混在）
  const rice = ef.addRice ?? ef.gainRice ?? 0;
  const knowledge = ef.addKnowledge ?? ef.gainKnowledge ?? 0;
  const draw = ef.draw ?? 0;
  const victory =
    ef.addVictory ?? ef.gainVP ?? ef.gainVictory ?? 0;
  const actions = ef.addActions ?? 0;
  const buys = ef.addBuys ?? 0;

  if (rice || knowledge || draw || victory || actions || buys) {
    result.push({
      type: "gain",
      riceDelta: rice || undefined,
      knowledgeDelta: knowledge || undefined,
      draw: draw || undefined,
      victoryDelta: victory || undefined,
      actionsDelta: actions || undefined,
      buysDelta: buys || undefined,
      raw
    });
  }

  // trash 系
  if (typeof ef.trashFromHand === "number" || typeof ef.trash === "number") {
    const count = ef.trashFromHand ?? ef.trash;
    if (typeof count === "number" && count > 0) {
      result.push({
        type: "trash",
        from: "hand",
        count,
        raw
      });
    }
  }

  if (ef.trashSelf === true) {
    result.push({
      type: "trash",
      from: "played",
      count: 1,
      raw
    });
  }

  // discount 系（discount / reduceCostThisTurn）
  let discountAmount: number | undefined;
  if (typeof ef.discount === "number") {
    discountAmount = ef.discount;
  } else if (ef.discount && typeof ef.discount.amount === "number") {
    discountAmount = ef.discount.amount;
  } else if (typeof ef.reduceCostThisTurn === "number") {
    discountAmount = ef.reduceCostThisTurn;
  }

  if (typeof discountAmount === "number" && discountAmount !== 0) {
    result.push({
      type: "discount",
      amount: discountAmount,
      scope: "nextBuyThisTurn",
      raw
    });
  }

  // 攻撃（手札破棄）
  if (typeof ef.attackDiscard === "number" && ef.attackDiscard > 0) {
    result.push({
      type: "attackDiscard",
      count: ef.attackDiscard,
      raw
    });
  }

  // 条件付き効果（文字列表現 if: "..." ）
  const condSrc = ef.conditional ?? ef.condition;
  if (condSrc && typeof condSrc === "object") {
    const cond = normalizeConditionFromString(condSrc.if);
    const thenEffects = normalizeEffectsFromArray(condSrc.then);
    const elseEffects =
      condSrc.else && Array.isArray(condSrc.else)
        ? normalizeEffectsFromArray(condSrc.else)
        : undefined;

    result.push({
      type: "conditional",
      condition: cond,
      then: thenEffects,
      else: elseEffects,
      raw: condSrc
    });
  }

  if (result.length === 0) {
    // 何も解釈できない場合は no-op gain として raw だけ保持
    return { type: "gain", raw };
  }

  return result;
}

function normalizeEffectsFromArray(effects: any[] | undefined): Effect[] {
  if (!effects || !Array.isArray(effects)) return [];
  const out: Effect[] = [];
  for (const ef of effects) {
    if (!ef || typeof ef !== "object") continue;
    if (typeof (ef as any).type === "string") {
      const n = normalizeTypedEffect(ef as any);
      if (n) {
        if (Array.isArray(n)) out.push(...n);
        else out.push(n);
      }
    } else {
      const n = normalizeLegacyEffect(ef);
      if (n) {
        if (Array.isArray(n)) out.push(...n);
        else out.push(n);
      }
    }
  }
  return out;
}

function normalizeConditionObject(obj: any | undefined): ConditionDSL | null {
  if (!obj || typeof obj !== "object") return null;
  if (typeof obj.kind === "string") {
    return obj as ConditionDSL;
  }
  return null;
}

function normalizeConditionFromString(expr: any): ConditionDSL {
  if (typeof expr !== "string") {
    return { kind: "custom", expr: JSON.stringify(expr) };
  }

  // totalKnowledge>=N
  let m = expr.match(/^totalKnowledge>=(\d+)$/);
  if (m) {
    return {
      kind: "knowledgeAtLeast",
      value: parseInt(m[1], 10)
    };
  }

  // buysMadeThisTurn>=N
  m = expr.match(/^buysMadeThisTurn>=(\d+)$/);
  if (m) {
    return {
      kind: "buysMadeAtLeast",
      value: parseInt(m[1], 10)
    };
  }

  // boughtVictoryThisTurn / boughtVictoryThisTurn>=N
  m = expr.match(/^boughtVictoryThisTurn(?:>=(\d+))?$/);
  if (m) {
    return {
      kind: "victoryBuysAtLeast",
      value: m[1] ? parseInt(m[1], 10) : 1
    };
  }

  return { kind: "custom", expr };
}

/**
 * RawCard -> v1.5 Card への変換。
 * - knowledgeRequired は public/cards.json には存在しないため、現時点では 0 固定とする。
 * - text には notes をそのまま入れる（説明文がない場合は空文字）。
 */
export function convertRawCardToGameCard(raw: RawCard): Card {
  return {
    id: raw.id,
    name: raw.name,
    type: mapCategoryToType(raw.category),
    cost: typeof raw.cost === "number" ? raw.cost : 0,
    knowledgeRequired: 0,
    effects: normalizeEffects(raw),
    text: raw.notes ?? "",
    image: raw.image
  };
}


