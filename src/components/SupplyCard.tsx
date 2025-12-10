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
    // サプライの 1 山札。
    // - CardView にカード本体（画像＋名前＋コスト＋タイプ）を描画させる
    // - 残り枚数バッジは外側ボタンにオーバーレイする
    // - クリック時の挙動は既存の onClick ハンドラを維持
    <button
      type="button"
      className={`hb-supply-card${
        isDisabled ? " hb-supply-card--disabled" : ""
      }`}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {typeof remaining === "number" && (
        <div className="hb-supply-remaining-badge">残り {remaining}</div>
      )}

      {/* カード本体は縦横比 2:3 のフレームに入れる */}
      <div className="hb-card-frame">
        <CardView card={card} variant="supply" />
      </div>
    </button>
  );
};
