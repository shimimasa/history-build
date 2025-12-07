import React, { useEffect } from "react";
import type { Card } from "../game/gameState";
import { CardView } from "./CardView";

interface CardDetailModalProps {
  card: Card | null;
  isOpen: boolean;
  onClose: () => void;
}

export const CardDetailModal: React.FC<CardDetailModalProps> = ({
  card,
  isOpen,
  onClose
}) => {
  if (!isOpen || !card) {
    return null;
  }

  // ESC キーで閉じる
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handleOverlayClick: React.MouseEventHandler<HTMLDivElement> = (e) => {
    e.stopPropagation();
    onClose();
  };

  const handleContentClick: React.MouseEventHandler<HTMLDivElement> = (e) => {
    e.stopPropagation();
  };

  return (
    <div className="hb-card-modal-overlay" onClick={handleOverlayClick}>
      <div className="hb-card-modal" onClick={handleContentClick}>
        <div className="hb-card-modal-header">
          <h2 className="hb-card-modal-title">{card.name}</h2>
          <button
            type="button"
            className="hb-card-modal-close"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div className="hb-card-modal-body">
          <div className="hb-card-modal-card-wrapper">
            <CardView card={card} disabled={true} showDetails={false} />
          </div>

          <div className="hb-card-modal-meta">
            <div className="hb-card-modal-meta-row">
              <span>米コスト：</span>
              <span>米 {card.cost}</span>
            </div>
            <div className="hb-card-modal-meta-row">
              <span>知識条件：</span>
              <span>{card.knowledgeRequired}</span>
            </div>
          </div>

          {card.text && (
            <div className="mt-3">
              <div className="text-[11px] font-semibold text-slate-200 mb-1">
                効果
              </div>
              <p className="text-[12px] text-slate-100 whitespace-pre-wrap">
                {card.text}
              </p>
            </div>
          )}
        </div>

        <div className="hb-card-modal-footer">
          <button
            type="button"
            className="hb-card-modal-footer-button"
            onClick={onClose}
          >
            とじる
          </button>
        </div>
      </div>
    </div>
  );
};
