// src/game/core/reducer.ts
import type { GameState } from "../gameState";
import type { Command } from "./types";
import { resolveCommand } from "./resolve";
import { applyAll } from "./applyEvent";

// コマンド → イベント列 → state 更新の唯一の入口
export function dispatch(state: GameState, cmd: Command): GameState {
  const events = resolveCommand(state, cmd);
  return applyAll(state, events);
}