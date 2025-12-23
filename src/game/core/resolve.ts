// src/game/core/resolve.ts

import type { GameState, Card } from "../gameState";
import type { Command, GameEvent, Phase, PlayerId } from "./types";
import { canBuy } from "../core/canBuy";
import { effectsToEvents } from "./effectsToEvents";

export function resolveCommand(
  state: GameState,
  cmd: Command
): GameEvent[] {
  const phase = state.phase as Phase;
  const playerId = cmd.playerId;

  if (!isAllowedInPhase(phase, cmd.type)) {
    return [
      {
        type: "LOG",
        msg: `[DENY] フェーズ ${phase} では ${cmd.type} は実行できません`
      }
    ];
  }

  switch (cmd.type) {
    case "AUTO_PLAY_RESOURCES":
      return resolveAutoPlayResources(state, playerId);

    case "PLAY_CARD":
      return resolvePlayCard(state, playerId, cmd.cardId);

    case "END_PHASE":
      return [
        { type: "PHASE_SET", phase: "BUY" },
        { type: "LOG", msg: "ACTION フェーズを終了し BUY へ移行" }
      ];

    case "BUY_CARD":
      return resolveBuyCard(state, playerId, cmd.supplyCardId);

    case "END_TURN":
      return resolveEndTurn(state, playerId);
  }
}

function isAllowedInPhase(
  phase: Phase,
  cmdType: Command["type"]
): boolean {
  if (phase === "GAME_OVER") return false;

  if (phase === "ACTION") {
    return (
      cmdType === "PLAY_CARD" ||
      cmdType === "AUTO_PLAY_RESOURCES" ||
      cmdType === "END_PHASE"
    );
  }

  if (phase === "BUY") {
    return cmdType === "BUY_CARD" || cmdType === "END_TURN";
  }

  if (phase === "CLEANUP") {
    return cmdType === "END_TURN";
  }

  return false;
}

// ---- 各コマンド ----

function resolveAutoPlayResources(
  state: GameState,
  playerId: PlayerId
): GameEvent[] {
  const p = playerId === "player" ? state.player : state.cpu;
  const handIds = p.hand;

  const events: GameEvent[] = [];
  const resourceIds: string[] = [];
  let totalRice = 0;

  for (const id of handIds) {
    const card: Card | undefined = state.supply[id]?.card;
    if (!card || card.type !== "resource") continue;
    resourceIds.push(id);

    // 正規DSLの gain 効果から米増加量を取得。なければ暫定 1。
    const gain = card.effects.find(
      (e) => e.type === "gain" && e.riceDelta && e.riceDelta > 0
    );
    const rice = gain?.riceDelta;
    totalRice += rice ?? 1;
  }

  for (const id of resourceIds) {
    events.push({
      type: "MOVE_CARD",
      playerId,
      cardInstanceId: id,
      from: "HAND",
      to: "IN_PLAY"
    });
  }

  if (totalRice > 0) {
    events.push({
      type: "COUNTER_ADD",
      playerId,
      key: "rice",
      amount: totalRice
    });
  }

  events.push({
    type: "LOG",
    msg:
      resourceIds.length > 0
        ? `AUTO_PLAY_RESOURCES: 資源 ${resourceIds.length} 枚 → 米 +${totalRice}`
        : "AUTO_PLAY_RESOURCES: 資源カードが手札にありません"
  });

  return events;
}

function resolvePlayCard(
  state: GameState,
  playerId: PlayerId,
  cardId: string
): GameEvent[] {
  const p = playerId === "player" ? state.player : state.cpu;
  const turn = p.turn ?? {
    actions: 1,
    buys: 1,
    rice: 0,
    knowledge: 0
  };

  if (turn.actions <= 0) {
    return [
      {
        type: "LOG",
        msg: "[DENY] 行動回数が 0 のためカードをプレイできません"
      }
    ];
  }
  if (!p.hand.includes(cardId)) {
    return [
      {
        type: "LOG",
        msg: "[DENY] 手札に存在しないカードはプレイできません"
      }
    ];
  }

  const card = state.supply[cardId]?.card;
  if (!card || (card.type !== "person" && card.type !== "event")) {
    return [
      {
        type: "LOG",
        msg:
          "[DENY] プレイ可能なのは人物 / 出来事カードのみです " +
          `(id=${cardId})`
      }
    ];
  }

  const name = card.name ?? card.id;

  const events: GameEvent[] = [
    {
      type: "LOG",
      msg: `[DBG] playCard entered: ${name}`
    },
    {
      type: "MOVE_CARD",
      playerId,
      cardInstanceId: cardId,
      from: "HAND",
      to: "IN_PLAY"
    },
    {
      type: "COUNTER_ADD",
      playerId,
      key: "actions",
      amount: -1
    },
    {
      type: "LOG",
      msg: `[PLAY] 「${name}」を使用`
    }
  ];

  return events;
}

function resolveBuyCard(
  state: GameState,
  playerId: PlayerId,
  supplyCardId: string
): GameEvent[] {
  const result = canBuy(state, playerId, supplyCardId);

  if (!result.ok) {
    return [
      {
        type: "LOG",
        msg:
          `[BUY NG] 「${supplyCardId}」購入不可: ` +
          result.reasons.join(" / ")
      }
    ];
  }

  const card = state.supply[supplyCardId]?.card;
  const name = card?.name ?? supplyCardId;
  const baseCost = card?.cost ?? 0;
  const discount = Math.max(
    0,
    (playerId === "player" ? state.player : state.cpu).buyDiscountThisTurn ?? 0
  );
  const discountUsed = Math.max(0, baseCost - result.costRice);

  const events: GameEvent[] = [
    {
      type: "COUNTER_ADD",
      playerId,
      key: "rice",
      amount: -result.costRice
    },
    {
      type: "COUNTER_ADD",
      playerId,
      key: "buys",
      amount: -1
    },
    {
      type: "SUPPLY_DEC",
      supplyCardId,
      amount: 1
    },
    {
      type: "GAIN_CARD",
      playerId,
      supplyCardId,
      to: "DISCARD"
    },
    {
      type: "LOG",
      msg:
        discountUsed > 0
          ? `[BUY] 「${name}」を購入（割引 -${Math.min(discount, discountUsed)}、米 -${result.costRice}）`
          : `[BUY] 「${name}」を購入（米 -${result.costRice}）`
    }
  ];

  return events;
}

function resolveEndTurn(
  state: GameState,
  playerId: PlayerId
): GameEvent[] {
  const p = playerId === "player" ? state.player : state.cpu;

  const events: GameEvent[] = [];

  // CLEANUP フェーズ
  events.push({ type: "PHASE_SET", phase: "CLEANUP" });

  // hand / inPlay → discard
  for (const id of p.hand) {
    events.push({
      type: "MOVE_CARD",
      playerId,
      cardInstanceId: id,
      from: "HAND",
      to: "DISCARD"
    });
  }
  for (const id of p.played) {
    events.push({
      type: "MOVE_CARD",
      playerId,
      cardInstanceId: id,
      from: "IN_PLAY",
      to: "DISCARD"
    });
  }

  // 次ターンの 5 枚ドロー
  events.push({ type: "DRAW", playerId, count: 5 });

  // ターンカウンタリセット
  events.push({
    type: "COUNTER_SET",
    playerId,
    counters: { actions: 1, buys: 1, rice: 0, knowledge: 0 }
  });

  // 手番交代
  const next: PlayerId = playerId === "player" ? "cpu" : "player";
  events.push({ type: "TURN_PLAYER_SET", playerId: next });

  // 次のプレイヤーを ACTION フェーズから開始
  events.push({ type: "PHASE_SET", phase: "ACTION" });

  events.push({
    type: "LOG",
    msg: "[TURN] ターンを終了し、手番を交代しました"
  });

  // ★ 既存の turnCount / evaluateGameEnd 由来の終了条件はまだ未移行
  //   必要なら GAME_END を追加で返すよう拡張

  return events;
}