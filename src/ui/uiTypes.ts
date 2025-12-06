// src/ui/uiTypes.ts
// アプリ全体で共有する UI スクリーン状態とゲーム結果・デッキ情報の型

import type { GameState, ActivePlayer } from "../game/gameState";

export type UiScreen = "start" | "deckSelect" | "game" | "result" | "cardDex";

export interface GameOutcome {
  finalState: GameState;
  winner: ActivePlayer | "draw" | null;
  playerScore: number;
  cpuScore: number;
}

// デッキ設定（将来の拡張を見越した構成）
export interface DeckConfig {
  id: string;
  name: string;
  description: string;
  initialDeck: string[]; // CardId の配列（cards.json の id と一致させる）
}

// 例として 2 種類のデッキを定義
export const DEFAULT_DECKS: DeckConfig[] = [
  {
    id: "sengoku-basic",
    name: "戦国基本デッキ",
    description:
      "こめ袋（小）7枚と村落3枚の、もっとも標準的なデッキ。",
    initialDeck: [
      "RICE_SMALL",
      "RICE_SMALL",
      "RICE_SMALL",
      "RICE_SMALL",
      "RICE_SMALL",
      "RICE_SMALL",
      "RICE_SMALL",
      "VP_VILLAGE",
      "VP_VILLAGE",
      "VP_VILLAGE"
    ]
  },
  {
    id: "sengoku-challenge",
    name: "戦国チャレンジデッキ",
    description:
      "こめ袋（小）を減らし、中サイズの米を混ぜた上級者向け構成。",
    initialDeck: [
      "RICE_SMALL",
      "RICE_SMALL",
      "RICE_SMALL",
      "RICE_SMALL",
      "RICE_SMALL",
      "RICE_MEDIUM",
      "RICE_MEDIUM",
      "VP_VILLAGE",
      "VP_VILLAGE",
      "VP_VILLAGE"
    ]
  }
];