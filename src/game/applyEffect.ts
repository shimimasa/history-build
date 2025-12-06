// src/game/applyEffect.ts
// Effect DSL（history-spec v2 / tech.md v2）に基づく純関数的な効果適用ロジック

import type { ActivePlayer, Effect, GameState, PlayerState } from "./gameState";

// ------------------------------------------------------
// 公開 API
// ------------------------------------------------------

/**
 * Effect 配列を順番に適用するヘルパー。
 * - state は決して mutate せず、新しい GameState を返す。
 */
export function applyEffects(
  state: GameState,
  target: ActivePlayer,
  effects: Effect[]
): GameState {
  return effects.reduce((s, ef) => applyEffect(s, target, ef), state);
}

/**
 * 単一の Effect を適用する。
 * - Effect DSL（addRice / addKnowledge / draw / discard / gain / trashSelf / addVictory）に対応。
 * - state は決して mutate せず、新しい GameState を返す。
 */
export function applyEffect(
  state: GameState,
  target: ActivePlayer,
  effect: Effect
): GameState {
  // 元の state を絶対に変更しないため、先にディープコピー（player / cpu と各配列）を作る
  const newState: GameState = cloneGameState(state);
  const player: PlayerState = target === "player" ? newState.player : newState.cpu;

  // 1. addRice
  if (effect.addRice && effect.addRice !== 0) {
    const amount = effect.addRice;
    player.riceThisTurn += amount;
  }

  // 2. addKnowledge
  if (effect.addKnowledge && effect.addKnowledge !== 0) {
    const amount = effect.addKnowledge;
    player.knowledge += amount;
  }

  // 3. draw
  if (effect.draw && effect.draw > 0) {
    const times = effect.draw;
    for (let i = 0; i < times; i++) {
      drawOneCardForPlayer(player);
    }
  }

  // 4. discard（簡易版：手札先頭から N 枚を捨て札に送る）
  if (effect.discard && effect.discard > 0) {
    const count = effect.discard;
    for (let i = 0; i < count && player.hand.length > 0; i++) {
      const cardId = player.hand.shift();
      if (cardId !== undefined) {
        player.discard.push(cardId);
      }
    }
  }

  // 5. gain（AP.discard に指定 cardId を追加する）
  if (effect.gain) {
    const gainedId = effect.gain;
    player.discard.push(gainedId);

    // 将来的に「サプライから獲得」にしたい場合は、ここで
    // - newState.supply[gainedId].remaining-- などを行う。
    // v1.5 では最低限の実装として discard への追加のみに留める。
  }

  // 6. trashSelf（簡易版：played の末尾を「自分」とみなして取り除く）
  if (effect.trashSelf) {
    // 前提：
    // - カードをプレイする側（turnFlow.ts など）で
    //   hand → played への移動を済ませた直後に applyEffects を呼ぶ。
    // - そのため played の末尾要素が「今プレイ中のカード（self）」であるとみなし、
    //   それを取り除く簡易実装としておく。
    if (player.played.length > 0) {
      player.played.pop();
    }
  }

  // 7. addVictory
  // history-spec v2 より：
  // - 勝利点は GameState に累積しない。
  // - 勝利判定時に deck + discard + played から addVictory を集計する。
  // したがって、通常のプレイ中に applyEffect で状態を変える必要はないため、
  // ここでは no-op として扱う。
  // （将来、プレイ中に国力を変動させるカードを入れたくなった場合に拡張する）

  return newState;
}

// ------------------------------------------------------
// 内部ヘルパー
// ------------------------------------------------------

/**
 * GameState をディープコピーする。
 * - player / cpu と、それぞれの deck / hand / discard / played をコピー。
 */
function cloneGameState(state: GameState): GameState {
  return {
    ...state,
    player: clonePlayerState(state.player),
    cpu: clonePlayerState(state.cpu),
    // supply はここでは変更しない前提のため、参照のままでもよい。
    // 将来 gain で supply.remaining を減らすようにする場合は、
    // 必要に応じて supply もコピーする。
  };
}

function clonePlayerState(player: PlayerState): PlayerState {
  return {
    ...player,
    deck: [...player.deck],
    hand: [...player.hand],
    discard: [...player.discard],
    played: [...player.played],
  };
}

/**
 * プレイヤーがカードを1枚ドローする。
 * - deck が空なら discard をシャッフルして deck に戻す。
 * - それでも引くカードがなければ何もしない。
 */
function drawOneCardForPlayer(player: PlayerState): void {
  if (player.deck.length === 0) {
    if (player.discard.length === 0) {
      // 引くカードがない
      return;
    }
    reshuffleDiscardIntoDeck(player);
  }

  const cardId = player.deck.shift();
  if (cardId !== undefined) {
    player.hand.push(cardId);
  }
}

/**
 * 捨て札をシャッフルして山札に戻す。
 */
function reshuffleDiscardIntoDeck(player: PlayerState): void {
  player.deck = shuffle([...player.discard]);
  player.discard = [];
}

/**
 * Fisher–Yates シャッフル
 */
function shuffle<T>(array: T[]): T[] {
  const a = [...array];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}