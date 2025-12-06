// @ts-nocheck
// src/logic/turnFlow.test.ts

import { describe, it, expect } from "vitest";
import {
  type GameState,
  type PlayerState,
  type Card
} from "../logic/cardEffects";
import { startTurn, endTurn } from "./turnFlow";

function createEmptyPlayer(): PlayerState {
  return {
    deck: [],
    hand: [],
    discard: [],
    playArea: [],
    riceThisTurn: 0,
    knowledge: 0,
    victoryPointsBonus: 0,
    turnsTaken: 0,
    temporaryDiscounts: []
  };
}

function createStateWithDeck(handSize = 5): GameState {
  const baseCard: Card = {
    id: "TEST_CARD",
    era: "sengoku",
    name: "テストカード",
    type: "resource",
    cost: 0,
    text: "",
    effects: []
  };

  const player: PlayerState = {
    ...createEmptyPlayer(),
    deck: Array.from({ length: handSize }, () => baseCard)
  };

  const cpu: PlayerState = createEmptyPlayer();

  return {
    player,
    cpu,
    currentTurn: "player",
    turnNumber: 1,
    maxTurnsPerPlayer: 12,
    supply: {},
    isGameOver: false,
    winner: null
  };
}

describe("turnFlow - startTurn / endTurn", () => {
  it("startTurn で手札が空なら 5枚引く", () => {
    const state = createStateWithDeck(5);
    expect(state.player.hand.length).toBe(0);

    startTurn(state);

    expect(state.player.hand.length).toBe(5);
    expect(state.player.deck.length).toBe(0);
  });

  it("endTurn で手札とプレイエリアが捨札に行き、ターン数が進む", () => {
    const state = createStateWithDeck(0);
    state.player.hand = [
      {
        id: "H1",
        era: "sengoku",
        name: "手札1",
        type: "resource",
        cost: 0,
        text: "",
        effects: []
      }
    ];
    state.player.playArea = [
      {
        id: "P1",
        era: "sengoku",
        name: "プレイ中1",
        type: "resource",
        cost: 0,
        text: "",
        effects: []
      }
    ];

    const beforeTurnNumber = state.turnNumber;

    endTurn(state);

    expect(state.player.hand.length).toBe(0);
    expect(state.player.playArea.length).toBe(0);
    expect(state.player.discard.length).toBe(2);
    expect(state.player.turnsTaken).toBe(1);
    expect(state.turnNumber).toBe(beforeTurnNumber + 1);
  });
});