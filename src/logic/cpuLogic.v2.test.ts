// @ts-nocheck
// src/logic/cpuLogic.v2.test.ts

import { describe, it, expect } from "vitest";
import { createInitialGameState, type GameState } from "../game/gameState";
import { loadCards } from "../game/cardDefinitions";
import {
  chooseCpuActionCard,
  chooseCpuBuyCard
} from "./cpuLogic";

function createBaseState(): GameState {
  const cards = loadCards();
  return createInitialGameState(cards);
}

describe("cpuLogic v2 - chooseCpuActionCard", () => {
  it("person / event の中から addKnowledge を持つカードを優先して選ぶ", () => {
    const state = createBaseState();

    // CPUの手札を制御：資源 + 知識を増やす人物カード
    state.cpu.hand = ["RICE_SMALL", "CHR_KENSHIN"];

    const chosenId = chooseCpuActionCard(state);
    expect(chosenId).toBe("CHR_KENSHIN"); // resource は候補外、人物カードが選ばれる
  });

  it("行動カードが1枚もない場合は null を返す", () => {
    const state = createBaseState();

    // CPU 手札は資源カードだけにしておく
    state.cpu.hand = ["RICE_SMALL", "RICE_MEDIUM"];

    const chosenId = chooseCpuActionCard(state);
    expect(chosenId).toBeNull();
  });
});

describe("cpuLogic v2 - chooseCpuBuyCard", () => {
  it("十分な米・知識がある場合、勝利点カードを優先して購入候補にする", () => {
    const state = createBaseState();

    // CPU に十分な米・知識を与える（最上位の VP_COUNTRY が買えるように）
    state.cpu.riceThisTurn = 8; // VP_COUNTRY.cost = 8
    state.cpu.knowledge = 3;    // VP_COUNTRY.knowledgeRequired = 3

    const chosenId = chooseCpuBuyCard(state);
    // 勝利点カードの中で最もコストが高い VP_COUNTRY を選ぶ想定
    expect(chosenId).toBe("VP_COUNTRY");
  });

  it("買えるカードが1枚もない場合は null を返す", () => {
    const state = createBaseState();

    state.cpu.riceThisTurn = 0;
    state.cpu.knowledge = 0;

    const chosenId = chooseCpuBuyCard(state);
    expect(chosenId).toBeNull();
  });
});
