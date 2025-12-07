import React, { useState, useEffect } from "react";
import type { Card } from "../game/gameState";
import "../styles/CardView.css";
import { getCardImageUrl } from "../game/cardImages";

export type CardViewVariant = "supply" | "hand" | "dex" | "modal";

interface CardViewProps {
  card: Card;
  variant?: CardViewVariant;      // デフォルト: "supply"
  onClick?: () => void;
  disabled?: boolean;
  highlight?: boolean;
  showDetails?: boolean;          // いまは未使用（将来の拡張用）

  // --- サプライ専用フッター / 残り枚数 ---
  canBuy?: boolean;               // 「実際に買える」状態か（ボタン enable 条件）
  buyDisabledReason?: string;     // 買えないときのメッセージ
  onBuyClick?: () => void;        // 「買う」ボタンを押したとき
  showRemaining?: boolean;        // 残り枚数バッジを表示するか
  remainingCount?: number;        // 残り枚数
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
  variant = "supply",
  onClick,
  disabled = false,
  highlight = false,
  showDetails = false, // eslint 用ダミー
  canBuy,
  buyDisabledReason,
  onBuyClick,
  showRemaining,
  remainingCount
}) => {
  const [hasError, setHasError] = useState(false);

  // カードが変わったら画像読み込みエラー状態をリセット
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

  const isSupply = variant === "supply";
  const showRemainingBadge =
    isSupply && showRemaining && typeof remainingCount === "number";

  const remaining =
    typeof remainingCount === "number" ? remainingCount : undefined;
  const isDepleted = typeof remaining === "number" && remaining <= 0;

  // canBuy は「最終的にボタンを有効にしてよいか」を SupplyCard 側で計算して渡す前提
  const buyEnabled = isSupply && !!canBuy && !isDepleted;

  const statusText = !isSupply
    ? ""
    : isDepleted
    ? "在庫なし"
    : buyEnabled
    ? "購入できます"
    : buyDisabledReason ?? "条件不足（米 or 知識）";

  const handleBuyClick: React.MouseEventHandler<HTMLButtonElement> = (e) => {
    e.stopPropagation();
    if (!buyEnabled || !onBuyClick) return;
    onBuyClick();
  };

  return (
    <button
      type="button"
      className={className}
      onClick={handleClick}
      disabled={disabled}
    >
      <div className="hb-card-view-inner">
        {/* 実際のカード本体（1枚分） */}
        <div className="hb-card-frame">
          {/* サプライ用：残り枚数バッジ（カード左上） */}
          {showRemainingBadge && remaining !== undefined && (
            <div className="hb-card-view-remaining-badge">
              残り {remaining}
            </div>
          )}

          {/* イラスト領域（上部） */}
          <div className="hb-card-art-wrapper">
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

              {/* コストバッジ（イラスト右下） */}
              <div className="hb-card-view-cost">
                <span>米 {card.cost}</span>
              </div>
            </div>
          </div>

          {/* テキストエリア（下部） */}
          <div className="hb-card-body hb-card-view-body">
            {/* タイトル行：名前 + 種別バッジ */}
            <div className="hb-card-view-header">
              <span className="hb-card-view-name">{card.name}</span>
              <span className="hb-card-view-type">{typeLabel(card.type)}</span>
            </div>

            {/* サブ行：知識などメタ情報 */}
            <div className="hb-card-view-meta">
              <span>知識 {card.knowledgeRequired}</span>
            </div>

            {/* 効果テキスト概要（4行前後） */}
            {card.text && (
              <p className="hb-card-view-text">
                {card.text}
              </p>
            )}
          </div>

          {/* サプライ専用フッター：購入可否＋買うボタン */}
          {isSupply && (
            <div className="hb-card-view-footer">
              <span className="hb-card-view-footer-status">
                {statusText}
              </span>
              <button
                type="button"
                className="hb-card-view-footer-button"
                onClick={handleBuyClick}
                disabled={!buyEnabled}
              >
                買う
              </button>
            </div>
          )}
        </div>
      </div>
    </button>
  );
};

// TODO: v2.2 以降で rarity（レアリティ）やカードフレームの色分け、hover時のフレーバーテキスト表示などを追加する。