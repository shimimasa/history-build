// src/game/applyEffect.ts
// Effect DSL（canonical: src/game/effects.ts）に基づく純関数的な効果適用ロジック

import type { ActivePlayer, Effect, GameState, PlayerState } from "./gameState";
import { appendLog } from "./log";

// ------------------------------------------------------
// 公開 API
// ------------------------------------------------------

export function applyEffects(
  state: GameState,
  target: ActivePlayer,
  effects: Effect[]
): GameState {
  return effects.reduce((s, ef) => applyEffect(s, target, ef), state);
}

export function applyEffect(
  state: GameState,
  target: ActivePlayer,
  effect: Effect
): GameState {
  let newState: GameState = cloneGameState(state);
  const player: PlayerState = target === "player" ? newState.player : newState.cpu;

  const before = snapshotPlayer(newState, target);

  switch (effect.type) {
    case "gain": {
      const g = effect.gain ?? {};
      const rice = g.rice ?? 0;
      const knowledge = g.knowledge ?? 0;
      const draw = g.draw ?? 0;
      const actions = g.actions ?? 0;
      const buys = g.buys ?? 0;
      const vp = g.vp ?? 0;

      newState = appendLog(
        newState,
        target,
        `[TRACE] APPLY_GAIN: rice=${rice}, knowledge=${knowledge}, draw=${draw}, actions=${actions}, buys=${buys}, vp=${vp}`
      );

      if (rice !== 0) {
        player.riceThisTurn += rice;
        player.turn = { ...player.turn, rice: (player.turn?.rice ?? 0) + rice };
      }
      if (knowledge !== 0) {
        player.knowledge += knowledge;
        player.gainedKnowledgeThisTurn = (player.gainedKnowledgeThisTurn ?? 0) + knowledge;
        player.turn = {
          ...player.turn,
          knowledge: (player.turn?.knowledge ?? 0) + knowledge
        };
      }
      if (draw > 0) {
        for (let i = 0; i < draw; i++) {
          drawOneCardForPlayer(player);
        }
      }
      if (actions !== 0) {
        player.turn = { ...player.turn, actions: (player.turn?.actions ?? 0) + actions };
      }
      if (buys !== 0) {
        player.turn = { ...player.turn, buys: (player.turn?.buys ?? 0) + buys };
      }
      if (vp !== 0) {
        player.vpTokens = (player.vpTokens ?? 0) + vp;
        newState = appendLog(newState, target, `[EFF] 勝利点トークン +${vp}`);
      }
      break;
    }
    case "discount": {
      const n = effect.discountThisTurn ?? 0;
      if (n !== 0) {
        player.discountThisTurn = (player.discountThisTurn ?? 0) + n;
        newState = appendLog(newState, target, `[EFF] 割引 -${n}（このターン）`);
      } else {
        newState = appendLog(newState, target, "[EFF] 割引 0（このターン）");
      }
      break;
    }
    case "trashFromHand": {
      const want = effect.count ?? 0;
      const actual = moveCardsFromHand(player, want, "TRASH", newState);
      player.trashedThisTurn = (player.trashedThisTurn ?? 0) + actual;
      newState = appendLog(newState, target, `[EFF] 廃棄 ${actual}`);
      break;
    }
    case "selfDiscard": {
      const want = effect.count ?? 0;
      const actual = moveCardsFromHand(player, want, "DISCARD", newState);
      newState = appendLog(newState, target, `[EFF] 捨て札 ${actual}`);
      break;
    }
    case "attackDiscard": {
      const want = effect.count ?? 0;
      newState = applyAttackDiscard(newState, target, want);
      break;
    }
    case "conditional": {
      newState = applyConditionalEffect(newState, target, effect);
      return newState;
    }
    case "unknown": {
      newState = appendLog(
        newState,
        target,
        `[WARN] 未対応効果: cardId=${effect.__cardId ?? "?"} keys=${safeKeys(effect.raw)} raw=${safeShortJson(effect.raw)}`
      );
      break;
    }
    default: {
      newState = appendLog(
        newState,
        target,
        `[WARN] 未対応効果: ${safeShortJson(effect as any)}`
      );
      break;
    }
  }

  const after = snapshotPlayer(newState, target);
  newState = appendEffectDiffLog(newState, target, before, after);
  return newState;
}

// ------------------------------------------------------
// 内部ヘルパー
// ------------------------------------------------------

type PlayerSnapshot = {
  riceThisTurn: number;
  knowledge: number;
  actions: number;
  buys: number;
  handCount: number;
  discardCount: number;
  playedCount: number;
};

function snapshotPlayer(state: GameState, owner: ActivePlayer): PlayerSnapshot {
  const p = owner === "player" ? state.player : state.cpu;
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

function appendEffectDiffLog(
  state: GameState,
  owner: ActivePlayer,
  before: PlayerSnapshot,
  after: PlayerSnapshot
): GameState {
  let next = state;

  const dRice = after.riceThisTurn - before.riceThisTurn;
  const dKnowledge = after.knowledge - before.knowledge;
  const dActions = after.actions - before.actions;
  const dBuys = after.buys - before.buys;
  const dHand = after.handCount - before.handCount;
  const dDiscard = after.discardCount - before.discardCount;
  const dPlayed = after.playedCount - before.playedCount;

  // 米
  if (dRice !== 0) {
    const sign = dRice > 0 ? `+${dRice}` : `${dRice}`;
    next = appendLog(next, owner, `[EFF] 米 ${sign}`);
  }

  // 知識
  if (dKnowledge !== 0) {
    const sign = dKnowledge > 0 ? `+${dKnowledge}` : `${dKnowledge}`;
    next = appendLog(next, owner, `[EFF] 見識 ${sign}`);
  }

  // アクション
  if (dActions !== 0) {
    const sign = dActions > 0 ? `+${dActions}` : `${dActions}`;
    next = appendLog(next, owner, `[EFF] アクション ${sign}`);
  }

  // 購入回数
  if (dBuys !== 0) {
    const sign = dBuys > 0 ? `+${dBuys}` : `${dBuys}`;
    next = appendLog(next, owner, `[EFF] 購入 ${sign}`);
  }

  // 手札と捨て札
  if (dHand !== 0 || dDiscard !== 0) {
    // ドローのみ
    if (dHand > 0 && dDiscard === 0) {
      next = appendLog(
        next,
        owner,
        `[EFF] ドロー +${dHand}（手札 +${dHand}）`
      );
    }
    // 手札減＋捨て札増（典型的な discard / trash）
    else if (dHand < 0 && dDiscard > 0) {
      next = appendLog(
        next,
        owner,
        `[EFF] 手札 ${dHand}（捨て札 +${dDiscard}）`
      );
    } else {
      // その他の組み合わせは素朴に両方出す
      if (dHand !== 0) {
        const sign = dHand > 0 ? `+${dHand}` : `${dHand}`;
        next = appendLog(next, owner, `[EFF] 手札 ${sign}`);
      }
      if (dDiscard !== 0) {
        const sign = dDiscard > 0 ? `+${dDiscard}` : `${dDiscard}`;
        next = appendLog(next, owner, `[EFF] 捨て札 ${sign}`);
      }
    }
  }

  // プレイ済み枚数（通常は trashSelf など特殊な場合にのみ変化）
  if (dPlayed !== 0) {
    const sign = dPlayed > 0 ? `+${dPlayed}` : `${dPlayed}`;
    next = appendLog(next, owner, `[EFF] プレイ済み ${sign}`);
  }

  // いずれの差分もなければ「効果なし」として明示
  if (
    dRice === 0 &&
    dKnowledge === 0 &&
    dActions === 0 &&
    dBuys === 0 &&
    dHand === 0 &&
    dDiscard === 0 &&
    dPlayed === 0
  ) {
    next = appendLog(
      next,
      owner,
      "[EFF] 効果なし（未実装または条件未達）"
    );
  }

  return next;
}

function applyAttackDiscard(state: GameState, attacker: ActivePlayer, want: number): GameState {
  const defender: ActivePlayer = attacker === "player" ? "cpu" : "player";
  const defenderPlayer = defender === "player" ? state.player : state.cpu;
  const attackerPlayer = attacker === "player" ? state.player : state.cpu;

  const actual = Math.max(0, Math.min(want, defenderPlayer.hand.length));

  const newHand = [...defenderPlayer.hand];
  const newDiscard = [...defenderPlayer.discard];
  for (let i = 0; i < actual; i++) {
    const id = newHand.shift();
    if (id !== undefined) newDiscard.push(id);
  }

  const updatedDefender: PlayerState = { ...defenderPlayer, hand: newHand, discard: newDiscard };
  const updatedAttacker: PlayerState = {
    ...attackerPlayer,
    attackDiscardedThisTurn: (attackerPlayer.attackDiscardedThisTurn ?? 0) + actual
  };

  let next: GameState = {
    ...state,
    player:
      attacker === "player"
        ? updatedAttacker
        : defender === "player"
          ? updatedDefender
          : state.player,
    cpu:
      attacker === "cpu"
        ? updatedAttacker
        : defender === "cpu"
          ? updatedDefender
          : state.cpu
  };

  next = appendLog(next, attacker, `[EFF] 攻撃: 相手が捨て札 ${actual}`);
  if (actual === 0) {
    next = appendLog(next, defender, "[EFF] 攻撃で捨てるカードがない");
  } else {
    next = appendLog(next, defender, `[EFF] 攻撃で捨て札 ${actual}`);
  }
  return next;
}

/**
 * conditional DSL の評価と then / else 効果の適用。
 * - 未対応条件は必ずログに残し、クラッシュしない。
 */
function applyConditionalEffect(
  state: GameState,
  owner: ActivePlayer,
  conditional: Extract<Effect, { type: "conditional" }>
): GameState {
  const ifStr = conditional.if ?? "";
  const thenEffects = conditional.then ?? [];
  const elseEffects = conditional.else ?? [];

  const res = evaluateIfString(state, owner, ifStr);

  if (res === "unsupported") {
    let next = appendLog(state, owner, `[WARN] 未対応条件: ${ifStr}`);
    next = appendLog(next, owner, `[EFF] 条件未達（${ifStr}）`);
    if (elseEffects.length > 0) next = applyEffects(next, owner, elseEffects);
    return next;
  }

  if (res) {
    let next = appendLog(state, owner, `[EFF] 条件達成（${ifStr}）→ 効果発動`);
    next = applyEffects(next, owner, thenEffects);
    return next;
  }

  let next = appendLog(state, owner, `[EFF] 条件未達（${ifStr}）`);
  if (elseEffects.length > 0) next = applyEffects(next, owner, elseEffects);
  return next;
}

type ConditionEvalResult = boolean | "unsupported";

function evaluateIfString(state: GameState, owner: ActivePlayer, ifStr: string): ConditionEvalResult {
  const p = owner === "player" ? state.player : state.cpu;

  // 最小必須（指定3条件）
  if (ifStr === "playedPersonThisTurn") {
    return !!p.playedPersonThisTurn;
  }
  const mTrash = ifStr.match(/^trashedThisTurn>=(\d+)$/);
  if (mTrash) {
    const n = parseInt(mTrash[1], 10);
    return (p.trashedThisTurn ?? 0) >= n;
  }
  const mAtk = ifStr.match(/^attackDiscarded>=(\d+)$/);
  if (mAtk) {
    const n = parseInt(mAtk[1], 10);
    return (p.attackDiscardedThisTurn ?? 0) >= n;
  }

  // 余裕枠（cards.json に頻出する場合に備える）
  const mKnow = ifStr.match(/^gainedKnowledgeThisTurn>=(\d+)$/);
  if (mKnow) {
    const n = parseInt(mKnow[1], 10);
    return (p.gainedKnowledgeThisTurn ?? 0) >= n;
  }

  return "unsupported";
}

/**
 * GameState をディープコピーする。
 * - player / cpu と、それぞれの deck / hand / discard / played をコピー。
 */
function cloneGameState(state: GameState): GameState {
  return {
    ...state,
    player: clonePlayerState(state.player),
    cpu: clonePlayerState(state.cpu),
    trashPile: [...(state.trashPile ?? [])],
    // supply はここでは変更しない前提のため、参照のままでもよい。
    // 将来 gain で supply.remaining を減らすようにする場合は、
    // 必要に応じて supply もコピーする。
  };
}

function safeShortJson(v: any): string {
  try {
    const s = JSON.stringify(v);
    if (s.length <= 160) return s;
    return s.slice(0, 157) + "...";
  } catch {
    return String(v);
  }
}

function safeKeys(v: any): string {
  try {
    if (!v || typeof v !== "object") return "";
    return Object.keys(v).join(",");
  } catch {
    return "";
  }
}

function clonePlayerState(player: PlayerState): PlayerState {
  return {
    ...player,
    deck: [...player.deck],
    hand: [...player.hand],
    discard: [...player.discard],
    played: [...player.played],
  };
}

/**
 * プレイヤーがカードを1枚ドローする。
 * - deck が空なら discard をシャッフルして deck に戻す。
 * - それでも引くカードがなければ何もしない。
 */
function drawOneCardForPlayer(player: PlayerState): void {
  if (player.deck.length === 0) {
    if (player.discard.length === 0) {
      // 引くカードがない
      return;
    }
    reshuffleDiscardIntoDeck(player);
  }

  const cardId = player.deck.shift();
  if (cardId !== undefined) {
    player.hand.push(cardId);
  }
}

/**
 * 捨て札をシャッフルして山札に戻す。
 */
function reshuffleDiscardIntoDeck(player: PlayerState): void {
  player.deck = shuffle([...player.discard]);
  player.discard = [];
}

/**
 * Fisher–Yates シャッフル
 */
function shuffle<T>(array: T[]): T[] {
  const a = [...array];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

type MoveDest = "DISCARD" | "TRASH";

function moveCardsFromHand(player: PlayerState, want: number, dest: MoveDest, state: GameState): number {
  const n = Math.max(0, Math.min(want, player.hand.length));
  for (let i = 0; i < n; i++) {
    const id = player.hand.shift();
    if (id === undefined) continue;
    if (dest === "DISCARD") {
      player.discard.push(id);
    } else {
      state.trashPile = [...(state.trashPile ?? []), id];
    }
  }
  return n;
}