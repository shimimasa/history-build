// src/ui/uiTypes.ts
// アプリ全体で共有する UI スクリーン状態とゲーム結果・デッキ情報の型

import type { GameState, ActivePlayer } from "../game/gameState";

export type UiScreen = "start" | "deckSelect" | "game" | "result";

export interface GameOutcome {
  finalState: GameState;
  winner: ActivePlayer | "draw" | null;
  playerScore: number;
  cpuScore: number;
}

// デッキ設定（将来の拡張を見越した最小構成）
export interface DeckConfig {
  id: string;
  name: string;
  description: string;
  // TODO: 必要になったら初期デッキ・サプライ構成などをここに追加する（initialDeck など）
}

export const DEFAULT_DECKS: DeckConfig[] = [
  {
    id: "sengoku-basic",
    name: "戦国基本デッキ",
    description: "こめ袋（小）と村落から始まる、標準的な戦国デッキ。"
  }
];