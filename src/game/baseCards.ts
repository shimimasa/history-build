// src/game/baseCards.ts
// RICE_SMALL / RICE_MEDIUM / VP_VILLAGE / VP_COUNTRY など、
// 「汎用リソース / 勝利点カード」を TypeScript コードとして定義する。
// ※ public/cards.json 側にはまだ含まれていないため、暫定的にこちらで補完する。

import type { Card } from "./gameState";

export const BASE_CARDS: Card[] = [
  {
    id: "RICE_SMALL",
    name: "こめ袋（小）",
    type: "resource",
    cost: 1,
    knowledgeRequired: 0,
    effects: [
      { type: "gain", riceDelta: 1 }
    ],
    text: "米+1。もっとも基本的な資源カード。"
  },
  {
    id: "RICE_MEDIUM",
    name: "こめ袋（中）",
    type: "resource",
    cost: 2,
    knowledgeRequired: 0,
    effects: [
      { type: "gain", riceDelta: 2 }
    ],
    text: "米+2。やや効率の良い資源カード。"
  },
  {
    id: "RICE_LARGE",
    name: "こめ袋（大）",
    type: "resource",
    cost: 3,
    knowledgeRequired: 0,
    effects: [
      { type: "gain", riceDelta: 3 }
    ],
    text: "米+3。大量の米をもたらす。"
  },
  {
    id: "VP_VILLAGE",
    name: "村落",
    type: "victory",
    cost: 2,
    knowledgeRequired: 1,
    effects: [],
    text: "勝利点+1。ゲーム終了時に国力として数えられる。"
  },
  {
    id: "VP_CASTLE_TOWN",
    name: "城下町",
    type: "victory",
    cost: 4,
    knowledgeRequired: 2,
    effects: [],
    text: "勝利点+2。発展した城下町。"
  },
  {
    id: "VP_COUNTRY",
    name: "一国支配",
    type: "victory",
    cost: 8,
    knowledgeRequired: 3,
    effects: [],
    text: "勝利点+6。1つの国を支配した証。"
  }
];


