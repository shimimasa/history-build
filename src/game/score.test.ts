// @ts-nocheck
// src/game/score.test.ts

import { describe, it, expect } from "vitest";
import { createInitialGameState, type GameState } from "./gameState";
import { loadCards } from "./cardDefinitions";
import {
  computeVictoryPointsForPlayer,
  judgeWinner
} from "./score";

function createEmptyState(): GameState {
  const cards = loadCards();
  return createInitialGameState(cards);
}

describe("score - computeVictoryPointsForPlayer", () => {
  it("VP_VILLAGE 2枚で勝利点2になること", () => {
    const state = createEmptyState();

    state.player.discard = ["VP_VILLAGE", "VP_VILLAGE"];

    const vp = computeVictoryPointsForPlayer(state, "player");
    expect(vp).toBe(2);
  });
});

describe("score - judgeWinner", () => {
  it("player の勝利点が高い場合は 'player' を返す", () => {
    const state = createEmptyState();

    state.player.discard = ["VP_VILLAGE", "VP_VILLAGE"];
    state.cpu.discard = ["VP_VILLAGE"];

    expect(judgeWinner(state)).toBe("player");
  });

  it("cpu の勝利点が高い場合は 'cpu' を返す", () => {
    const state = createEmptyState();

    state.player.discard = ["VP_VILLAGE"];
    state.cpu.discard = ["VP_VILLAGE", "VP_VILLAGE"];

    expect(judgeWinner(state)).toBe("cpu");
  });

  it("同点の場合は 'draw' を返す", () => {
    const state = createEmptyState();

    state.player.discard = ["VP_VILLAGE"];
    state.cpu.discard = ["VP_VILLAGE"];

    expect(judgeWinner(state)).toBe("draw");
  });
});