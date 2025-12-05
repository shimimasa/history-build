// @ts-nocheck
// src/logic/cpuLogic.test.ts

import { describe, it, expect } from "vitest";
import {
  type GameState,
  type PlayerState,
  type Card
} from "./cardEffects";
import { chooseCpuBuyCardId } from "./cpuLogic";

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

function createStateForCpuBuy(
  cpuRice: number,
  cpuTurnsTaken: number,
  supplyCards: Card[]
): GameState {
  const cpu: PlayerState = {
    ...createEmptyPlayer(),
    riceThisTurn: cpuRice,
    turnsTaken: cpuTurnsTaken
  };

  const player: PlayerState = createEmptyPlayer();

  const supply: GameState["supply"] = {};
  for (const card of supplyCards) {
    supply[card.id] = {
      card,
      remaining: 10
    };
  }

  return {
    player,
    cpu,
    currentTurn: "cpu",
    turnNumber: 1,
    maxTurnsPerPlayer: 12,
    supply,
    isGameOver: false,
    winner: null
  };
}

describe("cpuLogic - chooseCpuBuyCardId", () => {
  const resourceCard: Card = {
    id: "R1",
    era: "sengoku",
    name: "資源カード",
    type: "resource",
    cost: 3,
    text: "",
    effects: [{ trigger: "onPlay", effect: "addRice", value: 1 }]
  };

  const characterCard: Card = {
    id: "C1",
    era: "sengoku",
    name: "人物カード",
    type: "character",
    cost: 3,
    text: "",
    effects: [{ trigger: "onPlay", effect: "addKnowledge", value: 1 }]
  };

  const victoryCard: Card = {
    id: "V1",
    era: "sengoku",
    name: "国力カード",
    type: "victory",
    cost: 3,
    text: "",
    effects: [{ trigger: "endGame", effect: "addVictory", value: 1 }]
  };

  it("early フェーズでは resource を優先して購入候補にする", () => {
    const state = createStateForCpuBuy(3, 0, [
      resourceCard,
      characterCard
    ]);
    const chosenId = chooseCpuBuyCardId(state);
    expect(chosenId).toBe("R1");
  });

  it("late フェーズでは victory を優先して購入候補にする", () => {
    const state = createStateForCpuBuy(3, 11, [
      resourceCard,
      victoryCard
    ]);
    const chosenId = chooseCpuBuyCardId(state);
    expect(chosenId).toBe("V1");
  });
}


