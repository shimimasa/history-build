// src/components/SupplyCard.tsx

import React from "react";
import type { Card } from "../game/gameState";
import { CardView } from "./CardView";

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

  // 購入ボタンの無効条件（旧実装を踏襲）
  const isDisabled = disabled || isDepleted || !canBuy;

  return (
    <div
      className="relative hb-card text-left flex flex-col justify-between transition-transform hover:-translate-y-1 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 hb-supply-card"
      onClick={onShowDetail}
    >
      <span className="absolute -top-1 -right-1 px-2 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-100 border border-slate-500 shadow">
        残り {remaining}
      </span>

      <CardView
        card={card}
        // 詳細表示はカード全体クリック（div の onClick）で行うので、
        // CardView 自体には onClick を渡さない
        disabled={false}
        highlight={canBuy && !isDepleted && !disabled}
        showDetails={false}
      />

      <div className="mt-2 flex items-center justify-between text-[10px] hb-supply-card-footer px-1 pb-1">
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
            e.stopPropagation(); // 詳細表示のクリックとは分離
            onBuy();
          }}
          disabled={isDisabled}
        >
          買う
        </button>
      </div>
    </div>
  );
};

export default SupplyCardPile;