// src/components/DeckSelectScreen.tsx
// デッキ選択画面。
// - DeckConfig の一覧から1つを選び onSelectDeck で親(App)に通知。
// - 「タイトルへ戻る」で Start 画面に戻る。

import React from "react";
import type { DeckConfig } from "../ui/uiTypes";

type WorldEraCategory = "ancient" | "medieval" | "modern" | "other";

function isJapaneseEra(era: string): boolean {
  return (
    era === "ancient" ||
    era === "medieval" ||
    era === "sengoku" ||
    era === "edo" ||
    era === "meiji"
  );
}

function getWorldEraCategory(era: string): WorldEraCategory {
  // 例に沿った基本ルール（prefix/contains）＋必要最低限の例外対応
  if (era.startsWith("ancient_")) return "ancient";

  if (
    era.startsWith("medieval_") ||
    era === "islamic_world" ||
    era === "east_asia" ||
    era === "south_asia" ||
    era === "southeast_asia" ||
    era === "central_asia"
  ) {
    return "medieval";
  }

  if (
    era.startsWith("modern_") ||
    era.includes("global") ||
    era.startsWith("global_") ||
    era === "sub_saharan_africa" ||
    era === "north_america" ||
    era === "latin_america" ||
    era === "oceania"
  ) {
    return "modern";
  }

  return "other";
}

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
  const japanDecks = decks.filter((d) => isJapaneseEra(d.era));
  const worldDecks = decks.filter((d) => !isJapaneseEra(d.era));

  const worldAncient = worldDecks.filter(
    (d) => getWorldEraCategory(d.era) === "ancient"
  );
  const worldMedieval = worldDecks.filter(
    (d) => getWorldEraCategory(d.era) === "medieval"
  );
  const worldModern = worldDecks.filter(
    (d) => getWorldEraCategory(d.era) === "modern"
  );
  const worldOther = worldDecks.filter(
    (d) => getWorldEraCategory(d.era) === "other"
  );

  const renderDeckList = (list: DeckConfig[]) => (
    <ul className="hb-deck-list space-y-3">
      {list.map((deck) => (
        <li
          key={deck.id}
          className="hb-deck-item border border-slate-700 rounded-lg bg-slate-900/80 px-4 py-3"
        >
          <h3 className="text-sm font-semibold mb-1">{deck.name}</h3>
          <p className="text-[11px] text-slate-300 mb-2">{deck.description}</p>
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
  );

  return (
    <div className="hb-deck-select-screen h-screen overflow-y-auto bg-slate-900 text-slate-100">
      <div className="min-h-screen flex items-start justify-center px-0 py-10">
        <div className="max-w-md w-full px-6 py-8 rounded-xl border border-slate-700 bg-slate-950/80 shadow-2xl">
        <h1 className="text-xl font-bold mb-3 text-center text-sky-200">
          デッキを選ぶ
        </h1>
        <p className="text-sm text-slate-200 mb-4 text-center">
          日本史 / 世界史から遊びたいデッキを選んでください。
        </p>

        <div className="hb-deck-groups space-y-6 mb-4">
          {/* 日本史 */}
          <section className="hb-deck-group">
            <h2 className="text-base font-bold text-sky-200 mb-1">日本史</h2>
            <p className="text-[11px] text-slate-300 mb-2">
              まずはここ（古代→明治）
            </p>
            {renderDeckList(japanDecks)}
          </section>

          {/* 世界史 */}
          <section className="hb-deck-group">
            <h2 className="text-base font-bold text-sky-200 mb-1">世界史</h2>
            <p className="text-[11px] text-slate-300 mb-3">
              世界史デッキは時代ごとに折りたたみ表示できます。
            </p>

            <div className="space-y-3">
              <details open className="border border-slate-800 rounded-md bg-slate-950/40">
                <summary className="cursor-pointer select-none px-3 py-2 text-sm font-semibold text-slate-200">
                  古代世界
                </summary>
                <div className="px-3 pb-3">
                  <p className="text-[11px] text-slate-300 mb-2">
                    地中海世界（ギリシア・ローマ）
                  </p>
                  {renderDeckList(worldAncient)}
                </div>
              </details>

              <details open className="border border-slate-800 rounded-md bg-slate-950/40">
                <summary className="cursor-pointer select-none px-3 py-2 text-sm font-semibold text-slate-200">
                  中世世界
                </summary>
                <div className="px-3 pb-3">
                  <p className="text-[11px] text-slate-300 mb-2">
                    地域ごとの文明圏
                  </p>
                  {renderDeckList(worldMedieval)}
                </div>
              </details>

              <details open className="border border-slate-800 rounded-md bg-slate-950/40">
                <summary className="cursor-pointer select-none px-3 py-2 text-sm font-semibold text-slate-200">
                  近現代世界
                </summary>
                <div className="px-3 pb-3">
                  <p className="text-[11px] text-slate-300 mb-2">
                    帝国主義→大戦→冷戦→グローバル化
                  </p>
                  {renderDeckList(worldModern)}
                </div>
              </details>

              {worldOther.length > 0 ? (
                <details open className="border border-slate-800 rounded-md bg-slate-950/40">
                  <summary className="cursor-pointer select-none px-3 py-2 text-sm font-semibold text-slate-200">
                    その他
                  </summary>
                  <div className="px-3 pb-3">
                    <p className="text-[11px] text-slate-300 mb-2">
                      未分類の世界史デッキ（今後追加される時代はこちら）
                    </p>
                    {renderDeckList(worldOther)}
                  </div>
                </details>
              ) : null}
            </div>
          </section>
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
    </div>
  );
};