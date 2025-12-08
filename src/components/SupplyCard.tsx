// src/components/SupplyCard.tsx

import React from "react";
import type { Card } from "../game/gameState";
import { CardView } from "./CardView";

interface SupplyCardPileProps {
  card: Card;
  remaining: number;
  canBuy: boolean; // 資源・知識条件だけを見た「買えるかどうか」
  disabled: boolean; // 手番・フェーズなど UI 上の制約
  onBuy: () => void;
  onShowDetail: () => void;
  compact?: boolean; // サプライ一覧用のコンパクト表示
}

const SupplyCardPile: React.FC<SupplyCardPileProps> = ({
  card,
  remaining,
  canBuy,
  disabled,
  onBuy,
  onShowDetail,
  compact
}) => {
  const isDepleted = remaining <= 0;

  // 実際にボタンを enable するかどうか（全条件込み）
  const buyEnabled = !disabled && !isDepleted && canBuy;

  let buyDisabledReason: string | undefined;
  if (isDepleted) {
    buyDisabledReason = "在庫なし";
  } else if (!canBuy) {
    buyDisabledReason = "条件不足（米 or 知識）";
  } else if (disabled) {
    buyDisabledReason = "今は購入できません";
  }

  const rootClass = compact ? "hb-supply-card-compact" : "hb-supply-card";

  return (
    <div className={rootClass}>
      <CardView
        card={card}
        variant="supply"
        // カード本体クリックで詳細を開く
        onClick={onShowDetail}
        // 購入可能なときだけハイライト
        highlight={buyEnabled}
        disabled={false}
        // サプライ専用情報
        canBuy={buyEnabled}
        buyDisabledReason={buyDisabledReason}
        onBuyClick={onBuy}
        showRemaining={true}
        remainingCount={remaining}
      />
    </div>
  );
};

export default SupplyCardPile;