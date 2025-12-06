// src/game/cardDefinitions.ts
// history-spec v2 / tech.md v2 / gameState.ts / cardEffects.ts に合わせたカード読み込み＆変換層
// - 外部データ（cards.json のレガシー DSL）を読み込み
// - ランタイムでは v2 Card（effects: Effect[]）だけを扱う

import rawCards from "./cards.json";

import type { Card, CardType, Effect } from "./gameState";

// ------------------------------------------------------
// レガシー DSL 用の読み込み専用型（cards.json に合わせる）
// ------------------------------------------------------

type LegacyCardType = "resource" | "character" | "event" | "victory";

type LegacyEffectName =
  | "addRice"
  | "addKnowledge"
  | "draw"
  | "discount"
  | "addVictory"
  | "trashFromHand";

type LegacyTrigger = "onPlay" | "onBuy" | "endGame";

type LegacyConditionOperator = ">=" | "<=" | "==" | ">" | "<";

interface LegacyEffectCondition {
  resource: "rice" | "knowledge";
  operator: LegacyConditionOperator;
  value: number;
}

interface LegacyCardEffect {
  trigger: LegacyTrigger;
  effect: LegacyEffectName;
  value?: number;
  targetType?: LegacyCardType;
  condition?: LegacyEffectCondition;
}

interface LegacyCard {
  id: string;
  era: string;
  name: string;
  type: LegacyCardType;
  cost: number;
  requiredKnowledge?: number;
  effects: LegacyCardEffect[];
  text: string;
}

// ------------------------------------------------------
// 公開 API：v2 Card[] のロード
// ------------------------------------------------------

/**
 * cards.json を読み込み、ランタイム用の v2 Card[] に変換して返す。
 * - type: "character" → "person" にマッピング
 * - requiredKnowledge → knowledgeRequired にリネーム
 * - effects: LegacyCardEffect[] → Effect[]（v2 DSL）に変換
 */
export function loadCards(): Card[] {
  const legacyCards = rawCards as LegacyCard[];

  return legacyCards.map(convertLegacyCardToV2Card);
}

// ------------------------------------------------------
// LegacyCard → v2 Card 変換
// ------------------------------------------------------

function convertLegacyCardToV2Card(legacy: LegacyCard): Card {
  const type: CardType = mapLegacyTypeToCardType(legacy.type);
  const knowledgeRequired = legacy.requiredKnowledge ?? 0;

  const effects: Effect[] = convertLegacyEffectsToV2Effects(legacy.effects);

  return {
    id: legacy.id,
    name: legacy.name,
    type,
    cost: legacy.cost,
    knowledgeRequired,
    effects,
    text: legacy.text
  };
}

function mapLegacyTypeToCardType(t: LegacyCardType): CardType {
  switch (t) {
    case "character":
      return "person";
    case "resource":
    case "event":
    case "victory":
    default:
      return t;
  }
}

// ------------------------------------------------------
// LegacyCardEffect[] → v2 Effect[] 変換
// ------------------------------------------------------

/**
 * LegacyCardEffect 配列を v2 Effect[] に変換する。
 *
 * 制約と方針：
 * - v2 Effect DSL には trigger / condition / discount / trashFromHand が存在しない。
 * - そのため、ここでは「基本的なリソース変化系」だけを素直にマッピングし、
 *   高度な挙動（割引・条件付き効果・手札トラッシュ）は一旦無視する。
 *
 * 具体的な対応：
 * - addRice       → { addRice: value }
 * - addKnowledge  → { addKnowledge: value }
 * - draw          → { draw: value }
 * - addVictory    → { addVictory: value }  // endGame / onPlay を問わず、勝利点効果として扱う
 * - discount      → 無視（TODO: 将来的に DSL 拡張 or PlayerState 拡張で対応）
 * - trashFromHand → 無視（TODO: discard / trashSelf を使った設計に再マッピング）
 *
 * また、trigger（onPlay / onBuy / endGame）や condition（EffectCondition）は
 * v2 DSL では表現できないため、現時点では無視する。
 * - 例：信長の「知識3以上ならさらに米+1」は条件が落ちるため、
 *       v2 変換後は常に米+2 相当のカードとして扱われる（TODO）。
 */
function convertLegacyEffectsToV2Effects(legacyEffects: LegacyCardEffect[]): Effect[] {
  const results: Effect[] = [];

  for (const le of legacyEffects) {
    const value = le.value ?? 0;

    switch (le.effect) {
      case "addRice": {
        results.push({ addRice: value });
        break;
      }
      case "addKnowledge": {
        results.push({ addKnowledge: value });
        break;
      }
      case "draw": {
        results.push({ draw: value });
        break;
      }
      case "addVictory": {
        results.push({ addVictory: value });
        break;
      }
      case "discount": {
        // TODO: v2 DSL / PlayerState に割引表現を追加したうえで、ここで discount 効果を反映する。
        break;
      }
      case "trashFromHand": {
        // TODO: discard / trashSelf を組み合わせた v2 DSL で再表現するか、
        //       UI 選択を伴う別レイヤのロジックとして実装する。
        break;
      }
      default:
        break;
    }
  }

  return results;
}