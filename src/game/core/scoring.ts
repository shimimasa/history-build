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
    // 勝利点カードのみ内訳として加算（gainVP は vpTokens へ）
    if (card.type === "victory" || card.category === "victory") {
      total += sumVictoryOnCard(card);
    }
  }
  return total + (p.vpTokens ?? 0);
}

function sumVictoryOnCard(card: Card): number {
  let sum = 0;
  for (const ef of card.effects) {
    sum += getVictoryValue(ef);
  }
  return sum;
}

function getVictoryValue(effect: Effect): number {
  if (effect.type !== "gain") return 0;
  return effect.victoryDelta ?? 0;
}