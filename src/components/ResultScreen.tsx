// src/components/ResultScreen.tsx

import React from "react";
import type { GameOutcome } from "../ui/uiTypes";

interface ResultScreenProps {
  outcome: GameOutcome;
  onRestart: () => void;
  onBackToTitle: () => void;
}

export const ResultScreen: React.FC<ResultScreenProps> = ({
  outcome,
  onRestart,
  onBackToTitle
}) => {
  const {
    winner,
    playerScore,
    cpuScore,
    playerBreakdown,
    cpuBreakdown
  } = outcome;

  const finalState = outcome.finalState;

  const eraLabelMap: Record<string, string> = {
    ancient: "古代",
    ancient_mediterranean: "古代地中海",
    medieval: "中世",
    medieval_europe: "中世ヨーロッパ",
    islamic_world: "イスラーム世界",
    east_asia: "東アジア",
    south_asia: "南アジア世界",
    southeast_asia: "東南アジア世界",
    central_asia: "中央アジア世界",
    sub_saharan_africa: "サハラ以南アフリカ",
    north_america: "北アメリカ",
    latin_america: "ラテンアメリカ",
    oceania: "オセアニア",
    modern_global: "近現代グローバル",
    sengoku: "戦国",
    edo: "江戸",
    meiji: "明治"
  };
  const eraKey: string = finalState.era ?? "sengoku";
  const eraLabel = eraLabelMap[eraKey] ?? String(eraKey);
  const deckTypeLabel =
    finalState.deckType === "challenge" ? "チャレンジ" : "基本";

  const piles = Object.values(finalState.supply ?? {});
  const emptyPileCount = piles.filter((p) => (p?.remaining ?? 0) <= 0).length;
  const emptyVictoryPileCount = piles.filter(
    (p) =>
      (p?.remaining ?? 0) <= 0 &&
      (p?.card?.type === "victory" || p?.card?.category === "victory")
  ).length;

  let endReason = "不明";
  if (emptyVictoryPileCount >= 2) {
    endReason = `A: 勝利点の空山が2つ以上（${emptyVictoryPileCount}/2）`;
  } else if (emptyPileCount >= 3) {
    endReason = `B: 空山が3つ以上（${emptyPileCount}/3）`;
  }

  let resultLabel: string;
  if (winner === "player") {
    resultLabel = "あなたの勝ち！";
  } else if (winner === "cpu") {
    resultLabel = "CPU の勝ち";
  } else {
    resultLabel = "引き分けでした";
  }

  return (
    <div className="hb-result-screen min-h-screen flex items-center justify-center bg-slate-900 text-slate-100">
      <div className="max-w-md w-full px-6 py-8 rounded-xl border border-slate-700 bg-slate-950/80 shadow-2xl">
        <h1 className="text-xl font-bold mb-3 text-center text-amber-200">
          対戦結果
        </h1>
        <p className="text-sm mb-4 text-center">{resultLabel}</p>

        <div className="mb-3 text-xs text-slate-300 flex justify-between">
          <span>
            デッキ: {eraLabel}（{deckTypeLabel}）
          </span>
          <span>ターン: {finalState.turnCount ?? 0}</span>
        </div>

        <div className="mb-4 border border-slate-700 rounded-lg bg-slate-900/80 px-4 py-3 text-xs text-slate-200">
          <div className="flex justify-between">
            <span className="text-slate-300">終了理由</span>
            <span>{endReason}</span>
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-slate-300">空山</span>
            <span>
              {emptyPileCount}/3（勝利点 {emptyVictoryPileCount}/2）
            </span>
          </div>
        </div>

        <div className="mb-4 border border-slate-700 rounded-lg bg-slate-900/80 px-4 py-3 text-sm">
          <div className="flex justify-between mb-1">
            <span>プレイヤー</span>
            <span className="font-semibold">{playerScore} 点</span>
          </div>
          <div className="flex justify-between">
            <span>CPU</span>
            <span className="font-semibold">{cpuScore} 点</span>
          </div>
        </div>

        {/* 勝利点内訳 */}
        <div className="space-y-4 text-xs">
          <section>
            <h2 className="font-semibold mb-1 text-sky-200">
              プレイヤーの勝利点内訳
            </h2>
            {playerBreakdown.length === 0 ? (
              <p className="text-slate-300">勝利点カードはありませんでした。</p>
            ) : (
              <ul className="space-y-1 text-slate-200">
                {playerBreakdown.map((e) => (
                  <li key={`p-${e.cardId}`} className="flex justify-between">
                    <span>
                      {e.cardName}：{e.count} 枚 × {e.pointsPerCard} ={" "}
                      {e.totalPoints}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-1 text-right text-slate-300">
              合計: <span className="font-semibold">{playerScore}</span> 点
            </p>
          </section>

          <section>
            <h2 className="font-semibold mb-1 text-sky-200">
              CPU の勝利点内訳
            </h2>
            {cpuBreakdown.length === 0 ? (
              <p className="text-slate-300">勝利点カードはありませんでした。</p>
            ) : (
              <ul className="space-y-1 text-slate-200">
                {cpuBreakdown.map((e) => (
                  <li key={`c-${e.cardId}`} className="flex justify-between">
                    <span>
                      {e.cardName}：{e.count} 枚 × {e.pointsPerCard} ={" "}
                      {e.totalPoints}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-1 text-right text-slate-300">
              合計: <span className="font-semibold">{cpuScore}</span> 点
            </p>
          </section>
        </div>

        <div className="hb-result-actions flex flex-col gap-3 mt-6">
          <button
            type="button"
            onClick={onRestart}
            className="w-full px-4 py-2 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold shadow-md"
          >
            もう一度対戦
          </button>
          <button
            type="button"
            onClick={onBackToTitle}
            className="w-full px-4 py-2 rounded-full bg-slate-700 hover:bg-slate-600 text-slate-100 text-sm font-semibold"
          >
            タイトルへ戻る
          </button>
        </div>

        {/* TODO: 将来ここに「このゲームで出たカード一覧」「学習用リンク」などを追加 */}
      </div>
    </div>
  );
};