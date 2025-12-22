// src/logic/cpuLogic.ts
// CPU が「どのカードをプレイするか」「どのカードを買うか」を決めるロジック（v2 GameState 対応）

import type { GameState, PlayerState, Card, Effect } from "../game/gameState";
import { proceedPhase, actionPhase, buyPhase } from "../game/turnFlow";

//------------------------------------------------------
// ヘルパー
//------------------------------------------------------

function getCpu(state: GameState): PlayerState {
  return state.cpu;
}

function getCardFromId(state: GameState, cardId: string): Card | null {
  return state.supply[cardId]?.card ?? null;
}

function cardHasEffect(card: Card, predicate: (e: Effect) => boolean): boolean {
  return card.effects.some(predicate);
}

/**
 * カードの簡易的な「効果量」を集計するヘルパー。
 * - addRice / addKnowledge / draw / addVictory の合計値のみを見る。
 * - conditional など cards.json 側の高度な DSL は現行モデルでは反映していない。
 */
function summarizeEffects(card: Card): {
  rice: number;
  knowledge: number;
  draw: number;
  victory: number;
} {
  let rice = 0;
  let knowledge = 0;
  let draw = 0;
  let victory = 0;

  for (const ef of card.effects) {
    if (typeof ef.addRice === "number") {
      rice += ef.addRice;
    }
    if (typeof ef.addKnowledge === "number") {
      knowledge += ef.addKnowledge;
    }
    if (typeof ef.draw === "number") {
      draw += ef.draw;
    }
    if (typeof ef.addVictory === "number") {
      victory += ef.addVictory;
    }
  }

  return { rice, knowledge, draw, victory };
}

//------------------------------------------------------
// ゲーム進行度（early / mid / late）の簡易判定
//------------------------------------------------------

type GameStage = "early" | "mid" | "late";

function getGameStage(state: GameState): GameStage {
  const turn = state.turnCount ?? 1;

  // VP 山の残りをざっくりチェック
  const piles = Object.values(state.supply);
  const totalVpPiles = piles.filter((p) => p.card.type === "victory").length;
  const lowVpPiles = piles.filter(
    (p) => p.card.type === "victory" && p.remaining <= 4
  ).length;

  const vpNearlyDepleted = totalVpPiles > 0 && lowVpPiles / totalVpPiles >= 0.5;

  if (turn >= 15 || vpNearlyDepleted) {
    return "late";
  }
  if (turn >= 8) {
    return "mid";
  }
  return "early";
}

//------------------------------------------------------
// 行動フェーズ用：CPU が使う行動カードの選択
//------------------------------------------------------

/**
 * CPU が ACTION フェーズでプレイする「行動カード」（人物 or 出来事）を 1枚選ぶ。
 *
 * 優先度（高い順）:
 * - addKnowledge を持つカード
 * - draw を持つカード
 * - addRice を持つカード
 * - 同じ優先度なら cost が高いカード
 *
 * 手札から type === "person" | "event" の cardId を候補にし、
 * state.supply[cardId].card からカード情報を参照する。
 */
export function chooseCpuActionCard(state: GameState): string | null {
  const cpu = getCpu(state);
  const handIds = cpu.hand;

  const candidates: { id: string; card: Card }[] = [];

  for (const id of handIds) {
    const card = getCardFromId(state, id);
    if (!card) continue;
    if (card.type === "person" || card.type === "event") {
      candidates.push({ id, card });
    }
  }

  if (candidates.length === 0) {
    return null;
  }

  const scored = candidates.map(({ id, card }) => ({
    id,
    card,
    score: scoreActionCard(card)
  }));

  scored.sort((a, b) => b.score - a.score);
  return scored[0].id;
}

/**
 * 行動カードのスコアリング（ACTION フェーズ用）
 */
function scoreActionCard(card: Card): number {
  let score = 0;

  const hasKnowledge = cardHasEffect(card, (e) => !!e.addKnowledge && e.addKnowledge > 0);
  const hasDraw = cardHasEffect(card, (e) => !!e.draw && e.draw > 0);
  const hasRice = cardHasEffect(card, (e) => !!e.addRice && e.addRice > 0);

  if (hasKnowledge) score += 100;
  if (hasDraw) score += 60;
  if (hasRice) score += 40;

  score += card.cost; // 同スコア帯では高コスト優先

  return score;
}

//------------------------------------------------------
// 購入フェーズ用：CPU が買うカードの選択
//------------------------------------------------------

/**
 * CPU が BUY フェーズで購入するカードを 1枚決める。
 *
 * 候補条件:
 * - pile.remaining > 0
 * - cpu.riceThisTurn >= card.cost
 * - cpu.knowledge   >= card.knowledgeRequired
 *
 * スコアリング方針（時代非依存）:
 * - 早期: 資源 / ドロー / 知識カードをやや優先
 * - 中盤: バランス良く、勝利点カードも視野に入れる
 * - 終盤: 勝利点カードを強く優先する
 *
 * 同点の場合:
 * - cost が高いカードを優先（それでも同じなら配列順）
 *
 * 最もスコアが高い cardId を返す（候補がなければ null）。
 */
export function chooseCpuBuyCard(state: GameState): string | null {
  const cpu = getCpu(state);
  const stage = getGameStage(state);

  const candidates: { id: string; card: Card }[] = [];

  for (const [pileId, pile] of Object.entries(state.supply)) {
    if (!pile || pile.remaining <= 0) continue;

    const card = pile.card;
    const affordable =
      cpu.riceThisTurn >= card.cost &&
      cpu.knowledge >= card.knowledgeRequired;

    if (!affordable) continue;

    // 現仕様では resource / victory もサプライから購入対象に含める。
    candidates.push({ id: pileId, card });
  }

  if (candidates.length === 0) {
    return null;
  }

  const scored = candidates.map(({ id, card }) => {
    const score = scoreBuyCandidate(card, stage);
    return { id, card, score };
  });

  scored.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    // スコア同点時はコストの高いカードを優先
    return b.card.cost - a.card.cost;
  });

  return scored[0]?.id ?? null;
}

/**
 * 購入候補カードのスコアリング（BUY フェーズ用）
 */
function scoreBuyCandidate(card: Card, stage: GameStage): number {
  const { rice, knowledge, draw, victory } = summarizeEffects(card);

  const isResource = card.type === "resource";
  const isVictory = card.type === "victory";
  const isAction = card.type === "person" || card.type === "event";

  // タイプごとのベーススコア
  let base = 0;
  if (isVictory) {
    base = 30;
  } else if (isResource) {
    base = 20;
  } else if (isAction) {
    base = 25;
  } else {
    base = 10;
  }

  // ゲーム進行度ごとの重み
  let wRice = 0;
  let wDraw = 0;
  let wKnowledge = 0;
  let wVictory = 0;

  switch (stage) {
    case "early":
      wRice = 3.0;
      wDraw = 2.0;
      wKnowledge = 2.0;
      wVictory = 0.5;
      break;
    case "mid":
      wRice = 2.0;
      wDraw = 2.0;
      wKnowledge = 2.0;
      wVictory = 1.5;
      break;
    case "late":
      wRice = 1.0;
      wDraw = 1.5;
      wKnowledge = 1.0;
      wVictory = 3.0;
      break;
  }

  let score =
    base +
    wRice * rice +
    wDraw * draw +
    wKnowledge * knowledge +
    wVictory * victory;

  // 知識要求が高いカードは「買えるなら少しだけ加点」
  if (card.knowledgeRequired >= 2) {
    score += 2;
  } else if (card.knowledgeRequired === 1) {
    score += 1;
  }

  // あまりに安いカードは序盤以外では控えめに
  if (stage !== "early" && card.cost <= 2 && !isVictory) {
    score -= 3;
  }

  return score;
}

//------------------------------------------------------
// CPU ターン自動進行ユーティリティ（v2 フェーズマシン対応）
//------------------------------------------------------

/**
 * CPU 用：1ターンを完全自動で処理する。
 *
 * 前提:
 * - state.activePlayer === "cpu"
 *
 * ループ:
 * - phase === "DRAW"     → proceedPhase(state)
 * - phase === "RESOURCE" → proceedPhase(state)
 * - phase === "ACTION"   → chooseCpuActionCard → actionPhase(state, cardId)
 * - phase === "BUY"      → chooseCpuBuyCard    → buyPhase(state, cardId)
 * - phase === "CLEANUP"  → proceedPhase(state)
 *
 * ループ終了条件:
 * - state.gameEnded === true
 * - または state.activePlayer が "player" に戻ったタイミング
 */
export function runCpuTurn(state: GameState): GameState {
  let s = state;

  if (s.gameEnded || s.activePlayer !== "cpu") {
    return s;
  }

  while (!s.gameEnded && s.activePlayer === "cpu") {
    switch (s.phase) {
      case "DRAW":
      case "RESOURCE":
      case "CLEANUP": {
        s = proceedPhase(s);
        break;
      }
      case "ACTION": {
        const actionId = chooseCpuActionCard(s);
        s = actionPhase(s, actionId ?? undefined);
        break;
      }
      case "BUY": {
        const buyId = chooseCpuBuyCard(s);
        s = buyPhase(s, buyId ?? undefined);
        break;
      }
      default: {
        // 想定外のフェーズで止まらないよう、一応フェーズを1つ進める
        s = proceedPhase(s);
        break;
      }
    }
  }

  return s;
}

/**
 * GameContainer からの利用想定（例）
 *
 * // プレイヤーのフェーズ処理後に CPU に手番が移ったら：
 * //
 * // if (state.activePlayer === "cpu" && !state.gameEnded) {
 * //   state = runCpuTurn(state);
 * // }
 *
 * 実際には GameContainer.tsx 側で
 * - プレイヤー入力 → フェーズ処理（proceedPhase / actionPhase / buyPhase）
 * - activePlayer === "cpu" になったら runCpuTurn(state) を呼ぶ
 * といった流れで使用することを想定している。
 */