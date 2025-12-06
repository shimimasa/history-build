// src/logic/cardEffects.ts
// history-spec v2 / tech.md v2 / gameState.ts / applyEffect.ts に合わせた補助ロジック
// - 型定義は src/game/gameState.ts の公式モデルに統一
// - Effect の実行は src/game/applyEffect.ts に委譲
// - このファイルは「トリガー付き DSL（レガシー）」と v2 DSL の橋渡し・購入まわりのユーティリティを担う

import type {
  ActivePlayer,
  Card,
  CardType,
  Effect,
  GameState,
  PlayerState
} from "../game/gameState";
import { applyEffects } from "../game/applyEffect";

// ------------------------------------------------------
// レガシー：トリガー付き DSL 定義（cards.json などの既存データ用）
// ------------------------------------------------------

export type EffectName =
  | "addRice"
  | "addKnowledge"
  | "draw"
  | "discount"
  | "addVictory"
  | "trashFromHand"; // v1 系の拡張用（v2 DSL では未対応）

export type Trigger = "onPlay" | "onBuy" | "endGame";

export type ConditionOperator = ">=" | "<=" | "==" | ">" | "<";

export interface EffectCondition {
  resource: "rice" | "knowledge";
  operator: ConditionOperator;
  value: number;
}

/**
 * レガシーなカード効果定義
 * - trigger: "onPlay" | "onBuy" | "endGame"
 * - effect: EffectName
 * - value / targetType / condition などを持つ
 *
 * v2 DSL（Effect）は「1フィールドだけを持つオブジェクト」なので、
 * 実行時には CardEffect → Effect[] へ変換して applyEffects() に渡す。
 */
export interface CardEffect {
  trigger: Trigger;
  effect: EffectName;
  value?: number;
  targetType?: CardType;       // discount 対象など
  condition?: EffectCondition; // 任意
}

// ------------------------------------------------------
// 条件評価（レガシー DSL 用）
// ------------------------------------------------------

function evaluateCondition(player: PlayerState, condition?: EffectCondition): boolean {
  if (!condition) return true; // 条件がなければ常に発動

  const current =
    condition.resource === "rice"
      ? player.riceThisTurn
      : player.knowledge;

  switch (condition.operator) {
    case ">=":
      return current >= condition.value;
    case "<=":
      return current <= condition.value;
    case "==":
      return current === condition.value;
    case ">":
      return current > condition.value;
    case "<":
      return current < condition.value;
    default:
      return false;
  }
}

// ------------------------------------------------------
// レガシー DSL → v2 DSL への橋渡しヘルパ
// ------------------------------------------------------

/**
 * 単一の CardEffect を v2 Effect に変換する。
 * - addRice / addKnowledge / draw / addVictory のみサポート
 * - discount / trashFromHand は v2 DSL では表現できないため、現時点では無視（TODO）
 */
function legacyCardEffectToEffect(ef: CardEffect): Effect | null {
  const value = ef.value ?? 0;

  switch (ef.effect) {
    case "addRice":
      return { addRice: value };
    case "addKnowledge":
      return { addKnowledge: value };
    case "draw":
      return { draw: value };
    case "addVictory":
      // history-spec v2 では「勝利点は GameState に累積せず、最終スコア計算時に使用」する。
      // ここでは単純に addVictory として返し、score.ts 側で集計する前提とする。
      return { addVictory: value };
    case "discount":
    case "trashFromHand":
    default:
      // v2 DSL では直接表現できない／未対応のため、現時点では無視。
      // TODO: 将来的に「一時割引」や「手札選択トラッシュ」を実装する際に拡張する。
      return null;
  }
}

/**
 * レガシー DSL の配列から、指定 trigger 用の v2 Effect[] を構築する。
 * - 条件（EffectCondition）はここで評価し、満たしたものだけを v2 Effect に変換する。
 */
export function collectEffectsForTrigger(
  player: PlayerState,
  legacyEffects: CardEffect[],
  trigger: Trigger
): Effect[] {
  const results: Effect[] = [];

  for (const ef of legacyEffects) {
    if (ef.trigger !== trigger) continue;
    if (!evaluateCondition(player, ef.condition)) continue;

    const mapped = legacyCardEffectToEffect(ef);
    if (mapped) {
      results.push(mapped);
    }
  }

  return results;
}

// ------------------------------------------------------
// v2 Card ＋ applyEffect.ts を使った標準 onPlay / onBuy ラッパ
// ------------------------------------------------------

/**
 * カードプレイ時の効果適用（v2 DSL 前提）
 * - card.effects は history-spec v2 の Effect[] として解釈する。
 * - 実行は applyEffects() に委譲し、GameState を純関数的に更新する。
 *
 * 既存の cards.json が CardEffect ベースの場合は、
 * cardDefinitions.ts 側で CardEffect[] → Effect[] へ変換した Card を組み立て、
 * その Card をここに渡す想定。
 */
export function applyOnPlayEffects(
  state: GameState,
  card: Card,
  owner: ActivePlayer
): GameState {
  return applyEffects(state, owner, card.effects);
}

/**
 * カード購入時の効果適用（拡張用ラッパ）
 * - v1.5 では onBuy 専用の効果はほぼ使わない前提。
 * - 将来「購入時だけ発動する Effect」を Card 側に持たせる場合は、
 *   ここで必要な Effect[] を取り出し applyEffects() を呼ぶ形に拡張する。
 */
export function applyOnBuyEffects(
  state: GameState,
  card: Card,
  owner: ActivePlayer
): GameState {
  // 現状の v2 DSL では onBuy 専用の区別はないため、そのまま state を返すだけ。
  // TODO: onBuy 専用 Effect を導入する場合はここで applyEffects() を呼ぶ。
  return state;
}

/**
 * endGame 用の効果適用ヘルパ
 * - history-spec v2 では「勝利点計算専用の score.ts」を用意する方針なので、
 *   本関数は最終スコア集計ロジックへ引き渡すための薄いラッパとして残す。
 *
 * 典型的な使い方イメージ：
 * - player の deck / discard / played に含まれる Card を列挙
 * - それぞれの card.effects から addVictory を抜き出して合計
 * - score.ts に本ロジックを移すのが最終形
 */
export function collectEndGameVictoryEffects(
  cards: Card[]
): Effect[] {
  const results: Effect[] = [];

  for (const card of cards) {
    for (const ef of card.effects) {
      if (ef.addVictory && ef.addVictory !== 0) {
        results.push({ addVictory: ef.addVictory });
      }
    }
  }

  return results;
}

// ------------------------------------------------------
// 購入判定・割引まわりのユーティリティ
// ------------------------------------------------------

/**
 * v2 仕様に基づく購入可能判定（サプライ残数は呼び出し元で確認する前提）。
 *
 * 仕様（history-spec v2 3.4 BUY より）:
 * - riceThisTurn >= card.cost
 * - knowledge >= card.knowledgeRequired
 *
 * ※ supply[card.id].remaining > 0 のチェックは turnFlow.ts の BUY フェーズ側で行う。
 */
export function canBuyCard(player: PlayerState, card: Card): boolean {
  return (
    player.riceThisTurn >= card.cost &&
    player.knowledge >= card.knowledgeRequired
  );
}

/**
 * 現時点の v2 モデルでは「一時的な割引（discount）」や
 * PlayerState.temporaryDiscounts といった拡張フィールドは持っていない。
 *
 * そのため getEffectiveCostForPlayer は、現状は単純に card.cost を返すだけにしておく。
 * 将来 discount 系の効果を正式に導入する場合は：
 * - PlayerState に割引情報を拡張する
 * - discount 系 CardEffect / Effect をここで解釈して有効な割引合計を計算する
 * という形でリファクタする前提。
 */
export function getEffectiveCostForPlayer(
  player: PlayerState,
  card: Card
): number {
  // 割引未対応のため、現時点では単に cost を返す。
  // TODO: discount 効果を導入する際に、PlayerState に拡張フィールドを追加して実装する。
  return card.cost;
}