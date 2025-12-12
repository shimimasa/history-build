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
  onClose,
}) => {
  if (!isOpen || !card) return null;

  // ESC キーで閉じる
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
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

  // v1 / v1.5 両対応の安全な取り出し（cardの形が違っても落ちない）
  const anyCard = card as any;
  const cardType: string = anyCard.type ?? anyCard.cardType ?? "";

  const riceCost: number =
    (typeof anyCard.cost === "number"
      ? anyCard.cost
      : typeof anyCard.cost === "object"
        ? anyCard.cost?.rice ?? anyCard.cost?.amount ?? 0
        : 0) ?? 0;

  const knowledgeCost: number | undefined =
    typeof anyCard.knowledgeRequired === "number"
      ? anyCard.knowledgeRequired
      : typeof anyCard.cost === "object" && typeof anyCard.cost?.knowledge === "number"
        ? anyCard.cost.knowledge
        : undefined;

  const mainText: string | undefined =
    anyCard.text ?? anyCard.description ?? anyCard.effect ?? anyCard.conditionText;

  return (
    <div className="hb-card-modal-overlay" onClick={handleOverlayClick}>
      <div className="hb-card-modal" onClick={handleContentClick}>
        <div className="hb-card-modal-header">
          <h2 className="hb-card-modal-title">{card.name}</h2>
          <button type="button" className="hb-card-modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="hb-card-modal-body">
          <div className="hb-card-modal-grid">
            {/* 左：カード */}
            <div className="hb-card-modal-card-wrapper">
              <CardView card={card as any} variant="supply" />
            </div>

            {/* 右：説明 */}
            <div className="hb-card-modal-info">
              <div className="hb-card-modal-meta">
                {cardType && (
                  <div className="hb-card-modal-meta-row">
                    <span>種別：</span>
                    <span>{cardType}</span>
                  </div>
                )}
                <div className="hb-card-modal-meta-row">
                  <span>米コスト：</span>
                  <span>米 {riceCost}</span>
                </div>
               <div className="hb-card-modal-meta-row">
                  <span>知識条件：</span>
                  <span>{typeof knowledgeCost === "number" ? knowledgeCost : "—"}</span>
                </div>
              </div>

              <div className="hb-card-modal-section">
                <div className="hb-card-modal-section-title">効果</div>
                <p className="hb-card-modal-text">
                  {mainText ? mainText : "（説明テキストが未設定です）"}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="hb-card-modal-footer">
          <button type="button" className="hb-card-modal-footer-button" onClick={onClose}>
            とじる
          </button>
        </div>
      </div>
    </div>
  );
};
