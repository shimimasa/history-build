// @ts-nocheck
// src/logic/cardEffects.test.ts

import { describe, it, expect } from "vitest";
import {
  applyOnPlayEffects,
  getEffectiveCostForPlayer,
  type Card,
  type GameState,
  type PlayerState
} from "./cardEffects";

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

function createState(): GameState {
  return {
    player: createEmptyPlayer(),
    cpu: createEmptyPlayer(),
    currentTurn: "player",
    turnNumber: 1,
    maxTurnsPerPlayer: 12,
    supply: {},
    isGameOver: false,
    winner: null
  };
}

describe("cardEffects - applyOnPlayEffects", () => {
  it("addRice / addKnowledge を正しく反映する", () => {
    const state = createState();
    const card: Card = {
      id: "TEST_RICE_KNOW",
      era: "sengoku",
      name: "テストカード",
      type: "resource",
      cost: 0,
      text: "",
      effects: [
        { trigger: "onPlay", effect: "addRice", value: 2 },
        { trigger: "onPlay", effect: "addKnowledge", value: 1 }
      ]
    };

    applyOnPlayEffects(state, card, "player");

    expect(state.player.riceThisTurn).toBe(2);
    expect(state.player.knowledge).toBe(1);
  });

  it("discount 効果で購入コストが下がる", () => {
    const state = createState();

    const discountCard: Card = {
      id: "TEST_DISCOUNT",
      era: "sengoku",
      name: "割引カード",
      type: "event",
      cost: 0,
      text: "",
      effects: [
        {
          trigger: "onPlay",
          effect: "discount",
          targetType: "victory",
          value: 1
        }
      ]
    };

    const victoryCard: Card = {
      id: "TEST_VICTORY",
      era: "sengoku",
      name: "国力テスト",
      type: "victory",
      cost: 3,
      text: "",
      effects: []
    };

    applyOnPlayEffects(state, discountCard, "player");

    const cost = getEffectiveCostForPlayer(state.player, victoryCard);
    expect(cost).toBe(2);
  });
}


