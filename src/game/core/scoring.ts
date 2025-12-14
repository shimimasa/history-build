// src/game/core/scoring.ts

import type { GameState, Card, Effect } from "../gameState";
import type { PlayerId } from "./types";

// 国力(勝利点) を deck/hand/discard/played から純粋関数で再計算
export function calcPowerForPlayer(
  state: GameState,
  playerId: PlayerId
): number {
  const p = playerId === "player" ? state.player : state.cpu;

  const allIds: string[] = [
    ...p.deck,
    ...p.hand,
    ...p.discard,
    ...p.played
  ];

  let total = 0;
  for (const id of allIds) {
    const card: Card | undefined = state.supply[id]?.card;
    if (!card) continue;
    total += sumAddVictory(card);
  }
  return total;
}

function sumAddVictory(card: Card): number {
  let sum = 0;
  for (const ef of card.effects) {
    sum += getAddVictory(ef);
  }
  return sum;
}

function getAddVictory(effect: Effect): number {
  return effect.addVictory ?? 0;
}