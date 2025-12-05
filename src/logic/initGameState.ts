// src/logic/initGameState.ts
// cards.json から v1 プロトタイプ用の初期 GameState を作成する

import cardsData from "../data/cards.json";
import type {
  Card,
  PlayerState,
  GameState
} from "./cardEffects";

//------------------------------------------------------
// サプライの在庫枚数設定（v1 戦国ミニデッキ用）
// ★ 別デッキや難易度ちがいを作りたいときは、まずここを調整する想定。
//   例）resource を多めにしてゲームをやさしくする、victory を少なめにして短期決戦にする など。
//------------------------------------------------------

const SUPPLY_COUNTS_BY_TYPE: Record<Card["type"], number> = {
  resource: 10,
  character: 8,
  event: 8,
  victory: 20
};

// スタートデッキの構成（カード ID と枚数）
// v1 では「農地のかい発」10枚スタート。
// 時代やデッキテーマを変えるときは、この配列を書き換えて別バリエーションを作る。
const STARTING_DECK_CONFIG: { cardId: string; count: number }[] = [
  { cardId: "SENGOKU_R1", count: 10 }
];

// 各プレイヤーのターン数上限
// god.md の仕様では「1人12ターン」で固定。
// v1.1 以降でゲーム時間を変えたいときは、この定数だけを変更すればよい。
const MAX_TURNS_PER_PLAYER = 12;

//------------------------------------------------------
// 公開関数：初期ゲーム状態を作成
//------------------------------------------------------

export function initGameState(): GameState {
  // cards.json から Card[] を構築
  const allCards: Card[] = (cardsData as Card[]).filter(
    (c) => c.era === "Sengoku"
  );

  // ID → Card のマップを作っておくといろいろ便利
  const cardMap: Record<string, Card> = {};
  for (const card of allCards) {
    cardMap[card.id] = card;
  }

  // サプライ初期化
  const supply = createInitialSupply(allCards);

  // プレイヤー状態初期化
  const player: PlayerState = createInitialPlayerState(cardMap);
  const cpu: PlayerState = createInitialPlayerState(cardMap);

  // 山札をシャッフル
  player.deck = shuffle(player.deck);
  cpu.deck = shuffle(cpu.deck);


  // スタートデッキの構成（カード ID と枚数）
// v1.5 戦国ミニデッキ：こめ袋（小）×7、村落×3 スタート。
const STARTING_DECK_CONFIG: { cardId: string; count: number }[] = [
  { cardId: "RICE_SMALL", count: 7 },
  { cardId: "VP_VILLAGE", count: 3 }
];

  const initialState: GameState = {
    player,
    cpu,
    currentTurn: "player",      // 先手はプレイヤー
    turnNumber: 1,              // 1ターン目スタート
    maxTurnsPerPlayer: MAX_TURNS_PER_PLAYER,
    supply,
    isGameOver: false,
    winner: null
  };

  return initialState;
}

//------------------------------------------------------
// サプライ初期化
//------------------------------------------------------

function createInitialSupply(allCards: Card[]): GameState["supply"] {
  const supply: GameState["supply"] = {};

  for (const card of allCards) {
    const baseCount = SUPPLY_COUNTS_BY_TYPE[card.type] ?? 10;
    supply[card.id] = {
      card,
      remaining: baseCount
    };
  }

  return supply;
}

//------------------------------------------------------
// プレイヤー状態初期化
//------------------------------------------------------

function createInitialPlayerState(cardMap: Record<string, Card>): PlayerState {
  const deck: Card[] = [];

  for (const entry of STARTING_DECK_CONFIG) {
    const baseCard = cardMap[entry.cardId];
    if (!baseCard) {
      console.warn(
        `[initGameState] STARTING_DECK_CONFIG に不明な cardId が指定されています: ${entry.cardId}`
      );
      continue;
    }

    for (let i = 0; i < entry.count; i++) {
      // Card 自体はイミュータブル想定なのでそのまま参照を詰めてよい
      deck.push(baseCard);
    }
  }

  const player: PlayerState = {
    deck,
    hand: [],
    discard: [],
    playArea: [],
    riceThisTurn: 0,
    knowledge: 0,
    victoryPointsBonus: 0,
    turnsTaken: 0,
    temporaryDiscounts: []
  };

  return player;
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
