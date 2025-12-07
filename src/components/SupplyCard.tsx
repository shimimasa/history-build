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
    <div className="hb-supply-card">
      <CardView
        card={card}
        variant="supply"
        // カード本体クリックで詳細を開く
        onClick={onShowDetail}
        // 購入可能なときだけハイライト
        highlight={canBuy && !isDepleted && !disabled}
        disabled={false}
        supplyInfo={{
          remaining,
          canBuy,
          isDisabled,
          onBuy
        }}
      />
    </div>
  );
};

export default SupplyCardPile;