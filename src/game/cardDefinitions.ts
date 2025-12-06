// src/game/cardDefinitions.ts
// history-spec v2 / tech.md v2 に準拠したカード定義ローダー
// - cards.json はすでに v2 Card 形式（effects: Effect[]）で記述されている前提
// - ランタイムではこの v2 Card[] をそのまま扱う

import rawCards from "./cards.json";
import type { Card } from "./gameState";

// cards.json は v2 Card の配列として扱う
const cards = rawCards as Card[];

/**
 * ゲーム内で使用する全カード一覧を返す。
 * - 呼び出し側は戻り値をそのまま createInitialGameState(cards) などに渡してよい。
 * - 変更不可の前提で使いたい場合は、必要に応じて呼び出し側で shallow copy する。
 */
export function loadCards(): Card[] {
  return cards;
}

/**
 * cardId → Card のマップを返すユーティリティ。
 * - サプライ構築や CPU ロジックなど、頻繁に Card を引きたい箇所向け。
 * - パフォーマンス最適化が必要になるまでは毎回生成でも問題ない規模。
 */
export function createCardMap(): Record<string, Card> {
  const map: Record<string, Card> = {};
  for (const card of cards) {
    map[card.id] = card;
  }
  return map;
}