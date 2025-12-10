import React from "react";
import "../index.css";
import { getCardImageUrl } from "../game/cardImages"; // ★ 追加

type CardViewVariant = "supply" | "hand";

// カード種別 → 日本語ラベル
const typeLabelMap: Record<string, string> = {
  resource: "資源",
  person: "人物",
  event: "出来事",
  victory: "勝利点",
};

export interface CardViewProps {
  // v2 Card 型を想定しつつ、互換性のため any としておく
  card: any;
  /**
   * 表示バリアント（サプライ or 手札）
   */
  variant?: CardViewVariant;
  /**
   * ホバー時にカード詳細を表示するためのコールバック
   */
  onHover?: (card: any | null) => void;
  /**
   * 既存コンポーネント互換用（HandCard から渡される）。見た目の切り替えはここでは行わない。
   */
  highlight?: boolean;
  disabled?: boolean;
}

// 中央のカード表示コンポーネント。
// - 画像
// - カード名
// - 米コスト
// - 種別バッジ（日本語）
// だけを担当し、長い効果テキストは描画しない。
export const CardView: React.FC<CardViewProps> = ({
  card,
  variant = "supply",
  onHover,
}) => {
  const handleMouseEnter = () => onHover?.(card);
  const handleMouseLeave = () => onHover?.(null);

  // v2: card.cost は number
  // v1 互換: card.cost.rice などがあればそちらを優先
  const riceCost =
    (typeof card.cost === "number" ? card.cost : card.cost?.rice) ?? 0;

  const rawType: string =
    card.type ?? card.cardType ?? card.cardTypeLabel ?? "";
  const typeLabel = typeLabelMap[rawType] ?? rawType ?? "";

  // 画像プロパティはいくつかパターンがある想定
  const imageSrcExplicit =
    card.image ||
    card.imageUrl ||
    card.imageURL ||
    card.cardImage ||
    (card.baseCard &&
      (card.baseCard.image || card.baseCard.imageUrl || card.baseCard.imageURL)) ||
    (card.definition &&
      (card.definition.image ||
        card.definition.imageUrl ||
        card.definition.imageURL)) ||
    (card.base &&
      (card.base.image || card.base.imageUrl || card.base.imageURL)) ||
    (card.cardDef &&
      (card.cardDef.image ||
        card.cardDef.imageUrl ||
        card.cardDef.imageURL)) ||
    undefined;

  // 明示的な画像がなければ、Card.id ベースの共通ヘルパーを使う
  const imageUrl =
    imageSrcExplicit || getCardImageUrl(card as any);

  return (
    <div
      className={`hb-card hb-card--${variant}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="hb-card-image-wrapper">
        {imageUrl && (
          <img
            src={imageUrl}
            alt={card.name}
            className="hb-card-image"
          />
        )}
      </div>

      <div className="hb-card-footer">
        <div className="hb-card-name-row">
          <span className="hb-card-name">{card.name}</span>
          <span className="hb-cost-badge">米 {riceCost}</span>
        </div>

        <div className="hb-card-type-row">
          {typeLabel && (
            <span className="hb-card-type-badge">{typeLabel}</span>
          )}
        </div>
      </div>
    </div>
  );
};
