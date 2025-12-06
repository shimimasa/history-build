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
  const { winner, playerScore, cpuScore } = outcome;

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

        <div className="hb-result-actions flex flex-col gap-3 mt-4">
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