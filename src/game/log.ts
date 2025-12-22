// src/game/log.ts
// GameState.eventLog へのログ追加ヘルパー

import type { GameState, ActivePlayer } from "./gameState";

const MAX_LOG_ENTRIES = 200;

export type LogActor = ActivePlayer | "system";

export function appendLog(
  state: GameState,
  actor: LogActor,
  message: string
): GameState {
  const prefix =
    actor === "player"
      ? "プレイヤー"
      : actor === "cpu"
      ? "CPU"
      : "システム";
  const line = `${prefix}：${message}`;
  const next = [...state.eventLog, line];
  return {
    ...state,
    eventLog: next.slice(-MAX_LOG_ENTRIES)
  };
}


