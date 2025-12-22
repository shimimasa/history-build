// src/game/applyEffect.ts
// Effect DSL（history-spec v2 / tech.md v2）に基づく純関数的な効果適用ロジック

import type { ActivePlayer, Effect, GameState, PlayerState } from "./gameState";
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
 * - Effect DSL（addRice / addKnowledge / draw / discard / gain / trashSelf / addVictory）に対応。
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

  const raw = (effect as any).raw;

  // 差分ログ用のスナップショットを取得
  const before = snapshotPlayer(newState, target);

  // 1. addRice
  if (effect.addRice && effect.addRice !== 0) {
    const amount = effect.addRice;
    player.riceThisTurn += amount;
  }

  // 2. addKnowledge
  if (effect.addKnowledge && effect.addKnowledge !== 0) {
    const amount = effect.addKnowledge;
    player.knowledge += amount;
  }

  // 3. draw
  if (effect.draw && effect.draw > 0) {
    const times = effect.draw;
    for (let i = 0; i < times; i++) {
      drawOneCardForPlayer(player);
    }
  }

  // 4. discard（簡易版：手札先頭から N 枚を捨て札に送る）
  if (effect.discard && effect.discard > 0) {
    const count = effect.discard;
    for (let i = 0; i < count && player.hand.length > 0; i++) {
      const cardId = player.hand.shift();
      if (cardId !== undefined) {
        player.discard.push(cardId);
      }
    }
  }

  // 5. gain（AP.discard に指定 cardId を追加する）
  if (effect.gain) {
    const gainedId = effect.gain;
    player.discard.push(gainedId);

    // 将来的に「サプライから獲得」にしたい場合は、ここで
    // - newState.supply[gainedId].remaining-- などを行う。
    // v1.5 では最低限の実装として discard への追加のみに留める。
  }

  // 6. trashSelf（簡易版：played の末尾を「自分」とみなして取り除く）
  if (effect.trashSelf) {
    // 前提：
    // - カードをプレイする側（turnFlow.ts など）で
    //   hand → played への移動を済ませた直後に applyEffects を呼ぶ。
    // - そのため played の末尾要素が「今プレイ中のカード（self）」であるとみなし、
    //   それを取り除く簡易実装としておく。
    if (player.played.length > 0) {
      player.played.pop();
    }
  }

  // 7. addVictory
  // history-spec v2 より：
  // - 勝利点は GameState に累積しない。
  // - 勝利判定時に deck + discard + played から addVictory を集計する。
  // したがって、通常のプレイ中に applyEffect で状態を変える必要はないため、
  // ここでは state の数値は変えず、ログだけ残す。
  if (effect.addVictory && effect.addVictory !== 0) {
    const amount = effect.addVictory;
    newState = appendLog(newState, target, `[EFF] 勝利点 +${amount}`);
  }

  // 8. raw DSL ベースの追加効果（discount / attackDiscard / conditional）
  if (raw && typeof raw === "object") {
    // 8-1. discount / reduceCostThisTurn
    const discountAmount =
      typeof raw.discount === "number"
        ? raw.discount
        : typeof raw.reduceCostThisTurn === "number"
        ? raw.reduceCostThisTurn
        : 0;
    if (discountAmount && discountAmount !== 0) {
      const owner = target === "player" ? newState.player : newState.cpu;
      owner.buyDiscountThisTurn =
        (owner.buyDiscountThisTurn ?? 0) + discountAmount;
      newState = appendLog(
        newState,
        target,
        `[EFF] 割引 -${discountAmount}（次の購入）`
      );
    }

    // 8-2. attackDiscard
    if (typeof raw.attackDiscard === "number" && raw.attackDiscard > 0) {
      newState = applyAttackDiscard(
        newState,
        target,
        raw.attackDiscard
      );
    }

    // 8-3. conditional
    if (raw.conditional) {
      newState = applyConditionalEffect(newState, target, raw.conditional);
    }
  }

  // 9. 差分ログ（conditional は内側の then 効果で個別にログを出すため除外）
  const after = snapshotPlayer(newState, target);
  if (!raw || !raw.conditional) {
    newState = appendEffectDiffLog(newState, target, before, after);
  }

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
};

function snapshotPlayer(state: GameState, owner: ActivePlayer): PlayerSnapshot {
  const p = owner === "player" ? state.player : state.cpu;
  return {
    riceThisTurn: p.riceThisTurn ?? 0,
    knowledge: p.knowledge ?? 0,
    actions: p.turn?.actions ?? 0,
    buys: p.turn?.buys ?? 0,
    handCount: p.hand.length,
    discardCount: p.discard.length
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
 * conditional DSL の評価と then 効果の適用。
 * - 対応条件:
 *   - "totalKnowledge>=N"
 *   - "boughtVictoryThisTurn" / "boughtVictoryThisTurn>=N"
 * - それ以外の条件は「未対応」としてログを出してスキップする。
 */
function applyConditionalEffect(
  state: GameState,
  owner: ActivePlayer,
  conditional: any
): GameState {
  const expr = conditional?.if;
  const thenEffects = conditional?.then;

  if (!expr || !Array.isArray(thenEffects)) {
    return state;
  }

  const evalResult = evaluateCondition(state, owner, expr);

  if (evalResult === "unsupported") {
    return appendLog(
      state,
      owner,
      `条件付きの特殊効果（未対応）：${String(expr)}`
    );
  }

  if (!evalResult) {
    // 対応条件だが未達成の場合は何もしない（ログも最小限）
    return state;
  }

  // 条件達成：then 配列を Effect[] に変換して再帰的に適用
  const subEffects: Effect[] = convertConditionalThenToEffects(thenEffects);
  let next = appendLog(
    state,
    owner,
    `条件達成（${describeCondition(expr)}）→ 効果発動`
  );
  next = applyEffects(next, owner, subEffects);
  return next;
}

type ConditionEvalResult = boolean | "unsupported";

function evaluateCondition(
  state: GameState,
  owner: ActivePlayer,
  expr: string
): ConditionEvalResult {
  const player = owner === "player" ? state.player : state.cpu;

  // totalKnowledge>=N
  let m = expr.match(/^totalKnowledge>=(\d+)$/);
  if (m) {
    const threshold = parseInt(m[1], 10);
    return player.knowledge >= threshold;
  }

  // boughtVictoryThisTurn または boughtVictoryThisTurn>=N
  m = expr.match(/^boughtVictoryThisTurn(?:>=(\d+))?$/);
  if (m) {
    const threshold = m[1] ? parseInt(m[1], 10) : 1;
    const count = player.boughtVictoryThisTurn ?? 0;
    return count >= threshold;
  }

  // それ以外は今回対象外
  return "unsupported";
}

function describeCondition(expr: string): string {
  if (/^totalKnowledge>=(\d+)$/.test(expr)) {
    const n = RegExp.$1;
    return `知識${n}以上`;
  }
  if (/^boughtVictoryThisTurn(?:>=(\d+))?$/.test(expr)) {
    const n = RegExp.$1 || "1";
    return `このターンに勝利点カードを${n}枚以上購入`;
  }
  return expr;
}

/**
 * conditional.then の raw DSL を v1.5 Effect[] に簡易変換する。
 * - gainRice / gainKnowledge / draw / gainVP / trashSelf のみマップする。
 * - それ以外は raw だけ保持した Effect として返し、applyEffect 側で
 *   今回対象外の DSL は無視される。
 */
function convertConditionalThenToEffects(rawEffects: any[]): Effect[] {
  const result: Effect[] = [];

  for (const ef of rawEffects) {
    if (!ef || typeof ef !== "object") continue;

    const base: any = { raw: ef };

    if (typeof ef.gainRice === "number" && ef.gainRice !== 0) {
      base.addRice = ef.gainRice;
      result.push(base);
      continue;
    }

    if (typeof ef.gainKnowledge === "number" && ef.gainKnowledge !== 0) {
      base.addKnowledge = ef.gainKnowledge;
      result.push(base);
      continue;
    }

    if (typeof ef.draw === "number" && ef.draw > 0) {
      base.draw = ef.draw;
      result.push(base);
      continue;
    }

    if (typeof ef.gainVP === "number" && ef.gainVP !== 0) {
      base.addVictory = ef.gainVP;
      result.push(base);
      continue;
    }

    if (ef.trashSelf === true) {
      base.trashSelf = true;
      result.push(base);
      continue;
    }

    result.push(base as Effect);
  }

  return result;
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