import React, { useState, useEffect } from "react";
import type { Card } from "../game/gameState";
import "../styles/CardView.css";
import { getCardImageUrl } from "../game/cardImages";

interface CardViewProps {
  card: Card;
  onClick?: () => void;
  disabled?: boolean;
  highlight?: boolean;
  showDetails?: boolean;
}

const typeLabel = (type: Card["type"]) => {
  switch (type) {
    case "resource":
      return "資源";
    case "person":
      return "人物";
    case "event":
      return "出来事";
    case "victory":
      return "国力";
    default:
      return type;
  }
};

export const CardView: React.FC<CardViewProps> = ({
  card,
  onClick,
  disabled = false,
  highlight = false,
  showDetails = false
}) => {
  const [hasError, setHasError] = useState(false);

  // カードが変わったらエラーフラグをリセット
  useEffect(() => {
    setHasError(false);
  }, [card.id]);

  const handleClick = () => {
    if (disabled || !onClick) return;
    onClick();
  };

  const className = [
    "hb-card-view",
    highlight ? "hb-card-view--highlight" : "",
    disabled ? "hb-card-view--disabled" : ""
  ]
    .join(" ")
    .trim();

  const resolvedImageUrl = getCardImageUrl(card);

  return (
    <button
      type="button"
      className={className}
      onClick={handleClick}
      disabled={disabled}
    >
      <div className="hb-card-view-image-wrapper">
        {!hasError && resolvedImageUrl ? (
          <img
            src={resolvedImageUrl}
            alt={card.name}
            className="hb-card-view-image"
            onError={() => setHasError(true)}
          />
        ) : (
          <div className="hb-card-view-image-placeholder">
            <span>{card.name.slice(0, 2)}</span>
          </div>
        )}

        <div className="hb-card-view-cost">
          <span>米 {card.cost}</span>
        </div>
      </div>

      <div className="hb-card-view-body">
        <div className="hb-card-view-header">
          <span className="hb-card-view-name">{card.name}</span>
          <span className="hb-card-view-type">{typeLabel(card.type)}</span>
        </div>

        <div className="hb-card-view-meta">
          <span>知識 {card.knowledgeRequired}</span>
        </div>

        {showDetails && (
          <p className="hb-card-view-text">
            {card.text}
          </p>
        )}
      </div>
    </button>
  );
};

// TODO: v2.2 以降で rarity（レアリティ）やカードフレームの色分け、hover時のフレーバーテキスト表示などを追加する。