// @ts-nocheck
// src/logic/cardEffects.test.ts

import { describe, it, expect } from "vitest";
import { canBuyCard } from "./cardEffects";
import type { PlayerState, Card } from "../game/gameState";

function makePlayer(partial?: Partial<PlayerState>): PlayerState {
  return {
    deck: [],
    hand: [],
    discard: [],
    played: [],
    riceThisTurn: 0,
    knowledge: 0,
    turnsTaken: 0,
    ...partial
  };
}

function makeVillageCard(): Card {
  return {
    id: "VP_VILLAGE",
    name: "村落",
    type: "victory",
    cost: 2,
    knowledgeRequired: 1,
    effects: [],
    text: ""
  };
}

describe("cardEffects v2 - canBuyCard", () => {
  it("米と知識が十分なら true を返す", () => {
    const player = makePlayer({ riceThisTurn: 5, knowledge: 2 });
    const card = makeVillageCard();

    expect(canBuyCard(player, card)).toBe(true);
  });

  it("米が足りなければ false を返す", () => {
    const player = makePlayer({ riceThisTurn: 1, knowledge: 10 });
    const card = makeVillageCard();

    expect(canBuyCard(player, card)).toBe(false);
  });

  it("知識が足りなければ false を返す", () => {
    const player = makePlayer({ riceThisTurn: 10, knowledge: 0 });
    const card = makeVillageCard();

    expect(canBuyCard(player, card)).toBe(false);
  });
});