// src/game/score.ts
// 勝利点計算および勝者判定ロジック（history-spec v2 対応）

import type {
  GameState,
  ActivePlayer,
  Card,
  Effect
} from "./gameState";

export interface VictoryBreakdownEntry {
  cardId: string;
  cardName: string;
  count: number;
  pointsPerCard: number;
  totalPoints: number;
}

/**
 * 指定プレイヤーの総勝利点を計算する純粋関数。
 *
 * 対象:
 * - deck + hand + discard + played に含まれる全カードID
 * - 各カードの effects から addVictory を合計
 *
 * 注意:
 * - GameState は一切 mutate しない。
 * - state.supply に存在しない cardId はスキップする。
 */
export function computeVictoryPointsForPlayer(
  state: GameState,
  owner: ActivePlayer
): number {
  const player = owner === "player" ? state.player : state.cpu;

  const allIds: string[] = [
    ...player.deck,
    ...player.hand,
    ...player.discard,
    ...player.played
  ];

  let total = 0;

  for (const id of allIds) {
    const card: Card | undefined = state.supply[id]?.card;
    if (!card) continue;

    total += sumAddVictoryInCard(card);
  }

  return total;
}

/**
 * 単一カード内の addVictory 効果を合計する。
 */
function sumAddVictoryInCard(card: Card): number {
  let points = 0;

  for (const ef of card.effects) {
    points += getAddVictoryValue(ef);
  }

  return points;
}

/**
 * Effect から addVictory 分だけを取り出す。
 */
function getAddVictoryValue(effect: Effect): number {
  return effect.addVictory ?? 0;
}

/**
 * プレイヤーの勝利点内訳（カード別）を計算する。
 * - addVictory の合計が正のカードのみを対象とする（勝利点を持たないカードは除外）。
 */
export function computeVictoryBreakdownForPlayer(
  state: GameState,
  owner: ActivePlayer
): VictoryBreakdownEntry[] {
  const player = owner === "player" ? state.player : state.cpu;

  const allIds: string[] = [
    ...player.deck,
    ...player.hand,
    ...player.discard,
    ...player.played
  ];

  const counts: Record<string, number> = {};
  for (const id of allIds) {
    counts[id] = (counts[id] ?? 0) + 1;
  }

  const entries: VictoryBreakdownEntry[] = [];

  for (const [id, count] of Object.entries(counts)) {
    const card: Card | undefined = state.supply[id]?.card;
    if (!card) continue;

    const pointsPerCard = sumAddVictoryInCard(card);
    if (pointsPerCard <= 0) continue;

    const totalPoints = pointsPerCard * count;

    entries.push({
      cardId: id,
      cardName: card.name ?? id,
      count,
      pointsPerCard,
      totalPoints
    });
  }

  // 見やすさのために降順ソート（1枚あたりVP → 合計VP → 名前）
  entries.sort((a, b) => {
    if (b.pointsPerCard !== a.pointsPerCard) {
      return b.pointsPerCard - a.pointsPerCard;
    }
    if (b.totalPoints !== a.totalPoints) {
      return b.totalPoints - a.totalPoints;
    }
    return a.cardName.localeCompare(b.cardName, "ja");
  });

  return entries;
}

/**
 * プレイヤーと CPU の勝利点を比較して勝者を返す純粋関数。
 *
 * - playerPoints > cpuPoints → "player"
 * - playerPoints < cpuPoints → "cpu"
 * - 同点                      → "draw"
 *
 * state の winner / gameEnded は変更しない。
 */
export function judgeWinner(state: GameState): ActivePlayer | "draw" {
  const playerPoints = computeVictoryPointsForPlayer(state, "player");
  const cpuPoints = computeVictoryPointsForPlayer(state, "cpu");

  if (playerPoints > cpuPoints) return "player";
  if (cpuPoints > playerPoints) return "cpu";
  return "draw";
}

/**
 * 将来の拡張ポイント（メモ）:
 * - addVictory 以外に「条件付き勝利点」「カード枚数に応じたボーナス」などを導入する場合は、
 *   ここに専用のスコアリング関数（例: computeEndGameBonuses）を追加し、
 *   computeVictoryPointsForPlayer() から合算する構成に拡張する。
 */


