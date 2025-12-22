// src/game/cardDefinitions.ts
// public/cards.json ベースのカード定義ローダー
// - 実体のロードは cardRegistry 経由で行う

import type { Card } from "./gameState";
import { loadCardRegistry, convertRawCardToGameCard } from "./cardRegistry";
import { BASE_CARDS } from "./baseCards";

/**
 * ゲーム内で使用する全カード一覧を返す（非同期）。
 * - public/cards.json に定義されたカードを v1.5 Card 型に変換し、BASE_CARDS と結合して返す。
 */
export async function loadCards(): Promise<Card[]> {
  const registry = await loadCardRegistry();
  const converted = registry.all.map(convertRawCardToGameCard);
  return [...BASE_CARDS, ...converted];
}

/**
 * cardId → Card のマップを返すユーティリティ（非同期）。
 * - サプライ構築や CPU ロジックなど、頻繁に Card を引きたい箇所向け。
 */
export async function createCardMap(): Promise<Record<string, Card>> {
  const cards = await loadCards();
  const map: Record<string, Card> = {};
  for (const card of cards) {
    map[card.id] = card;
  }
  return map;
}


