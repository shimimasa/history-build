import React from "react";
import { CardView } from "./CardView";

export type SupplyCardVariant = "basic" | "kingdom";

export interface SupplyCardPileProps {
  pile: any; // { card, remaining }
  variant?: SupplyCardVariant;
  isDisabled?: boolean;
  isSelected?: boolean;
  /** BUYフェーズの視線誘導（buyable / not-buyable）。selected の方が優先される想定 */
  buyState?: "buyable" | "not-buyable";
  /** 買えない理由の最小バッジ（例: "米×" / "知識×"） */
  buyHintBadge?: string | null;
  /** BUYフェーズ用の簡略カードUI（イラスト優先） */
  uiMode?: "buy";
  onClick?: () => void;
  onHover?: (card: any | null) => void;
  // ★ BUY 成功直後の 600ms ハイライト用
  isFlashingBuy?: boolean;
}

export const SupplyCardPile: React.FC<SupplyCardPileProps> = ({
  pile,
  variant = "kingdom",
  isDisabled,
  isSelected,
  buyState,
  buyHintBadge,
  uiMode,
  onClick,
  onHover,
  isFlashingBuy,
}) => {
  const { card, remaining } = pile;
  const riceCost =
    (typeof card?.cost === "number" ? card.cost : card?.cost?.rice) ?? 0;
  const rawType: string = card?.type ?? card?.cardType ?? "";
  const typeChipClass = rawType ? `hb-supply-type-chip--${rawType}` : "hb-supply-type-chip--unknown";

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
      }${isSelected ? " hb-supply-card--selected" : ""}${
        isFlashingBuy ? " hb-flash-buy" : ""
      }${
        buyState ? ` hb-supply-card--${buyState}` : ""
      }${
        uiMode === "buy" ? " hb-supply-card--buy" : ""
      }`}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {typeof remaining === "number" && (
        <div className="hb-supply-remaining-badge">残り {remaining}</div>
      )}
      {!!buyHintBadge && !isSelected && uiMode !== "buy" && (
        <div className="hb-supply-buy-hint-badge" aria-label="購入不可のヒント">
          {buyHintBadge}
        </div>
      )}
      {uiMode === "buy" && (
        <>
          <div className="hb-supply-cost-overlay" aria-label="米コスト">
            米 {riceCost}
          </div>
          <div className={`hb-supply-type-chip ${typeChipClass}`} aria-label="種類色" />
        </>
      )}

      <div className="hb-card-frame">
        <CardView card={card} variant="supply" />
      </div>
    </button>
  );
};
