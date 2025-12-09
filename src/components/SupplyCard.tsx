import React from "react";
import { CardView } from "./CardView";

export interface SupplyCardPileProps {
  pile: any; // { card, remaining } を想定
  isDisabled?: boolean;
  onClick?: () => void;
  onHover?: (card: any | null) => void;
}

export const SupplyCardPile: React.FC<SupplyCardPileProps> = ({
  pile,
  isDisabled,
  onClick,
  onHover,
}) => {
  const { card, remaining } = pile;

  const handleClick = () => {
    if (isDisabled) return;
    onClick?.();
  };

  const handleMouseEnter = () => {
    onHover?.(card);
  };

  const handleMouseLeave = () => {
    onHover?.(null);
  };

  return (
    <button
      type="button"
      className={`hb-supply-card${isDisabled ? " hb-supply-card--disabled" : ""}`}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <CardView card={card} remaining={remaining} variant="supply" />
    </button>
  );
};
