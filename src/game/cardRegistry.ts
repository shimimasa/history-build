// src/game/cardRegistry.ts
// public/cards.json を読み込んで保持する CardRegistry と、
// ゲーム内で使う v1.5 Card 型への変換ヘルパーを提供する。

import type { Card, Effect } from "./gameState";

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

function convertEffects(rawEffects: any[] | undefined): Effect[] {
  if (!rawEffects || rawEffects.length === 0) return [];

  const result: Effect[] = [];

  for (const ef of rawEffects) {
    if (!ef || typeof ef !== "object") continue;

    // UI から元の DSL を参照できるよう、常に raw を保持しておく
    const base: any = { raw: ef };

    if (typeof ef.gainRice === "number" && ef.gainRice !== 0) {
      base.addRice = ef.gainRice;
      result.push(base);
      continue;
    }

    if (typeof ef.gainKnowledge === "number" && ef.gainKnowledge !== 0) {
      base.addKnowledge = ef.gainKnowledge;
      result.push(base);
      continue;
    }

    if (typeof ef.draw === "number" && ef.draw > 0) {
      base.draw = ef.draw;
      result.push(base);
      continue;
    }

    if (typeof ef.gainVP === "number" && ef.gainVP !== 0) {
      base.addVictory = ef.gainVP;
      result.push(base);
      continue;
    }

    if (ef.trashSelf === true) {
      base.trashSelf = true;
      result.push(base);
      continue;
    }

    // v1.5 Effect では表現できない DSL についても、
    // raw としては保持しておき、UI 側で「特殊効果」として表示できるようにする。
    result.push(base as Effect);
  }

  return result;
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
    effects: convertEffects(raw.effects),
    text: raw.notes ?? "",
    image: raw.image
  };
}


