// @ts-nocheck
// src/game/score.test.ts

import { describe, it, expect } from "vitest";
import { createInitialGameState, type GameState } from "./gameState";
import { loadCards } from "./cardDefinitions";
import {
  computeVictoryPointsForPlayer,
  judgeWinner
} from "./socre"; // ファイル名に合わせて一旦 socre に統一

function createEmptyState(): GameState {
  const cards = loadCards();
  return createInitialGameState(cards);
}

describe("score - computeVictoryPointsForPlayer", () => {
  it("VP_VILLAGE を2枚捨て札に追加すると勝利点が2点増えること", () => {
    const cards = loadCards();
    let state = createInitialGameState(cards);

    const baseVp = computeVictoryPointsForPlayer(state, "player");

    const player = state.player;
    const updatedPlayer = {
      ...player,
      discard: [...player.discard, "VP_VILLAGE", "VP_VILLAGE"]
    };

    state = {
      ...state,
      player: updatedPlayer
    };

    const vp = computeVictoryPointsForPlayer(state, "player");

    // 追加した VP_VILLAGE 2枚ぶん、勝利点が +2 されていること
    expect(vp - baseVp).toBe(2);
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