import React from "react";
import { CardView } from "./CardView";

export type SupplyCardVariant = "basic" | "kingdom";

export interface SupplyCardPileProps {
  pile: any; // { card, remaining }
  variant?: SupplyCardVariant;
  isDisabled?: boolean;
  onClick?: () => void;
  onHover?: (card: any | null) => void;
  // ★ BUY 成功直後の 600ms ハイライト用
  isFlashingBuy?: boolean;
}

export const SupplyCardPile: React.FC<SupplyCardPileProps> = ({
  pile,
  variant = "kingdom",
  isDisabled,
  onClick,
  onHover,
  isFlashingBuy,
}) => {
  const { card, remaining } = pile;

  const isOutOfStock =
    typeof remaining === "number" && remaining <= 0;

  const handleClick = () => {
    // 在庫 0 のときだけクリック無効
    if (isOutOfStock) return;
    onClick?.();
  };

  const handleMouseEnter = () => onHover?.(card);
  const handleMouseLeave = () => onHover?.(null);

  return (
    <button
      type="button"
      // 在庫 0 のときだけ物理的に disabled
      disabled={isOutOfStock}
      className={`hb-supply-card hb-supply-card-${variant}${
        isDisabled || isOutOfStock ? " hb-supply-card--disabled" : ""
      }${isFlashingBuy ? " hb-flash-buy" : ""}`}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {typeof remaining === "number" && (
        <div className="hb-supply-remaining-badge">残り {remaining}</div>
      )}

      <div className="hb-card-frame">
        <CardView card={card} variant="supply" />
      </div>
    </button>
  );
};
