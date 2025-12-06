// src/logic/cpuLogic.ts
// CPU が「どのカードをプレイするか」「どのカードを買うか」を決めるロジック（v2 GameState 対応）

import type {
  GameState,
  PlayerState,
  Card,
  CardType,
  Effect
} from "../game/gameState";
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
 * - cpu.knowledge >= card.knowledgeRequired
 *
 * スコアリング:
 * - type === "victory"              : base 100 + cost
 * - addKnowledge を持つカード       : base 80 + cost
 * - type === "resource"            : base 60 + cost
 * - それ以外                       : base 40 + cost
 *
 * 最もスコアが高い cardId を返す（候補がなければ null）。
 */
export function chooseCpuBuyCard(state: GameState): string | null {
  const cpu = getCpu(state);

  const candidates: { id: string; card: Card }[] = [];

  for (const [pileId, pile] of Object.entries(state.supply)) {
    if (!pile || pile.remaining <= 0) continue;

    const card = pile.card;
    const affordable =
      cpu.riceThisTurn >= card.cost &&
      cpu.knowledge >= card.knowledgeRequired;

    if (!affordable) continue;

    candidates.push({ id: pileId, card });
  }

  if (candidates.length === 0) {
    return null;
  }

  const scored = candidates.map(({ id, card }) => ({
    id,
    card,
    score: scoreBuyCandidate(card)
  }));

  scored.sort((a, b) => b.score - a.score);
  return scored[0].id;
}

/**
 * 購入候補カードのスコアリング（BUY フェーズ用）
 */
function scoreBuyCandidate(card: Card): number {
  const hasKnowledge = cardHasEffect(card, (e) => !!e.addKnowledge && e.addKnowledge > 0);

  let base = 40; // その他

  if (card.type === "victory") {
    base = 100;
  } else if (hasKnowledge) {
    base = 80;
  } else if (card.type === "resource") {
    base = 60;
  }

  return base + card.cost;
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