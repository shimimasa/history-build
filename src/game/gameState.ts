// src/game/gameState.ts
// History Build v1.5 / history-spec v2 準拠の「公式モデル」定義

// ------------------------------------------------------
// カード関連の型
// ------------------------------------------------------
import type { Phase, TurnCounters } from "./core/types";
import type { EraId } from "./era";
import type { EffectDSL } from "./effects";


/**
 * Effect DSL（正規化済み）
 * - すべての cards.json の効果は normalizeEffects() 経由で EffectDSL に集約される
 * - applyEffect は EffectDSL のみを解釈する
 */
export type Effect = EffectDSL;

/**
 * カード定義（cards.json と対応）
 */
export interface EffectsMeta {
  rawCount?: number;
  normCount?: number;
  types?: string[];
  /** raw.effects の top-level keys（デバッグ用） */
  rawKeys?: string[];
}

export interface Card {
  id: string;
  name: string;
  type: "resource" | "victory" | "person" | "event";
  /** public/cards.json の category を保持（条件判定やデバッグ用） */
  category?: string;
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
  discountThisTurn: number;         // このターンに適用される割引合計（米）
  buysMadeThisTurn: number;         // このターンに行った購入回数
  boughtVictoryThisTurn: number;    // このターンに購入した勝利点カード枚数
  trashedThisTurn: number;          // このターンに廃棄した枚数
  attackDiscardedThisTurn: number;  // このターンに攻撃で相手に捨てさせた枚数（条件用）
  gainedKnowledgeThisTurn: number;  // このターンに獲得した知識量（将来拡張用）

  // conditional(if="playedPersonThisTurn") 用のフラグ
  playedPersonThisTurn: boolean;

  // 勝利点トークン（カード内訳スコアとは別に「効果で得たVP」を保持）
  vpTokens: number;

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

  // ★ 追加：廃棄置き場（trashFromHand の実体）
  trashPile: string[];

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
    discountThisTurn: 0,
    buysMadeThisTurn: 0,
    boughtVictoryThisTurn: 0,
    trashedThisTurn: 0,
    attackDiscardedThisTurn: 0,
    gainedKnowledgeThisTurn: 0,
    playedPersonThisTurn: false,
    vpTokens: 0,
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
    eventLog: [],
    trashPile: []
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