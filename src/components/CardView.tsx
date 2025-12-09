import React from "react";
import "../index.css";

type CardViewVariant = "supply" | "hand" | "play";

export interface CardViewProps {
  card: any;              // Card 型。ここでは any にしておく
  remaining?: number;
  variant?: CardViewVariant;
  onHover?: (card: any | null) => void;
}

export const CardView: React.FC<CardViewProps> = ({
  card,
  remaining,
  variant = "supply",
  onHover,
}) => {
  const isSupply = variant === "supply";

  const handleMouseEnter = () => onHover?.(card);
  const handleMouseLeave = () => onHover?.(null);

  const riceCost = card.cost?.rice ?? 0;
  const knowledgeCost = card.cost?.knowledge ?? 0;
  const typeLabel = card.cardTypeLabel ?? card.cardType ?? "";

  const imageUrl =
    card.image ||
    card.imageUrl ||
    "/images/cards/placeholder.webp"; // フォールバック

  return (
    <div
      className={`hb-card-view hb-card-view--${variant}${
        isSupply ? " hb-card-view--supply" : ""
      }`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* 上：イラスト部分 */}
      <div className="hb-card-view-image-wrapper">
        <img src={imageUrl} alt={card.name} className="hb-card-view-image" />
        {typeof remaining === "number" && (
          <div className="hb-card-view-remaining-badge">
            残り {remaining}
          </div>
        )}
      </div>

      {/* 下：名前＋種別＋コスト */}
      <div className="hb-card-view-footer">
        <div className="hb-card-view-title-row">
          <div className="hb-card-view-name">{card.name}</div>
          <div className="hb-card-view-type-pill">{typeLabel}</div>
        </div>
        <div className="hb-card-view-cost-row">
          <span className="hb-card-cost-pill">米 {riceCost}</span>
          {knowledgeCost > 0 && (
            <span className="hb-card-cost-pill hb-card-cost-pill--knowledge">
              知 {knowledgeCost}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
