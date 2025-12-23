// @ts-nocheck
// src/logic/cpuLogic.v2.test.ts

import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  createInitialGameState,
  type GameState
} from "../game/gameState";
import { convertRawCardToGameCard } from "../game/cardRegistry";
import { BASE_CARDS } from "../game/baseCards";
import {
  chooseCpuActionCard,
  chooseCpuBuyCard
} from "./cpuLogic";

function createBaseState(): GameState {
  const cards = loadCardsFromFile();
  return createInitialGameState(cards);
}

function loadCardsFromFile() {
  const p = path.join(process.cwd(), "public", "cards.json");
  const raw = JSON.parse(fs.readFileSync(p, "utf8"));
  const cards = (raw.cards ?? raw) as any[];
  return [...BASE_CARDS, ...cards.map(convertRawCardToGameCard)];
}

describe("cpuLogic v2 - chooseCpuActionCard", () => {
  it("person / event の中から addKnowledge を持つカードを優先して選ぶ", () => {
    const state = createBaseState();

    // CPU の手札を制御：資源 + 知識を増やす人物カード
    // cards.json 実在IDの出来事カード（gainKnowledge）を使用
    state.cpu.hand = ["RICE_SMALL", "AN_E01"];

    const chosenId = chooseCpuActionCard(state);
    expect(chosenId).toBe("AN_E01");
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
    // 終盤想定にして勝利点重視の重み付けにする
    state.turnCount = 15;

    // CPU に十分な米・知識を与える（最上位の VP_COUNTRY が買えるように）
    state.cpu.riceThisTurn = 8; // VP_COUNTRY.cost = 8
    state.cpu.knowledge = 3;    // VP_COUNTRY.knowledgeRequired = 3

    const chosenId = chooseCpuBuyCard(state);
    expect(chosenId).toBe("VP_COUNTRY");
  });

  it("買えるカードが1枚もない場合は null を返す", () => {
    let state = createBaseState();

    // CPU のリソースを完全に 0 にする
    state = {
      ...state,
      cpu: {
        ...state.cpu,
        riceThisTurn: 0,
        knowledge: 0
      },
      // さらに supply を空にして「そもそも購入候補が存在しない」状態にしておく
      supply: {}
    };

    const chosenId = chooseCpuBuyCard(state);
    expect(chosenId).toBeNull();
  });
});