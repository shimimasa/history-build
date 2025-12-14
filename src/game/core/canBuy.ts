// src/game/core/canBuy.ts
import type { GameState } from "../gameState";
import type { PlayerId } from "./types";

export type CanBuyResult = {
  ok: boolean;
  reasons: string[];
  costRice: number;
  reqKnow: number;
};

export function canBuy(
  state: GameState,
  playerId: PlayerId,
  supplyCardId: string
): CanBuyResult {
  const reasons: string[] = [];

  if (state.phase !== "BUY") {
    reasons.push("BUY フェーズではありません");
  }

  const player = playerId === "player" ? state.player : state.cpu;
  const turn = player.turn ?? {
    actions: 1,
    buys: 1,
    rice: 0,
    knowledge: 0
  };

  if (turn.buys <= 0) {
    reasons.push("購入回数が残っていません");
  }

  const pile = state.supply[supplyCardId];
  if (!pile) {
    reasons.push("サプライに存在しないカードです");
  } else if (pile.remaining <= 0) {
    reasons.push("サプライが枯渇しています");
  }

  const card = pile?.card;
  const costRice = card?.cost ?? 0;
  const reqKnow = card?.knowledgeRequired ?? 0;

  if (turn.rice < costRice) {
    reasons.push("米が足りません");
  }
  if (turn.knowledge < reqKnow) {
    reasons.push("知識が足りません");
  }

  return {
    ok: reasons.length === 0,
    reasons,
    costRice,
    reqKnow
  };
}