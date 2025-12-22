// src/game/gameState.ts
// History Build v1.5 / history-spec v2 準拠の「公式モデル」定義

// ------------------------------------------------------
// カード関連の型
// ------------------------------------------------------
import type { Phase, TurnCounters } from "./core/types";
import type { EraId } from "./cardRegistry";


/**
 * Effect DSL（history-spec v2）正規化済み表現
 * - すべての cards.json の効果はこの形に集約される（normalizeEffects 経由）
 */
export type ConditionKind =
  | "knowledgeAtLeast"
  | "buysMadeAtLeast"
  | "victoryBuysAtLeast"
  | "custom";

export interface ConditionDSL {
  kind: ConditionKind;
  /** knowledgeAtLeast / buysMadeAtLeast / victoryBuysAtLeast で使用するしきい値 */
  value?: number;
  /** custom 条件用の生文字列表現（デバッグ用途） */
  expr?: string;
}

export type Effect =
  | {
      type: "gain";
      riceDelta?: number;
      knowledgeDelta?: number;
      draw?: number;
      victoryDelta?: number;
      actionsDelta?: number;
      buysDelta?: number;
      raw?: any; // 元 DSL（cards.json 由来）
    }
  | {
      type: "trash";
      from?: "hand" | "played" | "discard";
      count: number;
      raw?: any;
    }
  | {
      type: "discount";
      amount: number;
      scope: "nextBuyThisTurn";
      raw?: any;
    }
  | {
      type: "attackDiscard";
      count: number;
      raw?: any;
    }
  | {
      type: "conditional";
      condition: ConditionDSL;
      then: Effect[];
      else?: Effect[];
      raw?: any;
    };

/**
 * カード定義（cards.json と対応）
 */
export interface EffectsMeta {
  rawCount?: number;
  normCount?: number;
  types?: string[];
}

export interface Card {
  id: string;
  name: string;
  type: "resource" | "victory" | "person" | "event";
  cost: number;
  knowledgeRequired: number;
  effects: Effect[];
  text: string;
  image?: string; // 任意: 指定があれば優先し、なければ id ベースで解決
  effectsMeta?: EffectsMeta; // normalize 前後の件数などメタ情報
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

  // 購入・割引・条件付き効果用のターン中カウンタ
  buyDiscountThisTurn: number;      // 次の購入 1 回に適用される割引合計（米）
  buysMadeThisTurn: number;         // このターンに行った購入回数
  boughtVictoryThisTurn: number;    // このターンに購入した勝利点カード枚数

  // ★ 追加：フェーズをまたいで保持されるターンカウンタ
  turn: TurnCounters;
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

  phase: Phase;
  activePlayer: ActivePlayer;
  turnCount: number;

  gameEnded: boolean;
  winner: ActivePlayer | "draw" | null;

  // ★ 追加：イベントログ
  eventLog: string[];

  // ★ 追加：ゲーム開始時に選択された時代とデッキ種別（UI 表示用 / 将来拡張用）
  era?: EraId;
  deckType?: "basic" | "challenge";
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
    turnsTaken: 0,
    buyDiscountThisTurn: 0,
    buysMadeThisTurn: 0,
    boughtVictoryThisTurn: 0,
    turn: {
      actions: 1,
      buys: 1,
      rice: 0,
      knowledge: 0
    }
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
    phase: "ACTION",
    activePlayer: "player",
    turnCount: 1,
    gameEnded: false,
    winner: null,
    eventLog: []
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