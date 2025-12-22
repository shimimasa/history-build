// src/ui/cardRole.ts
// カードの「役割」ラベルを決めるユーティリティ

import type { Card } from "../game/gameState";

type AnyCard = Card & {
  role?: string;
  cardType?: string;
  category?: string;
  cardTypeLabel?: string;
};

/**
 * カードの役割ラベルを決める。
 * - card.role があればそれを優先
 * - なければ type / cardType / category などから暫定ルールで導出
 */
export function getCardRoleLabel(card: AnyCard): string {
  // 1. 将来 cards.json / Card 型側に role が追加された場合はそれを優先
  if (card.role && typeof card.role === "string") {
    return card.role;
  }

  const rawType =
    (card.type ??
      (card as any).cardType ??
      (card as any).category ??
      card.cardTypeLabel ??
      "") as string;

  const t = rawType.toLowerCase();

  // 2. 暫定ルール（type ベース）
  if (t === "resource") {
    return "経済基盤";
  }
  if (t === "victory") {
    return "国家成果";
  }
  if (t === "person") {
    return "戦略（人物）";
  }
  if (t === "event") {
    return "転換点（出来事）";
  }
  if (t === "structure") {
    return "制度・都市";
  }

  // 文化・思想系（culture / religion / society / technology など）
  const cultureLike = [
    "culture",
    "religion",
    "society",
    "social",
    "ideology",
    "philosophy",
    "art",
    "literature",
    "technology",
    "science"
  ];
  if (cultureLike.includes(t)) {
    return "文化・思想";
  }

  // それ以外はひとまず「その他」
  return "その他";
}


