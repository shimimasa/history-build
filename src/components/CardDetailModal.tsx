import React, { useEffect, useMemo } from "react";
import type { Card } from "../game/gameState";
import { CardView } from "./CardView";

interface CardDetailModalProps {
  card: Card | null;
  isOpen: boolean;
  onClose: () => void;
  /** モーダル下部のメインボタン（購入 / プレイなど）。label が未指定ならボタン非表示 */
  primaryLabel?: string;
  /** primary ボタンが押下可能か。false のときは disabled＋理由表示 */
  primaryEnabled?: boolean;
  /** primaryEnabled が false のときに表示する理由 */
  primaryDisabledReason?: string | null;
  /** primary ボタン押下時に呼ばれる。引数には card.id が渡される */
  onPrimaryAction?: (cardId: string) => void;
}

// 種別 / コスト / 知識 / テキストのヘルパーはそのまま利用
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
  primaryLabel,
  primaryEnabled = true,
  primaryDisabledReason,
  onPrimaryAction,
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
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  if (!isOpen || !card || !computed) return null;

  const showPrimary = !!primaryLabel && typeof onPrimaryAction === "function";

  const handlePrimaryClick: React.MouseEventHandler<HTMLButtonElement> = (e) => {
    e.stopPropagation();
    if (!card || !onPrimaryAction || primaryEnabled === false) return;
    console.log("[CardDetailModal] primary action:", primaryLabel, "card:", card.id);
    onPrimaryAction(card.id);
  };

  return (
    <div className="hb-modal-overlay" onClick={onClose}>
      <div className="hb-modal" onClick={(e) => e.stopPropagation()}>
        <div className="hb-modal-header">
          <div className="hb-modal-title">{card.name}</div>
          <button className="hb-modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="hb-modal-body">
          <div className="hb-modal-card">
            <CardView card={card as any} variant="supply" />
          </div>

          <div className="hb-modal-info">
            <div className="hb-modal-meta">
              {computed.typeLabel && (
                <div className="hb-modal-meta-row">
                  <span className="hb-modal-meta-key">種別</span>
                  <span className="hb-modal-meta-val">{computed.typeLabel}</span>
                </div>
              )}
              <div className="hb-modal-meta-row">
                <span className="hb-modal-meta-key">米</span>
                <span className="hb-modal-meta-val">{computed.riceCost}</span>
              </div>
              <div className="hb-modal-meta-row">
                <span className="hb-modal-meta-key">知識</span>
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
          {showPrimary && (
            <div className="hb-modal-footer-main">
              <button
                className="hb-btn hb-btn-primary"
                disabled={primaryEnabled === false}
                onClick={handlePrimaryClick}
              >
                {primaryLabel}
              </button>
              {primaryEnabled === false && primaryDisabledReason && (
                <div className="hb-modal-disabled-reason">
                  {primaryDisabledReason}
                </div>
              )}
            </div>
          )}
          <button className="hb-btn hb-btn-secondary" onClick={onClose}>
            とじる
          </button>
        </div>
      </div>
    </div>
  );
};