// src/logic/initGameState.ts
// cards.json から v2 GameState を初期化するラッパ
// - history-spec v2 / tech.md v2 / gameState.ts に完全準拠
// - 旧 ExtendedGameState / currentTurn / turnNumber / maxTurnsPerPlayer / isGameOver などは廃止

import type { Card, GameState } from "../game/gameState";
import { createInitialGameState } from "../game/gameState";
import { loadCards } from "../game/cardDefinitions";

//------------------------------------------------------
// 公開 API
//------------------------------------------------------

/**
 * アプリ起動時に呼び出す初期 GameState 生成関数。
 *
 * 仕様（history-spec v2 / tech.md 2-4-1 より）:
 * - player / cpu ともに同じスタートデッキ（こめ袋（小）×7 ＋ 村落×3）
 * - phase: "DRAW"
 * - activePlayer: "player"
 * - turnCount: 1
 * - gameEnded: false
 *
 * 実際の初期デッキ構築・サプライ構築ロジックは gameState.ts の
 * createInitialGameState(cards: Card[]) に委譲する。
 */
export function initGameState(): GameState {
  const cards: Card[] = loadCards();
  const state: GameState = createInitialGameState(cards);
  return state;
}