// src/logic/initGameState.ts
// public/cards.json を唯一のソースとした v2 GameState 初期化ラッパ
// - era / deckType / DeckConfig に基づいて、指定した時代のみのサプライを構築する

import type { Card, GameState } from "../game/gameState";
import {
  createInitialGameState,
  createInitialPlayerState
} from "../game/gameState";
import { loadCardRegistry, convertRawCardToGameCard } from "../game/cardRegistry";
import { BASE_CARDS } from "../game/baseCards";
import type { DeckConfig } from "../ui/uiTypes";

//------------------------------------------------------
// 公開 API
//------------------------------------------------------

/**
 * デフォルト設定（戦国基本デッキ）で GameState を生成する。
 * - era: "sengoku"
 * - deckType: "basic"
 */
export async function createDefaultGameState(): Promise<GameState> {
  return createGameStateFromDeck();
}

/**
 * DeckConfig をもとに初期 GameState を生成する（非同期）。
 *
 * - public/cards.json を読み込み、
 *   - deckConfig.era で指定された時代（なければ "sengoku"）のカードのみを抽出
 *   - v1.5 Card 型に変換し、BASE_CARDS と結合してサプライ用カード配列を作成
 * - createInitialGameState(cards) でサプライ / フェーズなどを構築
 * - player / cpu の初期デッキだけを deckConfig.initialDeck から作り直して差し替える
 */
export async function createGameStateFromDeck(
  deckConfig?: DeckConfig
): Promise<GameState> {
  const registry = await loadCardRegistry();

  const era = deckConfig?.era ?? "sengoku";
  const rawEraCards = registry.byEra[era] ?? [];

  // v1.5 Card へ変換し、汎用ベースカードを結合
  const eraCards: Card[] = rawEraCards.map(convertRawCardToGameCard);
  const allCards: Card[] = [...BASE_CARDS, ...eraCards];

  const base = createInitialGameState(allCards);

  // public/cards.json に supplyCount が定義されているカードがあれば、
  // その値で remaining を上書きする。
  const supplyCountOverride: Record<string, number> = {};
  for (const raw of rawEraCards) {
    if (typeof raw.supplyCount === "number") {
      supplyCountOverride[raw.id] = raw.supplyCount;
    }
  }

  const overriddenSupply =
    Object.keys(supplyCountOverride).length === 0
      ? base.supply
      : Object.fromEntries(
          Object.entries(base.supply).map(([id, pile]) => {
            const override = supplyCountOverride[id];
            if (override == null) return [id, pile];
            return [
              id,
              {
                ...pile,
                remaining: override
              }
            ];
          })
        );

  // DeckConfig が無ければ、createInitialGameState が作ったプレイヤー初期デッキをそのまま使う
  if (!deckConfig) {
    return {
      ...base,
      supply: overriddenSupply
    };
  }

  const player = createInitialPlayerState(deckConfig.initialDeck);
  const cpu = createInitialPlayerState(deckConfig.initialDeck);

  return {
    ...base,
    supply: overriddenSupply,
    player,
    cpu
  };
}

/**
 * 互換用エイリアス。
 * - 旧コードからの呼び出しを考慮しつつ、内部では createDefaultGameState() を利用する。
 */
export async function initGameState(): Promise<GameState> {
  return createDefaultGameState();
}