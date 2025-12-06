// @ts-nocheck
// src/game/turnFlow.test.ts

import { describe, it, expect } from "vitest";
import {
  createInitialGameState,
  type GameState
} from "./gameState";
import { loadCards } from "./cardDefinitions";
import {
  proceedPhase,
  cleanupPhase,
  buyPhase
} from "./turnFlow";

function createInitialState(): GameState {
  const cards = loadCards();
  return createInitialGameState(cards);
}

describe("turnFlow v2 - 基本フェーズ遷移", () => {
  it("初期状態が DRAW / player / gameEnded=false であること", () => {
    const state = createInitialState();

    expect(state.phase).toBe("DRAW");
    expect(state.activePlayer).toBe("player");
    expect(state.turnCount).toBe(1);
    expect(state.gameEnded).toBe(false);
  });

  it("DRAW → RESOURCE → ACTION → BUY → CLEANUP → DRAW と順に遷移する", () => {
    let state = createInitialState();

    // 初期
    expect(state.phase).toBe("DRAW");

    // DRAW -> RESOURCE
    state = proceedPhase(state);
    expect(state.phase).toBe("RESOURCE");

    // RESOURCE -> ACTION
    state = proceedPhase(state);
    expect(state.phase).toBe("ACTION");

    // ACTION -> BUY
    state = proceedPhase(state);
    expect(state.phase).toBe("BUY");

    // BUY -> CLEANUP
    state = proceedPhase(state);
    expect(state.phase).toBe("CLEANUP");

    // CLEANUP -> 次の手番の DRAW
    state = proceedPhase(state);
    expect(state.phase).toBe("DRAW");
    expect(state.activePlayer).toBe("cpu");
    expect(state.gameEnded).toBe(false);
  });

  it("CLEANUP で player に戻ったタイミングで turnCount が増える", () => {
    let state = createInitialState();

    // テスト簡略化のため、activePlayer='cpu', phase='CLEANUP' の状態を直接作る
    state.activePlayer = "cpu";
    state.phase = "CLEANUP";
    const beforeTurnCount = state.turnCount;

    state = cleanupPhase(state);

    expect(state.activePlayer).toBe("player");
    expect(state.turnCount).toBe(beforeTurnCount + 1);
    expect(state.phase).toBe("DRAW");
  });
});

describe("turnFlow v2 - BUY フェーズの挙動", () => {
  it("条件を満たす場合に victory カードを正しく購入できる", () => {
    let state = createInitialState();

    const targetId = "VP_VILLAGE";
    const pile = state.supply[targetId];
    expect(pile).toBeDefined();

    const cost = pile.card.cost;
    const knowledgeRequired = pile.card.knowledgeRequired;

    state.player.riceThisTurn = cost;
    state.player.knowledge = knowledgeRequired;
    state.phase = "BUY";

    const beforeDiscardLen = state.player.discard.length;
    const beforeRemaining = pile.remaining;

    state = buyPhase(state, targetId);

    expect(state.phase).toBe("CLEANUP");
    expect(state.player.riceThisTurn).toBe(0);
    expect(state.player.discard.length).toBe(beforeDiscardLen + 1);
    expect(state.player.discard).toContain(targetId);
    expect(state.supply[targetId].remaining).toBe(beforeRemaining - 1);
  });

  it("米や知識が足りない場合は state を変えず、phase だけ CLEANUP になる", () => {
    let state = createInitialState();

    const targetId = "VP_VILLAGE";
    const pile = state.supply[targetId];
    expect(pile).toBeDefined();

    state.player.riceThisTurn = 0;
    state.player.knowledge = 0;
    state.phase = "BUY";

    const beforePlayer = { ...state.player };
    const beforeRemaining = pile.remaining;

    state = buyPhase(state, targetId);

    expect(state.phase).toBe("CLEANUP");
    expect(state.player.riceThisTurn).toBe(beforePlayer.riceThisTurn);
    expect(state.player.knowledge).toBe(beforePlayer.knowledge);
    expect(state.player.discard.length).toBe(beforePlayer.discard.length);
    expect(state.supply[targetId].remaining).toBe(beforeRemaining);
  });
});