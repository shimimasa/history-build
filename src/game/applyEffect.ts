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
 * - 正規DSL（type: "gain" / "trash" / "discount" / "attackDiscard" / "conditional"）に対応。
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
        `[TRACE] APPLY_GAIN: riceDelta=${effect.riceDelta ?? 0}, knowledgeDelta=${effect.knowledgeDelta ?? 0}, draw=${effect.draw ?? 0}, actionsDelta=${effect.actionsDelta ?? 0}, buysDelta=${effect.buysDelta ?? 0}`
      );

      if (effect.riceDelta && effect.riceDelta !== 0) {
        player.riceThisTurn += effect.riceDelta;
      }
      if (effect.knowledgeDelta && effect.knowledgeDelta !== 0) {
        player.knowledge += effect.knowledgeDelta;
      }
      if (effect.draw && effect.draw > 0) {
        for (let i = 0; i < effect.draw; i++) {
          drawOneCardForPlayer(player);
        }
      }
      // 勝利点は即時 state には反映せず、ログのみ
      if (effect.victoryDelta && effect.victoryDelta !== 0) {
        newState = appendLog(
          newState,
          target,
          `[EFF] 勝利点 +${effect.victoryDelta}`
        );
      }
      // actions / buys は TurnCounters に反映（あれば）
      if (effect.actionsDelta && effect.actionsDelta !== 0) {
        player.turn = {
          ...player.turn,
          actions: (player.turn?.actions ?? 0) + effect.actionsDelta
        };
      }
      if (effect.buysDelta && effect.buysDelta !== 0) {
        player.turn = {
          ...player.turn,
          buys: (player.turn?.buys ?? 0) + effect.buysDelta
        };
      }
      break;
    }
    case "trash": {
      const from = effect.from ?? "hand";
      let remaining = effect.count;
      if (remaining <= 0) break;

      if (from === "hand") {
        while (remaining > 0 && player.hand.length > 0) {
          const cardId = player.hand.shift();
          if (cardId !== undefined) {
            // v1.5 では廃棄置き場を持っていないため、
            // 簡易的に discard からも取り除くことなく「消える」とする。
          }
          remaining--;
        }
      } else if (from === "played") {
        while (remaining > 0 && player.played.length > 0) {
          player.played.pop();
          remaining--;
        }
      } else if (from === "discard") {
        while (remaining > 0 && player.discard.length > 0) {
          player.discard.pop();
          remaining--;
        }
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
        `[EFF] 割引 -${effect.amount}（次の購入）`
      );
      break;
    }
    case "attackDiscard": {
      newState = applyAttackDiscard(newState, target, effect.count);
      break;
    }
    case "conditional": {
      newState = applyConditionalEffect(newState, target, effect);
      // conditional 自体では差分ログを出さず、内側の then/else 効果に任せる
      return newState;
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
  const player = defender === "player" ? state.player : state.cpu;

  if (player.hand.length === 0) {
    return appendLog(state, defender, "捨てるカードがない（攻撃）");
  }

  const newHand = [...player.hand];
  const newDiscard = [...player.discard];
  let discarded = 0;

  for (let i = 0; i < count && newHand.length > 0; i++) {
    const idx = Math.floor(Math.random() * newHand.length);
    const [cardId] = newHand.splice(idx, 1);
    if (cardId !== undefined) {
      newDiscard.push(cardId);
      discarded++;
    }
  }

  const updatedDefender: PlayerState = {
    ...player,
    hand: newHand,
    discard: newDiscard
  };

  let nextState: GameState =
    defender === "player"
      ? { ...state, player: updatedDefender }
      : { ...state, cpu: updatedDefender };

  if (discarded > 0) {
    nextState = appendLog(
      nextState,
      defender,
      `手札から${discarded}枚を捨てた（攻撃）`
    );
  } else {
    nextState = appendLog(nextState, defender, "捨てるカードがない（攻撃）");
  }

  return nextState;
}

/**
 * conditional DSL の評価と then / else 効果の適用。
 * - 対応条件:
 *   - knowledgeAtLeast
 *   - buysMadeAtLeast
 *   - victoryBuysAtLeast
 * - custom は「未対応」としてログを出してスキップする。
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
      `条件付きの特殊効果（未対応）：${describeCondition(cond)}`
    );
  }

  if (!evalResult) {
    // 対応条件だが未達成の場合は何もしない（ログも最小限）
    return state;
  }

  // 条件達成：then 配列を Effect[] に変換して再帰的に適用
  let next = appendLog(
    state,
    owner,
    `条件達成（${describeCondition(cond)}）→ 効果発動`
  );
  next = applyEffects(next, owner, thenEffects);
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
    case "buysMadeAtLeast": {
      const threshold = cond.value ?? 0;
      const count = player.buysMadeThisTurn ?? 0;
      return count >= threshold;
    }
    case "victoryBuysAtLeast": {
      const threshold = cond.value ?? 0;
      const count = player.boughtVictoryThisTurn ?? 0;
      return count >= threshold;
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
    case "buysMadeAtLeast":
      return `このターンに購入を${cond.value ?? 0}回以上`;
    case "victoryBuysAtLeast":
      return `このターンに勝利点カードを${cond.value ?? 0}枚以上購入`;
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
    // supply はここでは変更しない前提のため、参照のままでもよい。
    // 将来 gain で supply.remaining を減らすようにする場合は、
    // 必要に応じて supply もコピーする。
  };
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