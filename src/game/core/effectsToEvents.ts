// src/game/core/effectsToEvents.ts

import type { Effect } from "../gameState";
import type { GameEvent, PlayerId } from "./types";

// まずは addRice / addKnowledge / draw のみイベント化
export function effectsToEvents(
  effects: Effect[],
  owner: PlayerId
): GameEvent[] {
  const events: GameEvent[] = [];

  for (const ef of effects) {
    if (ef.addRice && ef.addRice !== 0) {
      events.push({
        type: "COUNTER_ADD",
        playerId: owner,
        key: "rice",
        amount: ef.addRice
      });
    }

    if (ef.addKnowledge && ef.addKnowledge !== 0) {
      events.push({
        type: "COUNTER_ADD",
        playerId: owner,
        key: "knowledge",
        amount: ef.addKnowledge
      });
    }

    if (ef.draw && ef.draw > 0) {
      events.push({
        type: "DRAW",
        playerId: owner,
        count: ef.draw
      });
    }

    // TODO: discard / gain / trashSelf / addVictory など
    if (ef.discard || ef.gain || ef.trashSelf || ef.addVictory) {
      events.push({
        type: "LOG",
        msg:
          "[TODO] discard / gain / trashSelf / addVictory などの高度な Effect は " +
          "未イベント化です"
      });
    }
  }

  return events;
}