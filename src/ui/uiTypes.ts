// src/ui/uiTypes.ts
// アプリ全体で共有する UI スクリーン状態とゲーム結果情報の型

import type { GameState, ActivePlayer } from "../game/gameState";

export type UiScreen = "start" | "game" | "result";

export interface GameOutcome {
  finalState: GameState;
  winner: ActivePlayer | "draw" | null;
  playerScore: number;
  cpuScore: number;
}