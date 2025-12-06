// src/game/turnFlow.ts
// history-spec v2 / tech.md v2 準拠の 5 フェーズ純関数フェーズマシン

import type {
  ActivePlayer,
  Card,
  GameState,
  PlayerState
} from "./gameState";
import { applyEffects } from "./applyEffect";

// ------------------------------------------------------
// 公開 API：フェーズごとの純関数
// ------------------------------------------------------

/**
 * DRAW フェーズ
 * - activePlayer の手札が 5 枚になるまでドロー
 * - 山札が尽きたら、捨て札をシャッフルして山札に戻す
 * - 終了後：phase = "RESOURCE"
 */
export function drawPhase(state: GameState): GameState {
  const current: ActivePlayer = state.activePlayer;
  const activePlayer = current === "player" ? state.player : state.cpu;

  const { deck: newDeck, discard: newDiscard, hand: newHand } =
    drawUntilHandSizeFive(activePlayer.deck, activePlayer.discard, activePlayer.hand);

  const updatedActive: PlayerState = {
    ...activePlayer,
    deck: newDeck,
    discard: newDiscard,
    hand: newHand
  };

  const newState: GameState = {
    ...state,
    player: current === "player" ? updatedActive : state.player,
    cpu: current === "cpu" ? updatedActive : state.cpu,
    phase: "RESOURCE"
  };

  return newState;
}

/**
 * RESOURCE フェーズ
 * - 手札から type = "resource" のカードをすべて取り出し、played に移動
 * - それらのカードの effects を applyEffects で適用
 * - 終了後：phase = "ACTION"
 */
export function resourcePhase(state: GameState): GameState {
  const current: ActivePlayer = state.activePlayer;
  const activePlayer = current === "player" ? state.player : state.cpu;

  const resourceIds: string[] = [];
  const remainingHand: string[] = [];

  for (const cardId of activePlayer.hand) {
    const card = getCardFromSupply(state, cardId);
    if (card && card.type === "resource") {
      resourceIds.push(cardId);
    } else {
      remainingHand.push(cardId);
    }
  }

  const updatedActive: PlayerState = {
    ...activePlayer,
    hand: remainingHand,
    played: [...activePlayer.played, ...resourceIds]
  };

  let newState: GameState = {
    ...state,
    player: current === "player" ? updatedActive : state.player,
    cpu: current === "cpu" ? updatedActive : state.cpu
  };

  // 資源カードの effects を順番に適用
  for (const cardId of resourceIds) {
    const card = getCardFromSupply(newState, cardId);
    if (!card) continue;
    newState = applyEffects(newState, current, card.effects);
  }

  return {
    ...newState,
    phase: "ACTION"
  };
}

/**
 * ACTION フェーズ
 * - chosenCardId が渡されている場合のみ、そのカードを hand から played に移動し、effects を適用
 * - chosenCardId が null/未指定の場合は何もせず BUY に進む
 * - 終了後：phase = "BUY"
 */
export function actionPhase(
  state: GameState,
  chosenCardId?: string | null
): GameState {
  const current: ActivePlayer = state.activePlayer;

  // 行動しない場合：フェーズだけ進める
  if (!chosenCardId) {
    return {
      ...state,
      phase: "BUY"
    };
  }

  const activePlayer = current === "player" ? state.player : state.cpu;
  if (!activePlayer.hand.includes(chosenCardId)) {
    // 手札にない場合は何もせず BUY へ
    return {
      ...state,
      phase: "BUY"
    };
  }

  const card = getCardFromSupply(state, chosenCardId);
  if (!card || (card.type !== "person" && card.type !== "event")) {
    // 人物 / 出来事カードでなければ何もしないで BUY へ
    return {
      ...state,
      phase: "BUY"
    };
  }

  const newHand = activePlayer.hand.filter((id) => id !== chosenCardId);
  const newPlayed = [...activePlayer.played, chosenCardId];

  const updatedActive: PlayerState = {
    ...activePlayer,
    hand: newHand,
    played: newPlayed
  };

  let newState: GameState = {
    ...state,
    player: current === "player" ? updatedActive : state.player,
    cpu: current === "cpu" ? updatedActive : state.cpu
  };

  // 行動カードの effects を適用
  newState = applyEffects(newState, current, card.effects);

  return {
    ...newState,
    phase: "BUY"
  };
}

/**
 * BUY フェーズ
 * - chosenCardId が渡されている場合のみ購入処理を行う
 *   - 条件:
 *     - riceThisTurn >= card.cost
 *     - knowledge >= card.knowledgeRequired
 *     - supply[card.id].remaining > 0
 *   - 処理:
 *     - riceThisTurn -= card.cost
 *     - discard に card.id を追加
 *     - supply[card.id].remaining--
 * - chosenCardId が null/未指定の場合は何も買わずに CLEANUP に進む
 * - 終了後：phase = "CLEANUP"
 */
export function buyPhase(
  state: GameState,
  chosenCardId?: string | null
): GameState {
  const current: ActivePlayer = state.activePlayer;

  // 何も買わない場合：フェーズだけ進める
  if (!chosenCardId) {
    return {
      ...state,
      phase: "CLEANUP"
    };
  }

  const pile = state.supply[chosenCardId];
  if (!pile || pile.remaining <= 0) {
    // 在庫なし：購入失敗、CLEANUP へ
    return {
      ...state,
      phase: "CLEANUP"
    };
  }

  const card = pile.card;
  const activePlayer = current === "player" ? state.player : state.cpu;

  const canAfford =
    activePlayer.riceThisTurn >= card.cost &&
    activePlayer.knowledge >= card.knowledgeRequired;

  if (!canAfford) {
    // 条件を満たさない：購入失敗、CLEANUP へ
    return {
      ...state,
      phase: "CLEANUP"
    };
  }

  const updatedActive: PlayerState = {
    ...activePlayer,
    riceThisTurn: activePlayer.riceThisTurn - card.cost,
    discard: [...activePlayer.discard, card.id]
  };

  const updatedPile = {
    ...pile,
    remaining: pile.remaining - 1
  };

  const newSupply = {
    ...state.supply,
    [chosenCardId]: updatedPile
  };

  const newState: GameState = {
    ...state,
    player: current === "player" ? updatedActive : state.player,
    cpu: current === "cpu" ? updatedActive : state.cpu,
    supply: newSupply,
    phase: "CLEANUP"
  };

  return newState;
}

/**
 * CLEANUP フェーズ
 * - hand と played をすべて discard に移動
 * - riceThisTurn = 0
 * - AP.turnsTaken++
 * - activePlayer を player ↔ cpu で交代
 * - activePlayer が player に戻ったタイミングで turnCount++
 * - ゲーム終了条件（サプライ枯渇 or ターン上限など）をチェックし、
 *   - 終了なら gameEnded = true, winner をセット
 *   - 続行なら phase = "DRAW" で次ターンへ
 */
export function cleanupPhase(state: GameState): GameState {
  const current: ActivePlayer = state.activePlayer;
  const activePlayer = current === "player" ? state.player : state.cpu;

  const mergedDiscard = [
    ...activePlayer.discard,
    ...activePlayer.hand,
    ...activePlayer.played
  ];

  const updatedActive: PlayerState = {
    ...activePlayer,
    hand: [],
    played: [],
    discard: mergedDiscard,
    riceThisTurn: 0,
    turnsTaken: activePlayer.turnsTaken + 1
  };

  const nextActive: ActivePlayer = current === "player" ? "cpu" : "player";
  const nextTurnCount =
    nextActive === "player" ? state.turnCount + 1 : state.turnCount;

  let newState: GameState = {
    ...state,
    player: current === "player" ? updatedActive : state.player,
    cpu: current === "cpu" ? updatedActive : state.cpu,
    activePlayer: nextActive,
    turnCount: nextTurnCount
  };

  const endCheck = evaluateGameEnd(newState);

  if (endCheck.gameEnded) {
    newState = {
      ...newState,
      gameEnded: true,
      winner: endCheck.winner
    };
    return newState;
  }

  return {
    ...newState,
    gameEnded: false,
    winner: null,
    phase: "DRAW"
  };
}

/**
 * 現在の phase に応じて適切なフェーズ処理を呼び出す。
 */
export function proceedPhase(state: GameState): GameState {
  switch (state.phase) {
    case "DRAW":
      return drawPhase(state);
    case "RESOURCE":
      return resourcePhase(state);
    case "ACTION":
      return actionPhase(state);
    case "BUY":
      return buyPhase(state);
    case "CLEANUP":
      return cleanupPhase(state);
    default:
      // 想定外の値の場合はそのまま返す
      return state;
  }
}

// ------------------------------------------------------
// 旧 API 互換用の薄いラッパ（v2 では非推奨）
// ------------------------------------------------------

/**
 * CPU 用：1ターンを完全自動で処理するラッパ。
 * - 前提：state.activePlayer === "cpu" かつ phase === "DRAW" を想定。
 * - v2 では proceedPhase + 各フェーズを直接使うことを推奨。
 */
export function runCpuTurn(
  state: GameState,
  chooseActionCardId: (state: GameState) => string | null,
  chooseBuyCardId: (state: GameState) => string | null
): GameState {
  let s = state;

  if (s.phase === "DRAW") {
    s = drawPhase(s);
  }
  if (s.phase === "RESOURCE") {
    s = resourcePhase(s);
  }
  if (s.phase === "ACTION") {
    const actionId = chooseActionCardId(s);
    s = actionPhase(s, actionId);
  }
  if (s.phase === "BUY") {
    const buyId = chooseBuyCardId(s);
    s = buyPhase(s, buyId);
  }
  if (s.phase === "CLEANUP") {
    s = cleanupPhase(s);
  }

  return s;
}

/**
 * プレイヤー用：行動カードと購入カードが決まっている場合の 1 ターン処理サンプル。
 * - 前提：state.activePlayer === "player" かつ phase === "DRAW" を想定。
 * - v2 では UI から各フェーズを順次呼び出す形への移行を推奨。
 */
export function runPlayerTurnOnceAllDecided(
  state: GameState,
  actionCardId: string | null,
  buyCardId: string | null
): GameState {
  let s = state;

  if (s.phase === "DRAW") {
    s = drawPhase(s);
  }
  if (s.phase === "RESOURCE") {
    s = resourcePhase(s);
  }
  if (s.phase === "ACTION") {
    s = actionPhase(s, actionCardId);
  }
  if (s.phase === "BUY") {
    s = buyPhase(s, buyCardId);
  }
  if (s.phase === "CLEANUP") {
    s = cleanupPhase(s);
  }

  return s;
}

// ------------------------------------------------------
// 内部ヘルパー
// ------------------------------------------------------

function getCardFromSupply(state: GameState, cardId: string): Card | undefined {
  return state.supply[cardId]?.card;
}

/**
 * 手札が 5 枚になるまでドローする。
 * - deck が尽きたら discard をシャッフルして deck に戻す。
 */
function drawUntilHandSizeFive(
  deck: string[],
  discard: string[],
  hand: string[]
): { deck: string[]; discard: string[]; hand: string[] } {
  let newDeck = [...deck];
  let newDiscard = [...discard];
  const newHand = [...hand];

  while (newHand.length < 5) {
    if (newDeck.length === 0) {
      if (newDiscard.length === 0) {
        break; // 引けるカードがない
      }
      newDeck = shuffle(newDiscard);
      newDiscard = [];
    }

    const cardId = newDeck.shift();
    if (cardId === undefined) break;
    newHand.push(cardId);
  }

  return {
    deck: newDeck,
    discard: newDiscard,
    hand: newHand
  };
}

/**
 * 簡易なゲーム終了判定。
 * - v1.5 では「ターン上限」＋「サプライ枯渇」の最低限のみ実装しておき、
 *   勝者判定（score.ts）との連携は別途実装する。
 */
const MAX_TURN_COUNT = 25;

function evaluateGameEnd(
  state: GameState
): { gameEnded: boolean; winner: ActivePlayer | "draw" | null } {
  // ターン上限
  if (state.turnCount >= MAX_TURN_COUNT) {
    // TODO: score.ts の実装に合わせて勝者判定を行う
    return { gameEnded: true, winner: null };
  }

  // サプライの「主要カード」枯渇チェック（暫定版：victory 山札がいずれか 0 枚）
  const anyVictoryEmpty = Object.values(state.supply).some(
    (pile) => pile.card.type === "victory" && pile.remaining <= 0
  );

  if (anyVictoryEmpty) {
    // TODO: 勝利点集計処理と連携して winner を決定する
    return { gameEnded: true, winner: null };
  }

  return { gameEnded: false, winner: null };
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