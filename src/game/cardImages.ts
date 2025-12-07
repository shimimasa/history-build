import type { Card } from "./gameState";

/**
 * カードイラストの URL を解決する。
 * - card.image があればそれを優先
 * - なければ id ベースのデフォルトパス `/assets/cards/<id>.webp` を返す
 */
export function getCardImageUrl(card: Card): string {
  if (card.image && card.image.trim().length > 0) {
    return card.image;
  }
  return `/assets/cards/${card.id}.webp`;
}
