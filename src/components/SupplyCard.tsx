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
    // サプライの 1 山札。CardView にレイアウトを任せつつ、
    // ・残り枚数バッジ
    // ・「買う」ボタン
    // だけを小さくフッターに配置する。
    <button
      type="button"
      className={`hb-supply-card${
        isDisabled ? " hb-supply-card--disabled" : ""
      }`}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <CardView card={card} remaining={remaining} variant="supply">
        <div className="hb-supply-card-footer">
          {/* 残り枚数（テキストとしても表示。数値バッジは CardView 内の remaining バッジを使用） */}
          {typeof remaining === "number" && (
            <span className="hb-supply-remaining-text">残り {remaining}</span>
          )}

          {/* 購入ボタン：山札をクリックしたときと同じハンドラを使う */}
          <button
            type="button"
            className="hb-supply-buy-button"
            disabled={isDisabled}
            onClick={(e) => {
              e.stopPropagation();
              handleClick();
            }}
          >
            買う
          </button>
        </div>
      </CardView>
    </button>
  );
};
