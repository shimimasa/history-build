// src/game/core/reducer.ts
import type { GameState, Card, PlayerState } from "../gameState";
import type { Command } from "./types";
import { resolveCommand } from "./resolve";
import { applyAll } from "./applyEvent";
import { appendLog } from "../log";

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

      const unhandledTypes = types.filter((t) => t !== "gain");
      if (unhandledTypes.length > 0) {
        traced = appendLog(
          traced,
          cmd.playerId,
          `[TRACE] SKIP_EFFECT: types=${unhandledTypes.join(",")} reason=notHandledInEffectsToEvents`
        );
      }
    }

    // 適用前スナップショット
    const before = snapshotPlayer(traced, cmd.playerId);

    const events = resolveCommand(traced, cmd);
    const afterState = applyAll(traced, events);

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