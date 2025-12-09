// src/components/CardDexScreen.tsx
// カード図鑑画面。
// - cards.json（v2 Card）を読み込み、カード一覧を閲覧できる。
// - プレイには影響せず、閲覧専用。
// - 「タイトルへ戻る」で Start 画面に戻る。

import React from "react";
import type { Card } from "../game/gameState";
import { loadCards } from "../game/cardDefinitions";
import { CardView } from "./CardView";
import { CardDetailModal } from "./CardDetailModal";

interface CardDexScreenProps {
  onBackToTitle: () => void;
}

export const CardDexScreen: React.FC<CardDexScreenProps> = ({
  onBackToTitle
}) => {
  const cards = React.useMemo<Card[]>(() => {
    const all = loadCards();
    return [...all].sort((a, b) => {
      if (a.type !== b.type) {
        return a.type.localeCompare(b.type);
      }
      if (a.cost !== b.cost) {
        return a.cost - b.cost;
      }
      return a.name.localeCompare(b.name, "ja");
    });
  }, []);

  const [selectedCard, setSelectedCard] = React.useState<Card | null>(null);
  const [isDetailOpen, setIsDetailOpen] = React.useState(false);

  const handleOpenDetail = (card: Card) => {
    setSelectedCard(card);
    setIsDetailOpen(true);
  };

  const handleCloseDetail = () => {
    setIsDetailOpen(false);
  };

  return (
    <div className="hb-carddex min-h-screen flex flex-col bg-slate-900 text-slate-100">
      <header className="px-4 py-4 border-b border-slate-700 bg-slate-950/80">
        <h1 className="text-xl font-bold mb-1 text-sky-200">カード図鑑</h1>
        <p className="text-[12px] text-slate-300">
          このゲームに登場するカードの一覧です。種類・コスト・知識条件・効果を確認できます。
        </p>
      </header>

      <main className="flex-1 overflow-auto px-4 py-3">
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {cards.map((card) => (
            <article
              key={card.id}
              className="hb-carddex-item border border-slate-700 rounded-lg bg-slate-900/80 px-2 py-2 flex justify-center"
            >
              <CardView
                card={card}
                variant="supply"
                onHover={() => handleOpenDetail(card)}
              />
            </article>
          ))}
        </div>
      </main>

      <footer className="px-4 py-3 border-t border-slate-700 bg-slate-950/80">
        <button
          type="button"
          onClick={onBackToTitle}
          className="w-full px-4 py-2 rounded-full bg-slate-700 hover:bg-slate-600 text-slate-100 text-xs font-semibold"
        >
          タイトルへ戻る
        </button>
      </footer>

      <CardDetailModal
        card={selectedCard}
        isOpen={isDetailOpen}
        onClose={handleCloseDetail}
      />
    </div>
  );
};