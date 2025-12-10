import React from "react";
import { CardView } from "./CardView";

export type SupplyCardVariant = "basic" | "kingdom";

export interface SupplyCardPileProps {
  pile: any; // { card, remaining }
  variant?: SupplyCardVariant;
  isDisabled?: boolean;
  onClick?: () => void;
  onHover?: (card: any | null) => void;
}

export const SupplyCardPile: React.FC<SupplyCardPileProps> = ({
  pile,
  variant = "kingdom",
  isDisabled,
  onClick,
  onHover,
}) => {
  const { card, remaining } = pile;

  const handleClick = () => {
    if (isDisabled) return;
    onClick?.();
  };

  const handleMouseEnter = () => onHover?.(card);
  const handleMouseLeave = () => onHover?.(null);

  return (
    <button
      type="button"
      className={`hb-supply-card hb-supply-card-${variant}${
        isDisabled ? " hb-supply-card--disabled" : ""
      }`}
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
