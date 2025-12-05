// src/logic/initGameState.ts
// cards.json から v1 戦国デッキの初期 GameState を作成する

import cardsData from "../data/cards.json";
import type { Card, PlayerState, GameState } from "./cardEffects";

//------------------------------------------------------
// 型
//------------------------------------------------------

export interface SupplyPile {
  card: Card;
  remaining: number;
}

export interface ExtendedGameState extends GameState {
  supply: Record<string, SupplyPile>;
}

//------------------------------------------------------
// スタートデッキ設定
// こめ袋（小）×7 ＋ 村落 ×3
//------------------------------------------------------

const STARTING_DECK_CONFIG: { cardId: string; count: number }[] = [
  { cardId: "RICE_SMALL", count: 7 },
  { cardId: "VP_VILLAGE", count: 3 },
];

//------------------------------------------------------
// プレイヤー初期化
//------------------------------------------------------

function createEmptyPlayer(): PlayerState {
  return {
    deck: [],
    hand: [],
    discard: [],
    playArea: [],
    riceThisTurn: 0,
    knowledge: 0,
    victoryPointsBonus: 0,
    turnsTaken: 0,
    hasPlayedActionThisTurn: false,
    hasBoughtThisTurn: false,
    temporaryDiscounts: [],
  };
}

function buildStartingDeck(
  cardMap: Record<string, Card>
): Card[] {
  const deck: Card[] = [];

  for (const { cardId, count } of STARTING_DECK_CONFIG) {
    const base = cardMap[cardId];
    if (!base) {
      console.warn(
        `[initGameState] 不明な cardId が STARTING_DECK_CONFIG に指定されています: ${cardId}`
      );
      continue;
    }
    for (let i = 0; i < count; i++) {
      deck.push(base);
    }
  }

  return deck;
}

//------------------------------------------------------
// サプライ初期化
//------------------------------------------------------

function getDefaultSupplyCount(card: Card): number {
  switch (card.type) {
    case "resource":
      return 10;
    case "victory":
      return 12;
    case "character":
      return 8;
    case "event":
    default:
      return 10;
  }
}

function createInitialSupply(
  allCards: Card[]
): Record<string, SupplyPile> {
  const supply: Record<string, SupplyPile> = {};

  for (const card of allCards) {
    supply[card.id] = {
      card,
      remaining: getDefaultSupplyCount(card),
    };
  }

  return supply;
}

//------------------------------------------------------
// 初期 GameState を作成
//------------------------------------------------------

export function initGameState(): ExtendedGameState {
  const allCards = cardsData as Card[];

  // id → Card のマップ
  const cardMap: Record<string, Card> = {};
  for (const card of allCards) {
    cardMap[card.id] = card;
  }

  // プレイヤー / CPU 初期化
  const player: PlayerState = createEmptyPlayer();
  const cpu: PlayerState = createEmptyPlayer();

  player.deck = shuffle(buildStartingDeck(cardMap));
  cpu.deck = shuffle(buildStartingDeck(cardMap));

  const supply = createInitialSupply(allCards);

  const baseState: ExtendedGameState = {
    player,
    cpu,
    currentTurn: "player",
    turnNumber: 1,
    maxTurnsPerPlayer: 12,
    isGameOver: false,
    supply,
    winner: null,
    };

  return baseState;
}

//------------------------------------------------------
// シャッフルユーティリティ
//------------------------------------------------------

function shuffle<T>(array: T[]): T[] {
  const a = [...array];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
