// src/game/core/effectsToEvents.ts

import type { Effect } from "../gameState";
import type { GameEvent, PlayerId } from "./types";

// まずは type: "gain" の gain.{rice,knowledge,draw} のみイベント化
export function effectsToEvents(
  effects: Effect[],
  owner: PlayerId
): GameEvent[] {
  const events: GameEvent[] = [];

  for (const ef of effects) {
    if (ef.type === "gain" && (ef.gain?.rice ?? 0) !== 0) {
      events.push({
        type: "COUNTER_ADD",
        playerId: owner,
        key: "rice",
        amount: ef.gain?.rice ?? 0
      });
    }

    if (ef.type === "gain" && (ef.gain?.knowledge ?? 0) !== 0) {
      events.push({
        type: "COUNTER_ADD",
        playerId: owner,
        key: "knowledge",
        amount: ef.gain?.knowledge ?? 0
      });
    }

    if (ef.type === "gain" && (ef.gain?.draw ?? 0) > 0) {
      events.push({
        type: "DRAW",
        playerId: owner,
        count: ef.gain?.draw ?? 0
      });
    }

    // TODO: discard / gain / trashSelf / addVictory など
    if ((ef as any).discard || (ef as any).gain || (ef as any).trashSelf || (ef as any).addVictory) {
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