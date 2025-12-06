// src/components/StartScreen.tsx

import React from "react";

interface StartScreenProps {
  onStartGame: () => void;
  onShowCardDex: () => void;
}

export const StartScreen: React.FC<StartScreenProps> = ({
  onStartGame,
  onShowCardDex
}) => {
  return (
    <div className="hb-start-screen min-h-screen flex items-center justify-center bg-slate-900 text-slate-100">
      <div className="max-w-md w-full px-6 py-8 rounded-xl border border-slate-700 bg-slate-950/80 shadow-2xl">
        <h1 className="text-2xl font-bold mb-3 text-center text-sky-200">
          History Build
        </h1>
        <p className="text-sm text-slate-200 mb-6 text-center">
          日本史カードで国力を競う、デッキ構築型カードゲーム。
          <br />
          米と知識を集めて、自分だけの戦国デッキを育てよう。
        </p>
        <div className="flex flex-col gap-3 mt-4">
          <button
            type="button"
            onClick={onStartGame}
            className="w-full px-4 py-2 rounded-full bg-sky-600 hover:bg-sky-500 text-white text-sm font-semibold shadow-md"
          >
            デッキを選んで遊ぶ
          </button>
          <button
            type="button"
            onClick={onShowCardDex}
            className="w-full px-4 py-2 rounded-full bg-slate-700 hover:bg-slate-600 text-slate-100 text-sm font-semibold"
          >
            カード図鑑を見る
          </button>
          <p className="text-[11px] text-slate-400 text-center">
            v1.5 戦国ミニデッキ（CPU 対戦）
          </p>
        </div>
        {/* TODO: 将来ここに「クイックスタート」「設定」などを追加 */}
      </div>
    </div>
  );
};