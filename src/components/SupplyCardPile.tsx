// src/components/SupplyCardPile.tsx

import React from "react";
import type { Card } from "../logic/cardEffects";
import { renderTypeLabel } from "./shared";

interface SupplyCardPileProps {
  card: Card;
  remaining: number;
  riceThisTurn: number;
  disabled: boolean;
  onBuy: () => void;
  onShowDetail: () => void;
}

const SupplyCardPile: React.FC<SupplyCardPileProps> = ({
  card,
  remaining,
  riceThisTurn,
  disabled,
  onBuy,
  onShowDetail
}) => {
  const canAfford = riceThisTurn >= card.cost;
  const isDepleted = remaining <= 0;

  return (
    <div className="border border-slate-600 rounded-md p-2 flex flex-col justify-between bg-slate-900/70">
      <div>
        <div className="text-xs font-semibold mb-1">{card.name}</div>
        <div className="text-[10px] text-slate-300 mb-1">
          種類: {renderTypeLabel(card.type)}
        </div>
        <div className="text-[10px] text-slate-300 mb-1">
          コスト: 米 {card.cost}
        </div>
        <div className="text-[10px] text-slate-400 line-clamp-3">
          {card.text}
        </div>
        <button
          type="button"
          className="mt-1 text-[10px] text-sky-300 hover:text-sky-100 underline"
          onClick={onShowDetail}
        >
          くわしく
        </button>
      </div>
      <div className="mt-2 flex items-center justify-between text-[10px]">
        <span>のこり: {remaining}枚</span>
        <button
          className="px-2 py-1 rounded bg-indigo-600 disabled:bg-slate-700 disabled:opacity-60"
          onClick={onBuy}
          disabled={disabled || isDepleted || !canAfford}
        >
          買う
        </button>
      </div>
    </div>
  );
};

export default SupplyCardPile;


