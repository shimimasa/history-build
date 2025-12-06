// src/logic/initGameState.ts
// cards.json から v2 GameState を初期化するラッパ
// - history-spec v2 / tech.md v2 / gameState.ts に準拠
// - 旧 ExtendedGameState / currentTurn / turnNumber / maxTurnsPerPlayer / isGameOver などは廃止
// - DeckConfig から初期デッキを差し替えるヘルパーも提供する

import type { Card, GameState } from "../game/gameState";
import {
  createInitialGameState,
  createInitialPlayerState
} from "../game/gameState";
import { loadCards } from "../game/cardDefinitions";
import type { DeckConfig } from "../ui/uiTypes";

//------------------------------------------------------
// 基本ヘルパー
//------------------------------------------------------

function loadAllCards(): Card[] {
  return loadCards();
}

//------------------------------------------------------
// 公開 API
//------------------------------------------------------

/**
 * 従来どおりのデフォルト初期 GameState を生成する。
 * - 戦国基本デッキ（RICE_SMALL×7 + VP_VILLAGE×3）が gameState.ts 側で使われる。
 */
export function createDefaultGameState(): GameState {
  const cards = loadAllCards();
  return createInitialGameState(cards);
}

/**
 * DeckConfig をもとに初期 GameState を生成する。
 *
 * - deckConfig が渡されない場合は createDefaultGameState() を利用。
 * - 渡された場合は：
 *   - supply / phase / activePlayer / turnCount などは createInitialGameState(cards) の結果を流用
 *   - player / cpu だけを deckConfig.initialDeck から作り直して差し替える。
 *
 * TODO: 将来的に「デッキごとにサプライ構成も変えたい」場合は、
 *       ここで deckConfig.id ごとに supply 初期化ロジックを分岐させる。
 */
export function createGameStateFromDeck(deckConfig?: DeckConfig): GameState {
  const cards = loadAllCards();
  const base = createInitialGameState(cards);

  if (!deckConfig) {
    return base;
  }

  const player = createInitialPlayerState(deckConfig.initialDeck);
  const cpu = createInitialPlayerState(deckConfig.initialDeck);

  return {
    ...base,
    player,
    cpu
  };
}

/**
 * アプリ起動時に呼び出す従来の初期 GameState 生成関数。
 * - 互換性維持のため残しておき、内部的には createDefaultGameState() を呼ぶ。
 */
export function initGameState(): GameState {
  return createDefaultGameState();
}