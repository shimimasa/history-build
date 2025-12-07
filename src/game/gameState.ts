// src/game/gameState.ts
// History Build v1.5 / history-spec v2 準拠の「公式モデル」定義

// ------------------------------------------------------
// カード関連の型
// ------------------------------------------------------

export type CardType = "resource" | "person" | "event" | "victory";

/**
 * Effect DSL（history-spec v2）
 * - 各オブジェクトは「1フィールドだけ」を持つのが原則
 * - 配列として順番に適用される
 */
export interface Effect {
  addRice?: number;
  addKnowledge?: number;
  draw?: number;
  discard?: number;
  gain?: string;        // CardId
  trashSelf?: boolean;
  addVictory?: number;  // 必要なら（勝利点は最終集計時に使用）
}

/**
 * カード定義（cards.json と対応）
 */
export interface Card {
  id: string;
  name: string;
  type: CardType;
  cost: number;
  knowledgeRequired: number;
  effects: Effect[];
  text: string;
  image: string;
}

// ------------------------------------------------------
// プレイヤー / ゲーム状態
// ------------------------------------------------------

/**
 * プレイヤー識別子
 */
export type ActivePlayer = "player" | "cpu";

/**
 * ターンフェーズ（5フェーズ固定）
 */
export type TurnPhase = "DRAW" | "RESOURCE" | "ACTION" | "BUY" | "CLEANUP";

/**
 * プレイヤー状態
 * - deck / hand / discard / played は CardId（string）の配列
 */
export interface PlayerState {
  deck: string[];
  hand: string[];
  discard: string[];
  played: string[];

  riceThisTurn: number; // このターンに使える米（CLEANUP で 0 にリセット）
  knowledge: number;    // 累積知識（ゲームを通じて保持）
  turnsTaken: number;   // 行動したターン数
}

/**
 * サプライ山札の1種類分
 */
export interface SupplyPile {
  card: Card;
  remaining: number;
}

/**
 * ゲーム全体の状態（唯一のソース・オブ・トゥルース）
 */
export interface GameState {
  player: PlayerState;
  cpu: PlayerState;

  supply: Record<string, SupplyPile>;

  phase: TurnPhase;
  activePlayer: ActivePlayer;
  turnCount: number;

  gameEnded: boolean;
  winner: ActivePlayer | "draw" | null;
}

// ------------------------------------------------------
// 初期化関数
// ------------------------------------------------------

/**
 * プレイヤー初期状態を作成する。
 * - 渡されたデッキ（CardId配列）をシャッフルし、5枚引いて手札にする。
 * - 捨て札・プレイ済みは空。
 * - riceThisTurn, knowledge, turnsTaken は 0 で開始。
 */
export function createInitialPlayerState(initialDeck: string[]): PlayerState {
  const shuffled = shuffle(initialDeck);
  const { newDeck, drawn } = drawCards(shuffled, 5);

  return {
    deck: newDeck,
    hand: drawn,
    discard: [],
    played: [],
    riceThisTurn: 0,
    knowledge: 0,
    turnsTaken: 0
  };
}

/**
 * ゲーム全体の初期状態を作成する。
 * - 初期デッキは「こめ袋（小）×7 ＋ 村落×3」
 *   （cards.json v2 の Card.id として "RICE_SMALL" / "VP_VILLAGE" を使用）。
 * - player / cpu ともに同じ初期デッキを使用する。
 * - phase = "DRAW"、activePlayer = "player"、turnCount = 1 から開始。
 * - サプライは cards 一覧から一括生成する。
 */
export function createInitialGameState(cards: Card[]): GameState {
  const initialDeck: string[] = [
    "RICE_SMALL",
    "RICE_SMALL",
    "RICE_SMALL",
    "RICE_SMALL",
    "RICE_SMALL",
    "RICE_SMALL",
    "RICE_SMALL",
    "VP_VILLAGE",
    "VP_VILLAGE",
    "VP_VILLAGE"
  ];

  const player = createInitialPlayerState(initialDeck);
  const cpu = createInitialPlayerState(initialDeck);
  const supply = createInitialSupply(cards);

  return {
    player,
    cpu,
    supply,
    phase: "DRAW",
    activePlayer: "player",
    turnCount: 1,
    gameEnded: false,
    winner: null
  };
}

// ------------------------------------------------------
// 内部ヘルパー
//  - 将来 cardDefinitions.ts 側に移す場合はここから抽出する
// ------------------------------------------------------

/**
 * サプライ初期化
 * - v1.5 ではカード種別ごとの固定枚数でよい（将来設定ファイル化可）。
 * - supply のキーは常に Card.id（cards.json の id）を使用する。
 */
function createInitialSupply(cards: Card[]): Record<string, SupplyPile> {
  const supply: Record<string, SupplyPile> = {};

  for (const card of cards) {
    supply[card.id] = {
      card,
      remaining: getInitialSupplyCount(card)
    };
  }

  return supply;
}

/**
 * 種別ごとのデフォルト供給枚数
 * - 値は v1.5 の簡易仕様（必要に応じて調整可能）
 *   TODO: バランス調整の際に、カードごと・デッキごとに設定ファイル化する。
 */
function getInitialSupplyCount(card: Card): number {
  switch (card.type) {
    case "resource":
      return 10;
    case "victory":
      return 12;
    case "person":
    case "event":
    default:
      return 10;
  }
}

/**
 * デッキから最大 count 枚ドローする。
 * - 山札不足時はあるだけ引く（初期化時点では捨て札が存在しないため、リシャッフルは不要）。
 */
function drawCards(deck: string[], count: number): { newDeck: string[]; drawn: string[] } {
  const newDeck = [...deck];
  const drawn: string[] = [];

  for (let i = 0; i < count && newDeck.length > 0; i++) {
    const cardId = newDeck.shift();
    if (cardId !== undefined) {
      drawn.push(cardId);
    }
  }

  return { newDeck, drawn };
}

/**
 * Fisher–Yates シャッフル
 */
function shuffle<T>(array: T[]): T[] {
  const a = [...array];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}