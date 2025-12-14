// src/game/core/applyEvent.ts

import type { GameState, PlayerState } from "../gameState";
import type { GameEvent } from "./types";
import { judgeWinner } from "../socre";
import type { PlayerId, TurnCounters } from "./types";

export function applyEvent(state: GameState, ev: GameEvent): GameState {
  switch (ev.type) {
    case "LOG":
      return {
        ...state,
        eventLog: [...(state.eventLog ?? []), ev.msg]
      };

    case "PHASE_SET":
      return { ...state, phase: ev.phase };

    case "COUNTER_ADD":
      return updatePlayer(state, ev.playerId, (p) => {
        const base: TurnCounters =
          p.turn ?? { actions: 1, buys: 1, rice: 0, knowledge: 0 };
        return {
          ...p,
          turn: {
            ...base,
            [ev.key]: base[ev.key] + ev.amount
          }
        };
      });

    case "COUNTER_SET":
      return updatePlayer(state, ev.playerId, (p) => ({
        ...p,
        turn: { ...ev.counters }
      }));

    case "MOVE_CARD":
      return updatePlayer(state, ev.playerId, (p) =>
        moveCard(p, ev.cardInstanceId, ev.from, ev.to)
      );

    case "DRAW":
      return updatePlayer(state, ev.playerId, (p) =>
        drawForPlayer(p, ev.count)
      );

    case "GAIN_CARD":
      return updatePlayer(state, ev.playerId, (p) =>
        gainCard(p, ev.supplyCardId, ev.to)
      );

    case "SUPPLY_DEC": {
      const pile = state.supply[ev.supplyCardId];
      if (!pile) return state;
      return {
        ...state,
        supply: {
          ...state.supply,
          [ev.supplyCardId]: {
            ...pile,
            remaining: Math.max(0, pile.remaining - ev.amount)
          }
        }
      };
    }

    case "TURN_PLAYER_SET":
      return { ...state, activePlayer: ev.playerId };

    case "GAME_END": {
      if (state.gameEnded) return state;
      const winner = judgeWinner(state);
      return {
        ...state,
        gameEnded: true,
        winner,
        phase: "GAME_OVER"
      };
    }

    default:
      return state;
  }
}

export function applyAll(state: GameState, events: GameEvent[]): GameState {
  return events.reduce((s, ev) => applyEvent(s, ev), state);
}

// ---- 内部ヘルパー ----

function updatePlayer(
  state: GameState,
  playerId: PlayerId,
  updater: (p: PlayerState) => PlayerState
): GameState {
  if (playerId === "player") {
    return { ...state, player: updater(state.player) };
  }
  return { ...state, cpu: updater(state.cpu) };
}

function moveCard(
  player: PlayerState,
  cardId: string,
  from: "DECK" | "HAND" | "DISCARD" | "IN_PLAY",
  to: "DECK" | "HAND" | "DISCARD" | "IN_PLAY"
): PlayerState {
  const fromKey =
    from === "DECK"
      ? "deck"
      : from === "HAND"
      ? "hand"
      : from === "DISCARD"
      ? "discard"
      : "played";
  const toKey =
    to === "DECK"
      ? "deck"
      : to === "HAND"
      ? "hand"
      : to === "DISCARD"
      ? "discard"
      : "played";

  const fromArr = [...(player as any)[fromKey]];
  const toArr = [...(player as any)[toKey]];

  const idx = fromArr.indexOf(cardId);
  if (idx === -1) return player;

  fromArr.splice(idx, 1);
  toArr.push(cardId);

  return {
    ...player,
    [fromKey]: fromArr,
    [toKey]: toArr
  } as PlayerState;
}

function drawForPlayer(player: PlayerState, count: number): PlayerState {
  let deck = [...player.deck];
  let discard = [...player.discard];
  const hand = [...player.hand];

  for (let i = 0; i < count; i++) {
    if (deck.length === 0) {
      if (discard.length === 0) break;
      deck = shuffle(discard);
      discard = [];
    }
    const cardId = deck.shift();
    if (!cardId) break;
    hand.push(cardId);
  }

  return { ...player, deck, discard, hand };
}

function gainCard(
  player: PlayerState,
  supplyCardId: string,
  to: "DISCARD" | "HAND" | "TOP_DECK"
): PlayerState {
  if (to === "DISCARD") {
    return { ...player, discard: [...player.discard, supplyCardId] };
  }
  if (to === "HAND") {
    return { ...player, hand: [...player.hand, supplyCardId] };
  }
  // TOP_DECK
  return { ...player, deck: [supplyCardId, ...player.deck] };
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}