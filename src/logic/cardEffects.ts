// src/logic/cardEffects.ts
// history-spec v2 / tech.md v2 / gameState.ts / applyEffect.ts に合わせた薄いユーティリティ
// - 型定義は src/game/gameState.ts の公式モデルを使用
// - Effect 実行は src/game/applyEffect.ts に一本化
// - cards.json はすでに v2 Effect DSL（Effect[]）で定義されている前提

import type {
  ActivePlayer,
  Card,
  GameState,
  PlayerState
} from "../game/gameState";
import { applyEffects } from "../game/applyEffect";

// ------------------------------------------------------
// Effect 適用用の薄いラッパ
// ------------------------------------------------------

/**
 * カードプレイ時の効果適用（v2 DSL 前提）
 * - card.effects は history-spec v2 の Effect[] として解釈する。
 * - 実行は applyEffects() に委譲し、GameState を純関数的に更新する。
 */
export function applyOnPlayEffects(
  state: GameState,
  card: Card,
  owner: ActivePlayer
): GameState {
  return applyEffects(state, owner, card.effects);
}

/**
 * カード購入時の効果適用（将来拡張用のラッパ）
 *
 * v1.5 / 現行 v2 DSL では「購入時だけ発動する特殊効果」は定義していないため、
 * 現時点ではそのまま state を返すだけのダミー実装としておく。
 *
 * 将来 cards.json 側で「onBuy 専用の Effect 配列」などを導入した場合は、
 * ここでそれを取り出して applyEffects() を呼び出す形に拡張する。
 */
export function applyOnBuyEffects(
  state: GameState,
  card: Card,
  owner: ActivePlayer
): GameState {
  // 例: 購入時効果を導入する場合のイメージ
  // return applyEffects(state, owner, card.onBuyEffects ?? []);
  return state;
}

// ------------------------------------------------------
// 購入判定ユーティリティ（v2 仕様準拠）
// ------------------------------------------------------

/**
 * v2 仕様に基づく購入可能判定（サプライ残数は呼び出し元で確認する前提）。
 *
 * history-spec v2 3.4 BUY より:
 * - riceThisTurn >= card.cost
 * - knowledge   >= card.knowledgeRequired
 *
 * ※ supply[card.id].remaining > 0 のチェックは
 *    turnFlow.ts の BUY フェーズ側や UI 側で行う。
 */
export function canBuyCard(player: PlayerState, card: Card): boolean {
  return (
    player.riceThisTurn >= card.cost &&
    player.knowledge >= card.knowledgeRequired
  );
}

/**
 * 割引などを考慮した「有効コスト」を計算する拡張ポイント。
 *
 * 現時点の v2 モデルでは「一時的な割引（discount）」などの概念を
 * PlayerState に持っていないため、単純に card.cost を返す。
 *
 * 将来 discount 系の Effect を正式に導入する場合は：
 * - PlayerState に割引情報フィールドを追加
 * - applyEffect.ts 側で discount 効果を解釈して割引情報を蓄積
 * - ここでそれらを合計して effectiveCost を計算
 * という流れで拡張する。
 */
export function getEffectiveCostForPlayer(
  player: PlayerState, // 将来の拡張用に残しておく
  card: Card
): number {
  return card.cost;
}