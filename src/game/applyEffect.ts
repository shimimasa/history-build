// src/game/applyEffect.ts
// Effect DSL（history-spec v2 / tech.md v2）に基づく純関数的な効果適用ロジック

import type {
  ActivePlayer,
  Effect,
  GameState,
  PlayerState,
  ConditionDSL
} from "./gameState";
import { appendLog } from "./log";

// ------------------------------------------------------
// 公開 API
// ------------------------------------------------------

/**
 * Effect 配列を順番に適用するヘルパー。
 * - state は決して mutate せず、新しい GameState を返す。
 */
export function applyEffects(
  state: GameState,
  target: ActivePlayer,
  effects: Effect[]
): GameState {
  return effects.reduce((s, ef) => applyEffect(s, target, ef), state);
}

/**
 * 単一の Effect を適用する。
 * - 正規DSL（type: "gain" / "discount" / "trashFromHand" / "attackDiscard" / "selfDiscard" / "conditional" / "unknown"）に対応。
 * - state は決して mutate せず、新しい GameState を返す。
 */
export function applyEffect(
  state: GameState,
  target: ActivePlayer,
  effect: Effect
): GameState {
  // 元の state を絶対に変更しないため、先にディープコピー（player / cpu と各配列）を作る
  let newState: GameState = cloneGameState(state);
  const player: PlayerState =
    target === "player" ? newState.player : newState.cpu;

  // 差分ログ用のスナップショットを取得
  const before = snapshotPlayer(newState, target);

  switch (effect.type) {
    case "gain": {
      // ★ デバッグ用：gain の適用内容をトレース
      newState = appendLog(
        newState,
        target,
        `[TRACE] APPLY_GAIN: riceDelta=${effect.riceDelta ?? 0}, knowledgeDelta=${effect.knowledgeDelta ?? 0}, draw=${effect.draw ?? 0}, victoryDelta=${effect.victoryDelta ?? 0}`
      );

      if (effect.riceDelta && effect.riceDelta !== 0) {
        player.riceThisTurn += effect.riceDelta;
        player.turn = {
          ...player.turn,
          rice: (player.turn?.rice ?? 0) + effect.riceDelta
        };
      }
      if (effect.knowledgeDelta && effect.knowledgeDelta !== 0) {
        player.knowledge += effect.knowledgeDelta;
        player.gainedKnowledgeThisTurn =
          (player.gainedKnowledgeThisTurn ?? 0) + effect.knowledgeDelta;
        player.turn = {
          ...player.turn,
          knowledge: (player.turn?.knowledge ?? 0) + effect.knowledgeDelta
        };
      }
      if (effect.draw && effect.draw > 0) {
        for (let i = 0; i < effect.draw; i++) {
          drawOneCardForPlayer(player);
        }
      }
      // 勝利点（トークン）は即時に vpTokens へ加算
      if (effect.victoryDelta && effect.victoryDelta !== 0) {
        player.vpTokens = (player.vpTokens ?? 0) + effect.victoryDelta;
        newState = appendLog(newState, target, `[EFF] 勝利点トークン +${effect.victoryDelta}`);
      }
      break;
    }
    case "discount": {
      const owner = target === "player" ? newState.player : newState.cpu;
      owner.buyDiscountThisTurn =
        (owner.buyDiscountThisTurn ?? 0) + effect.amount;
      newState = appendLog(
        newState,
        target,
        `[EFF] 割引 -${effect.amount}（このターン）`
      );
      break;
    }
    case "trashFromHand": {
      const count = effect.count ?? 0;
      if (count <= 0) break;

      const trashed: string[] = [];
      for (let i = 0; i < count && player.hand.length > 0; i++) {
        const idx = Math.floor(Math.random() * player.hand.length);
        const [cardId] = player.hand.splice(idx, 1);
        if (cardId !== undefined) {
          trashed.push(cardId);
          player.trashedThisTurn = (player.trashedThisTurn ?? 0) + 1;
          newState.trashPile = [...(newState.trashPile ?? []), cardId];
        }
      }

      if (trashed.length === 0) {
        newState = appendLog(newState, target, "[EFF] 廃棄：手札にカードがない");
      } else {
        for (const id of trashed) {
          const name = newState.supply[id]?.card?.name ?? id;
          newState = appendLog(newState, target, `[EFF] 手札から「${name}」を廃棄`);
        }
      }
      break;
    }
    case "attackDiscard": {
      newState = applyAttackDiscard(newState, target, effect.count);
      break;
    }
    case "selfDiscard": {
      const count = effect.count ?? 0;
      if (count <= 0) break;
      const discarded: string[] = [];
      for (let i = 0; i < count && player.hand.length > 0; i++) {
        const idx = Math.floor(Math.random() * player.hand.length);
        const [cardId] = player.hand.splice(idx, 1);
        if (cardId !== undefined) {
          discarded.push(cardId);
          player.discard.push(cardId);
        }
      }
      if (discarded.length === 0) {
        newState = appendLog(newState, target, "[EFF] 捨てるカードがない");
      } else {
        for (const id of discarded) {
          const name = newState.supply[id]?.card?.name ?? id;
          newState = appendLog(newState, target, `[EFF] 手札から「${name}」を捨てた`);
        }
      }
      break;
    }
    case "conditional": {
      newState = applyConditionalEffect(newState, target, effect);
      // conditional 自体でも「達成/未達」をログに残す（then/else の中身は通常のログに任せる）
      return newState;
    }
    case "unknown": {
      newState = appendLog(
        newState,
        target,
        `[EFF] 未対応効果: ${safeShortJson(effect.raw)}`
      );
      break;
    }
    default: {
      // 将来追加された型に備えてクラッシュしない
      newState = appendLog(
        newState,
        target,
        `[EFF] 未対応効果: ${safeShortJson(effect as any)}`
      );
      break;
    }
  }

  // 差分ログ
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
    next = appendLog(next, owner, `[EFF] 購入回数 ${sign}`);
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

/**
 * 攻撃効果：相手の手札からランダムに N 枚捨て札に送る。
 */
function applyAttackDiscard(
  state: GameState,
  attacker: ActivePlayer,
  count: number
): GameState {
  const defender: ActivePlayer = attacker === "player" ? "cpu" : "player";
  const defenderPlayer = defender === "player" ? state.player : state.cpu;
  const attackerPlayer = attacker === "player" ? state.player : state.cpu;

  if (defenderPlayer.hand.length === 0) {
    return appendLog(state, defender, "[EFF] 捨てるカードがない（攻撃）");
  }

  const newHand = [...defenderPlayer.hand];
  const newDiscard = [...defenderPlayer.discard];
  let discarded = 0;
  const discardedIds: string[] = [];

  for (let i = 0; i < count && newHand.length > 0; i++) {
    const idx = Math.floor(Math.random() * newHand.length);
    const [cardId] = newHand.splice(idx, 1);
    if (cardId !== undefined) {
      newDiscard.push(cardId);
      discardedIds.push(cardId);
      discarded++;
    }
  }

  const updatedDefender: PlayerState = {
    ...defenderPlayer,
    hand: newHand,
    discard: newDiscard
  };

  const updatedAttacker: PlayerState = {
    ...attackerPlayer,
    attackDiscardedThisTurn:
      (attackerPlayer.attackDiscardedThisTurn ?? 0) + discarded
  };

  let nextState: GameState = {
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

  if (discarded > 0) {
    for (const id of discardedIds) {
      const name = nextState.supply[id]?.card?.name ?? id;
      nextState = appendLog(nextState, defender, `[EFF] 手札から「${name}」を捨てた（攻撃）`);
    }
  } else {
    nextState = appendLog(nextState, defender, "[EFF] 捨てるカードがない（攻撃）");
  }

  return nextState;
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
  const cond = conditional.condition;
  const thenEffects = conditional.then;
  const elseEffects = conditional.else;

  const evalResult = evaluateCondition(state, owner, cond);

  if (evalResult === "unsupported") {
    return appendLog(
      state,
      owner,
      `[EFF] 未対応条件：${describeCondition(cond)}`
    );
  }

  if (evalResult) {
    let next = appendLog(state, owner, `[EFF] 条件達成（${describeCondition(cond)}）→ 効果発動`);
    next = applyEffects(next, owner, thenEffects);
    return next;
  }

  // 条件未達：else があれば適用
  let next = appendLog(state, owner, `[EFF] 条件未達（${describeCondition(cond)}）`);
  if (elseEffects && elseEffects.length > 0) {
    next = applyEffects(next, owner, elseEffects);
  }
  return next;
}

type ConditionEvalResult = boolean | "unsupported";

function evaluateCondition(
  state: GameState,
  owner: ActivePlayer,
  cond: ConditionDSL
): ConditionEvalResult {
  const player = owner === "player" ? state.player : state.cpu;

  switch (cond.kind) {
    case "knowledgeAtLeast": {
      const threshold = cond.value ?? 0;
      return player.knowledge >= threshold;
    }
    case "boughtThisTurnAtLeast": {
      const threshold = cond.value ?? 0;
      const count = player.buysMadeThisTurn ?? 0;
      return count >= threshold;
    }
    case "hasCardTypeInPlay": {
      const t = cond.cardType;
      if (!t) return "unsupported";
      for (const id of player.played) {
        const card = state.supply[id]?.card;
        if (!card) continue;
        if (card.type === t) return true;
        if ((card.category ?? "").toLowerCase() === t) return true;
      }
      return false;
    }
    case "trashedThisTurnAtLeast": {
      const threshold = cond.value ?? 0;
      return (player.trashedThisTurn ?? 0) >= threshold;
    }
    case "attackDiscardedAtLeast": {
      const threshold = cond.value ?? 0;
      return (player.attackDiscardedThisTurn ?? 0) >= threshold;
    }
    case "gainedKnowledgeThisTurnAtLeast": {
      const threshold = cond.value ?? 0;
      return (player.gainedKnowledgeThisTurn ?? 0) >= threshold;
    }
    case "custom":
    default:
      return "unsupported";
  }
}

function describeCondition(cond: ConditionDSL): string {
  switch (cond.kind) {
    case "knowledgeAtLeast":
      return `知識${cond.value ?? 0}以上`;
    case "boughtThisTurnAtLeast":
      return `このターンに購入を${cond.value ?? 0}回以上`;
    case "hasCardTypeInPlay":
      return `プレイ済みに${cond.cardType ?? "?"}がある`;
    case "trashedThisTurnAtLeast":
      return `このターンに廃棄を${cond.value ?? 0}回以上`;
    case "attackDiscardedAtLeast":
      return `攻撃で捨てさせた枚数が${cond.value ?? 0}以上`;
    case "gainedKnowledgeThisTurnAtLeast":
      return `このターンに得た見識が${cond.value ?? 0}以上`;
    case "custom":
    default:
      return cond.expr ?? "特殊条件";
  }
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