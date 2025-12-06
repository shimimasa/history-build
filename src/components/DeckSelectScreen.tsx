// src/components/DeckSelectScreen.tsx
// デッキ選択画面。
// - DeckConfig の一覧から1つを選び onSelectDeck で親(App)に通知。
// - 「タイトルへ戻る」で Start 画面に戻る。

import React from "react";
import type { DeckConfig } from "../ui/uiTypes";

interface DeckSelectScreenProps {
  decks: DeckConfig[];
  onSelectDeck: (deck: DeckConfig) => void;
  onBackToTitle: () => void;
}

export const DeckSelectScreen: React.FC<DeckSelectScreenProps> = ({
  decks,
  onSelectDeck,
  onBackToTitle
}) => {
  return (
    <div className="hb-deck-select-screen min-h-screen flex items-center justify-center bg-slate-900 text-slate-100">
      <div className="max-w-md w-full px-6 py-8 rounded-xl border border-slate-700 bg-slate-950/80 shadow-2xl">
        <h1 className="text-xl font-bold mb-3 text-center text-sky-200">
          デッキを選ぶ
        </h1>
        <p className="text-sm text-slate-200 mb-4 text-center">
          まずは使うデッキを選んでください。
          <br />
          （現時点では「戦国基本デッキ」のみ選択できます）
        </p>

        <ul className="hb-deck-list space-y-3 mb-4">
          {decks.map((deck) => (
            <li
              key={deck.id}
              className="hb-deck-item border border-slate-700 rounded-lg bg-slate-900/80 px-4 py-3"
            >
              <h2 className="text-sm font-semibold mb-1">{deck.name}</h2>
              <p className="text-[11px] text-slate-300 mb-2">
                {deck.description}
              </p>
              <button
                type="button"
                onClick={() => onSelectDeck(deck)}
                className="px-3 py-1 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow"
              >
                このデッキで遊ぶ
              </button>
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={onBackToTitle}
          className="w-full px-4 py-2 mt-2 rounded-full bg-slate-700 hover:bg-slate-600 text-slate-100 text-xs font-semibold"
        >
          タイトルへ戻る
        </button>
      </div>
    </div>
  );
};