import React, { useEffect, useMemo } from "react";
import type { Card } from "../game/gameState";
import { CardView } from "./CardView";

interface CardDetailModalProps {
  card: Card | null;
  isOpen: boolean;
  onClose: () => void;
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
    // 背景スクロールを止める
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  if (!isOpen || !card || !computed) return null;

  return (
    <div className="hb-modal-overlay" onClick={onClose} role="presentation">
      <div
        className="hb-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`${card.name} 詳細`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="hb-modal-header">
          <div className="hb-modal-title">{card.name}</div>
          <button
            type="button"
            className="hb-modal-close"
            onClick={onClose}
            aria-label="閉じる"
          >
            ×
          </button>
        </div>

        <div className="hb-modal-body">
          {/* 左：カード（大きすぎないように縦横を制限） */}
          <div className="hb-modal-card">
            <CardView card={card as any} variant="supply" />
          </div>

          {/* 右：情報（ここだけスクロール） */}
          <div className="hb-modal-info">
            <div className="hb-modal-meta">
              {computed.typeLabel && (
                <div className="hb-modal-meta-row">
                  <span className="hb-modal-meta-key">種別</span>
                  <span className="hb-modal-meta-val">{computed.typeLabel}</span>
                </div>
              )}
              <div className="hb-modal-meta-row">
                <span className="hb-modal-meta-key">米コスト</span>
                <span className="hb-modal-meta-val">米 {computed.riceCost}</span>
              </div>
              <div className="hb-modal-meta-row">
                <span className="hb-modal-meta-key">知識条件</span>
                <span className="hb-modal-meta-val">
                  {computed.knowledgeReq ?? "—"}
                </span>
              </div>
            </div>

            <div className="hb-modal-section">
              <div className="hb-modal-section-title">効果</div>
              <div className="hb-modal-section-body">{computed.effectText}</div>
            </div>
          </div>
        </div>

        <div className="hb-modal-footer">
          <button type="button" className="hb-modal-footer-btn" onClick={onClose}>
            とじる
          </button>
        </div>
      </div>
    </div>
  );
};