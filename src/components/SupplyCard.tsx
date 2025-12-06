// src/components/SupplyCardPile.tsx

import React from "react";
import type { Card } from "../game/gameState";
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

  // GameScreen 側の disabled ロジックを尊重しつつ、
  // ここでは在庫切れ or canBuy=false もあわせて無効化条件に含める。
  const isDisabled = disabled || isDepleted || !canBuy;

  return (
    <button
      type="button"
      onClick={onShowDetail}
      className="relative hb-card text-left flex flex-col justify-between transition-transform hover:-translate-y-1 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
    >
      {/* 残り枚数バッジ */}
      <span className="absolute -top-1 -right-1 px-2 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-100 border border-slate-500 shadow">
        残り {remaining}
      </span>

      <div className="pr-4">
        <div className="text-xs font-semibold mb-1">{card.name}</div>
        <div className="text-[10px] text-slate-300 mb-1">
          種類: {renderTypeLabel(card.type)}
        </div>
        <div className="text-[10px] text-slate-300 mb-1">
          コスト: 米 {card.cost}
        </div>
        <div className="text-[10px] text-slate-300 mb-1">
          知識条件: {card.knowledgeRequired}
        </div>
        <div className="text-[10px] text-slate-400 line-clamp-3">
          {card.text}
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between text-[10px]">
        <span className="text-slate-300">
          {isDepleted
            ? "在庫なし"
            : canBuy
            ? "購入できます"
            : "条件不足（米 or 知識）"}
        </span>
        <button
          type="button"
          className="px-2 py-1 rounded bg-indigo-600 disabled:bg-slate-700 disabled:opacity-60"
          onClick={(e) => {
            e.stopPropagation(); // カードクリック(onShowDetail)と分離
            onBuy();
          }}
          disabled={isDisabled}
        >
          買う
        </button>
      </div>
    </button>
  );
};

export default SupplyCardPile;