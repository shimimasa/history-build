import React, { useEffect, useMemo } from "react";
import type { Card } from "../game/gameState";
import { CardView } from "./CardView";

interface CardDetailModalProps {
  card: Card | null;
  isOpen: boolean;
  onClose: () => void;
    /** 購入ボタンを表示したいときに渡す */
  onBuy?: (cardId: string) => void;
  /** 購入可能なら true（フェーズ・資源・知識条件などは呼び出し側で判定） */
  canBuy?: boolean;
}

function getCardTypeLabel(card: any): string {
  const t = card?.type ?? card?.cardType ?? "";
  if (!t) return "";
  const map: Record<string, string> = {
    resource: "資源",
    person: "人物",
    event: "出来事",
    victory: "勝利点",
  };
  return map[t] ?? String(t);
}

function getRiceCost(card: any): number {
  const c = card?.cost;
  if (typeof c === "number") return c;
  return Number(c?.rice ?? 0);
}

function getKnowledgeReq(card: any): number | null {
  const k = card?.knowledgeRequired;
  if (typeof k === "number") return k;
  const c = card?.cost;
  if (typeof c === "object" && typeof c?.knowledge === "number") return c.knowledge;
  return null;
}

function getEffectText(card: any): string {
  return (
    card?.text ??
    card?.effect ??
    card?.description ??
    card?.conditionText ??
    "（説明テキストが未設定です）"
  );
}

export const CardDetailModal: React.FC<CardDetailModalProps> = ({
  card,
  isOpen,
  onClose,
  onBuy,
  canBuy = false,
}) => {
  const computed = useMemo(() => {
    if (!card) return null;
    const anyCard = card as any;
    return {
      typeLabel: getCardTypeLabel(anyCard),
      riceCost: getRiceCost(anyCard),
      knowledgeReq: getKnowledgeReq(anyCard),
      effectText: getEffectText(anyCard),
    };
  }, [card]);

  const handleBuyClick: React.MouseEventHandler<HTMLButtonElement> = (e) => {
    e.stopPropagation();
    if (!card || !onBuy || !canBuy) return;
    onBuy(card.id);
  };

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  if (!isOpen || !card || !computed) return null;

  return (
    <div className="hb-modal-overlay" onClick={onClose}>
      <div className="hb-modal" onClick={(e) => e.stopPropagation()}>
        <div className="hb-modal-header">
          <div className="hb-modal-title">{card.name}</div>
          <button className="hb-modal-close" onClick={onClose}>×</button>
        </div>

        <div className="hb-modal-body">
          <div className="hb-modal-card">
            <CardView card={card as any} variant="supply" />
          </div>

          <div className="hb-modal-info">
            <div className="hb-modal-meta">
              {computed.typeLabel && (
                <div className="hb-modal-meta-row">
                  <span>種別</span>
                  <span>{computed.typeLabel}</span>
                </div>
              )}
              <div className="hb-modal-meta-row">
                <span>米</span>
                <span>{computed.riceCost}</span>
              </div>
              <div className="hb-modal-meta-row">
                <span>知識</span>
                <span>{computed.knowledgeReq ?? "—"}</span>
              </div>
            </div>

            <div className="hb-modal-section">
              <div className="hb-modal-section-title">効果</div>
              <div className="hb-modal-section-body">
                {computed.effectText}
              </div>
            </div>
          </div>
        </div>

        {/* ★ ここが重要：フッター */}
        <div className="hb-modal-footer">
          {onBuy && (
            <button
              className="hb-btn hb-btn-primary"
              disabled={!canBuy}
              onClick={handleBuyClick}
            >
              購入する
            </button>
          )}
          <button className="hb-btn hb-btn-secondary" onClick={onClose}>
            とじる
          </button>
        </div>
      </div>
    </div>
  );
};