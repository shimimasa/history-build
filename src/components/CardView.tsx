import React, { ReactNode } from "react";
import "../index.css";

type CardViewVariant = "supply" | "hand" | "play";

export interface CardViewProps {
  card: any; // Card 型（v1/v2 両対応）。ここでは any にしておく
  /**
   * サプライ山札の残り枚数（ある場合のみ、カード上部バッジとして表示）
   */
  remaining?: number;
  /**
   * 表示バリアント（サイズやレイアウト差分のみ、ロジックには影響しない）
   */
  variant?: CardViewVariant;
  /**
   * ホバー時にカード詳細を表示するためのコールバック
   */
  onHover?: (card: any | null) => void;
  /**
   * 追加の小さなフッターコンテンツ（例：残り枚数ラベル、ボタンなど）
   */
  children?: ReactNode;
  /**
   * 既存コンポーネント互換用。見た目の切り替えは外側のラッパーで行うのでここでは未使用。
   */
  highlight?: boolean;
  disabled?: boolean;
}

// 中央のカード表示コンポーネント。
// ・イラスト
// ・コストバッジ（米）
// ・カード名
// ・種別バッジ
// ・任意の小さなフッター children
// だけを担当し、長い効果テキストは描画しない。
export const CardView: React.FC<CardViewProps> = ({
  card,
  remaining,
  variant = "supply",
  onHover,
  children,
}) => {
  const handleMouseEnter = () => onHover?.(card);
  const handleMouseLeave = () => onHover?.(null);

  // v2: card.cost?.rice / card.cost?.knowledge
  // v1: card.cost (number), card.knowledgeRequired など
  const riceCost =
    (typeof card.cost === "number" ? card.cost : card.cost?.rice) ?? 0;
  const typeLabel = card.cardTypeLabel ?? card.cardType ?? card.type ?? "";

  const imageUrl =
    card.image ||
    card.imageUrl ||
    "/images/cards/placeholder.webp"; // フォールバック

  return (
    <div
      className={`hb-card hb-card--${variant}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="hb-card-image-wrapper">
        <img src={imageUrl} alt={card.name} className="hb-card-image" />

        {/* コスト：イラスト右下のバッジ */}
        <span className="hb-card-cost-badge">米 {riceCost}</span>

        {/* サプライの残り枚数バッジ（左上） */}
        {typeof remaining === "number" && (
          <span className="hb-card-remaining-badge">残り {remaining}</span>
        )}
      </div>

      <div className="hb-card-footer">
        <div className="hb-card-title-row">
          <span className="hb-card-name">{card.name}</span>
          {typeLabel && <span className="hb-card-type">{typeLabel}</span>}
        </div>

        {/* 追加の小さなフッター要素（残り枚数テキストやボタンなど） */}
        {children}
      </div>
    </div>
  );
};
