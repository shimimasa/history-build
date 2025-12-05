// src/components/SupplyCardPile.tsx

import React from "react";
import type { Card } from "../logic/cardEffects";
import { renderTypeLabel } from "./shared";

interface SupplyCardPileProps {
  card: Card;
  remaining: number;
  canBuy: boolean;
  disabled: boolean;
  onBuy: () => void;
  onShowDetail: () => void;
}

const SupplyCardPile: React.FC<SupplyCardPileProps> = ({
  card,
  remaining,
  canBuy,
  disabled,
  onBuy,
  onShowDetail
}) => {
  const isDepleted = remaining <= 0;

  return (
    <button
      type="button"
      onClick={onShowDetail}
      className="text-left border border-slate-600 rounded-md p-2 flex flex-col justify-between bg-slate-900/70 transition-transform shadow-sm hover:-translate-y-1 hover:shadow-lg hover:border-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
    >
      <div>
        <div className="text-xs font-semibold mb-1">{card.name}</div>
        <div className="text-[10px] text-slate-300 mb-1">
          種類: {renderTypeLabel(card.type)}
        </div>
        <div className="text-[10px] text-slate-300 mb-1">
          コスト: 米 {card.cost}
        </div>
        <div className="text-[10px] text-slate-300 mb-1">
          知識条件: {card.requiredKnowledge ?? 0}
        </div>
        <div className="text-[10px] text-slate-400 line-clamp-3">
          {card.text}
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between text-[10px]">
        <span>のこり: {remaining}枚</span>
        <button
          type="button"
          className="px-2 py-1 rounded bg-indigo-600 disabled:bg-slate-700 disabled:opacity-60"
          onClick={(e) => {
            e.stopPropagation(); // カードクリック(onShowDetail)と分離
            onBuy();
          }}
          disabled={disabled || isDepleted || !canBuy}
        >
          買う
        </button>
      </div>
    </button>
  );
};

export default SupplyCardPile;


