// @ts-nocheck
// src/game/turnFlow.test.ts

import { describe, it, expect } from "vitest";
import { createInitialGameState, type GameState } from "./gameState";
import { loadCards } from "./cardDefinitions";
import { proceedPhase, buyPhase, cleanupPhase } from "./turnFlow";

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

  it("DRAW → RESOURCE → ACTION → BUY → CLEANUP → DRAW へ正しく遷移する", () => {
    let state = createInitialState();

    expect(state.phase).toBe("DRAW");

    state = proceedPhase(state);
    expect(state.phase).toBe("RESOURCE");

    state = proceedPhase(state);
    expect(state.phase).toBe("ACTION");

    state = proceedPhase(state);
    expect(state.phase).toBe("BUY");

    state = proceedPhase(state);
    // CLEANUP 実行後、次の手番（CPU）の DRAW に戻っているはず
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

    // プレイヤーに十分なリソースを与える
    state.player.riceThisTurn = cost;
    state.player.knowledge = knowledgeRequired;
    state.phase = "BUY";

    const beforeDiscardLen = state.player.discard.length;
    const beforeRemaining = pile.remaining;

    const newState = buyPhase(state, targetId);

    expect(newState.phase).toBe("CLEANUP");
    expect(newState.player.riceThisTurn).toBe(0);
    expect(newState.player.discard.length).toBe(beforeDiscardLen + 1);
    expect(newState.player.discard).toContain(targetId);
    expect(newState.supply[targetId].remaining).toBe(beforeRemaining - 1);
  });

  it("米や知識が足りない場合は state を変えず、phase だけ CLEANUP になる", () => {
    let state = createInitialState();

    const targetId = "VP_VILLAGE";
    const pile = state.supply[targetId];
    expect(pile).toBeDefined();

    state.player.riceThisTurn = 0; // 足りない
    state.player.knowledge = 0;
    state.phase = "BUY";

    const before = { ...state.player };
    const newState = buyPhase(state, targetId);

    expect(newState.phase).toBe("CLEANUP");
    expect(newState.player.riceThisTurn).toBe(before.riceThisTurn);
    expect(newState.player.knowledge).toBe(before.knowledge);
    expect(newState.player.discard.length).toBe(before.discard.length);
    expect(newState.supply[targetId].remaining).toBe(pile.remaining);
  });
});