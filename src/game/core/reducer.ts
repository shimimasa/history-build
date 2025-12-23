// src/game/core/reducer.ts
import type { GameState, Card, PlayerState, ActivePlayer } from "../gameState";
import type { Command } from "./types";
import { resolveCommand } from "./resolve";
import { applyAll } from "./applyEvent";
import { appendLog } from "../log";
import { applyEffects } from "../applyEffect";
import { canBuy } from "./canBuy";

// コマンド → イベント列 → state 更新の唯一の入口
export function dispatch(state: GameState, cmd: Command): GameState {
  // PLAY_CARD のときだけ詳細な TRACE を出す
  if (cmd.type === "PLAY_CARD") {
    const cardId = cmd.cardId;
    const card: Card | undefined = state.supply[cardId]?.card;

    // ENTER_PLAY
    const name = card?.name ?? cardId;
    const type = card?.type ?? "unknown";
    let traced: GameState = appendLog(
      state,
      cmd.playerId,
      `[TRACE] ENTER_PLAY: core/resolve.ts::resolvePlayCard cardId=${cardId} name=${name} type=${type}`
    );

    // EFFECTS_RAW / EFFECTS_NORM
    const rawCount = card?.effectsMeta?.rawCount;
    const normCount = card?.effectsMeta?.normCount ?? card?.effects.length ?? 0;
    const types = card?.effectsMeta?.types ?? card?.effects.map((e) => e.type) ?? [];

    if (!card || !card.effects || card.effects.length === 0) {
      traced = appendLog(
        traced,
        cmd.playerId,
        "[TRACE] EFFECTS_RAW: empty"
      );
      traced = appendLog(
        traced,
        cmd.playerId,
        "[TRACE] EFFECTS_NORM: count=0 types="
      );
    } else {
      const rawInfo =
        rawCount === undefined
          ? "unknown"
          : String(rawCount);
      traced = appendLog(
        traced,
        cmd.playerId,
        `[TRACE] EFFECTS_RAW: count=${rawInfo}`
      );
      traced = appendLog(
        traced,
        cmd.playerId,
        `[TRACE] EFFECTS_NORM: count=${normCount} types=${types.join(",")}`
      );

      if (normCount === 0) {
        traced = appendLog(
          traced,
          cmd.playerId,
          "[TRACE] STOP: normalized effects empty"
        );
      }

      // 旧実装では effectsToEvents が gain 以外をイベント化できず SKIP していたが、
      // 現行は applyEffects() が正規DSLを直接適用するため、ここでは SKIP 判定しない。
    }

    // 適用前スナップショット
    const before = snapshotPlayer(traced, cmd.playerId);

    const events = resolveCommand(traced, cmd);
    let afterState = applyAll(traced, events);

    // conditional(if="playedPersonThisTurn") 用：人物をプレイしたらフラグを立てる
    if (card?.type === "person") {
      afterState = {
        ...afterState,
        player:
          cmd.playerId === "player"
            ? { ...afterState.player, playedPersonThisTurn: true }
            : afterState.player,
        cpu:
          cmd.playerId === "cpu"
            ? { ...afterState.cpu, playedPersonThisTurn: true }
            : afterState.cpu
      };
    }

    // カード効果（正規DSL Effect[]）を適用
    if (card && Array.isArray(card.effects) && card.effects.length > 0) {
      const owner: ActivePlayer = cmd.playerId;
      afterState = applyEffects(afterState, owner, card.effects);
    }

    // 参照が変化したかを確認
    const refChanged = afterState !== traced;
    let withTrace = appendLog(
      afterState,
      cmd.playerId,
      `[TRACE] STATE_REF_CHANGED: ${refChanged}`
    );

    // 差分ログ（TRACE 用の簡易版）
    const after = snapshotPlayer(withTrace, cmd.playerId);
    withTrace = appendTraceDiff(withTrace, cmd.playerId, before, after);

    return withTrace;
  }

  // BUY_CARD: 割引消費・購入回数カウンタ更新（成功時のみ）
  if (cmd.type === "BUY_CARD") {
    const preCheck = canBuy(state, cmd.playerId, cmd.supplyCardId);
    const events = resolveCommand(state, cmd);
    let next = applyAll(state, events);

    if (preCheck.ok) {
      const pile = next.supply[cmd.supplyCardId];
      const boughtCard = pile?.card;
      next = {
        ...next,
        player:
          cmd.playerId === "player"
            ? {
                ...next.player,
                discountThisTurn: 0,
                buysMadeThisTurn: (next.player.buysMadeThisTurn ?? 0) + 1,
                boughtVictoryThisTurn:
                  boughtCard?.type === "victory"
                    ? (next.player.boughtVictoryThisTurn ?? 0) + 1
                    : next.player.boughtVictoryThisTurn ?? 0
              }
            : next.player,
        cpu:
          cmd.playerId === "cpu"
            ? {
                ...next.cpu,
                discountThisTurn: 0,
                buysMadeThisTurn: (next.cpu.buysMadeThisTurn ?? 0) + 1,
                boughtVictoryThisTurn:
                  boughtCard?.type === "victory"
                    ? (next.cpu.boughtVictoryThisTurn ?? 0) + 1
                    : next.cpu.boughtVictoryThisTurn ?? 0
              }
            : next.cpu
      };

      // デバッグ用（割引が残りっぱなしを早期検知）
      next = appendLog(next, cmd.playerId, "[TRACE] BUY_SUCCESS: discountConsumed=1");
    }

    return next;
  }

  // END_TURN: ターン系カウンタを全リセット（core 側の唯一の経路）
  if (cmd.type === "END_TURN") {
    const events = resolveCommand(state, cmd);
    let next = applyAll(state, events);

    const reset = (p: PlayerState): PlayerState => ({
      ...p,
      discountThisTurn: 0,
      buysMadeThisTurn: 0,
      boughtVictoryThisTurn: 0,
      trashedThisTurn: 0,
      attackDiscardedThisTurn: 0,
      gainedKnowledgeThisTurn: 0,
      playedPersonThisTurn: false
    });

    next = {
      ...next,
      player: cmd.playerId === "player" ? reset(next.player) : next.player,
      cpu: cmd.playerId === "cpu" ? reset(next.cpu) : next.cpu
    };
    return next;
  }

  const events = resolveCommand(state, cmd);
  return applyAll(state, events);
}

// ---- デバッグ用スナップショット＆ DIFF ログ ----

type TraceSnapshot = {
  riceThisTurn: number;
  knowledge: number;
  actions: number;
  buys: number;
  handCount: number;
  discardCount: number;
  playedCount: number;
};

function snapshotPlayer(state: GameState, playerId: "player" | "cpu"): TraceSnapshot {
  const p: PlayerState = playerId === "player" ? state.player : state.cpu;
  return {
    riceThisTurn: p.riceThisTurn ?? 0,
    knowledge: p.knowledge ?? 0,
    actions: p.turn?.actions ?? 0,
    buys: p.turn?.buys ?? 0,
    handCount: p.hand.length,
    discardCount: p.discard.length,
    playedCount: p.played.length
  };
}

function appendTraceDiff(
  state: GameState,
  playerId: "player" | "cpu",
  before: TraceSnapshot,
  after: TraceSnapshot
): GameState {
  const dRice = after.riceThisTurn - before.riceThisTurn;
  const dKnowledge = after.knowledge - before.knowledge;
  const dActions = after.actions - before.actions;
  const dBuys = after.buys - before.buys;
  const dHand = after.handCount - before.handCount;
  const dDiscard = after.discardCount - before.discardCount;
  const dPlayed = after.playedCount - before.playedCount;

  const parts: string[] = [];
  if (dRice !== 0) parts.push(`rice ${dRice > 0 ? "+" + dRice : String(dRice)}`);
  if (dKnowledge !== 0) parts.push(`knowledge ${dKnowledge > 0 ? "+" + dKnowledge : String(dKnowledge)}`);
  if (dActions !== 0) parts.push(`actions ${dActions > 0 ? "+" + dActions : String(dActions)}`);
  if (dBuys !== 0) parts.push(`buys ${dBuys > 0 ? "+" + dBuys : String(dBuys)}`);
  if (dHand !== 0) parts.push(`hand ${dHand > 0 ? "+" + dHand : String(dHand)}`);
  if (dDiscard !== 0) parts.push(`discard ${dDiscard > 0 ? "+" + dDiscard : String(dDiscard)}`);
  if (dPlayed !== 0) parts.push(`played ${dPlayed > 0 ? "+" + dPlayed : String(dPlayed)}`);

  const msg =
    parts.length === 0
      ? "[TRACE] DIFF: NO_CHANGE"
      : `[TRACE] DIFF: ${parts.join(", ")}`;

  return appendLog(state, playerId, msg);
}