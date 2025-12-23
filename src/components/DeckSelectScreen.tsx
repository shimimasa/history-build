// src/components/DeckSelectScreen.tsx
// デッキ選択画面。
// - DeckConfig の一覧から1つを選び onSelectDeck で親(App)に通知。
// - 「タイトルへ戻る」で Start 画面に戻る。

import React from "react";
import type { DeckConfig } from "../ui/uiTypes";
import type { EraId } from "../game/era";

const ERA_GROUPS: {
  id: string;
  title: string;
  description: string;
  eras: EraId[];
}[] = [
  {
    id: "jp",
    title: "日本史",
    description: "まずはここ（古代→明治）",
    eras: ["ancient", "medieval", "sengoku", "edo", "meiji"]
  },
  {
    id: "ancient_world",
    title: "古代世界",
    description: "地中海世界（ギリシア・ローマ）",
    eras: ["ancient_mediterranean"]
  },
  {
    id: "medieval_world",
    title: "中世世界",
    description: "地域ごとの文明圏",
    eras: ["medieval_europe", "islamic_world", "east_asia", "south_asia", "central_asia"]
  },
  {
    id: "modern_world",
    title: "近現代世界",
    description: "帝国主義→大戦→冷戦→グローバル化",
    eras: ["sub_saharan_africa", "north_america", "oceania", "modern_global"]
  }
];

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
  const grouped = ERA_GROUPS.map((g) => ({
    ...g,
    decks: decks.filter((d) => g.eras.includes(d.era))
  }));
  const groupedEraSet = new Set<EraId>(ERA_GROUPS.flatMap((g) => g.eras));
  const others = decks.filter((d) => !groupedEraSet.has(d.era));

  return (
    <div className="hb-deck-select-screen min-h-screen flex items-center justify-center bg-slate-900 text-slate-100">
      <div className="max-w-md w-full px-6 py-8 rounded-xl border border-slate-700 bg-slate-950/80 shadow-2xl">
        <h1 className="text-xl font-bold mb-3 text-center text-sky-200">
          デッキを選ぶ
        </h1>
        <p className="text-sm text-slate-200 mb-4 text-center">
          見出しから遊びたい時代のデッキを選んでください。
        </p>

        <div className="hb-deck-groups space-y-5 mb-4">
          {grouped.map((g) => {
            if (g.decks.length === 0) return null;
            return (
              <section key={g.id} className="hb-deck-group">
                <h2 className="text-sm font-bold text-sky-200 mb-1">
                  {g.title}
                </h2>
                <p className="text-[11px] text-slate-300 mb-2">{g.description}</p>
                <ul className="hb-deck-list space-y-3">
                  {g.decks.map((deck) => (
                    <li
                      key={deck.id}
                      className="hb-deck-item border border-slate-700 rounded-lg bg-slate-900/80 px-4 py-3"
                    >
                      <h3 className="text-sm font-semibold mb-1">{deck.name}</h3>
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
              </section>
            );
          })}

          {others.length > 0 ? (
            <section className="hb-deck-group">
              <h2 className="text-sm font-bold text-sky-200 mb-1">その他</h2>
              <p className="text-[11px] text-slate-300 mb-2">
                未分類のデッキ（今後追加される時代はこちら）
              </p>
              <ul className="hb-deck-list space-y-3">
                {others.map((deck) => (
                  <li
                    key={deck.id}
                    className="hb-deck-item border border-slate-700 rounded-lg bg-slate-900/80 px-4 py-3"
                  >
                    <h3 className="text-sm font-semibold mb-1">{deck.name}</h3>
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
            </section>
          ) : null}
        </div>

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