//------------------------------------------------------
// 型定義（プロジェクト全体の型と揃えていく想定）
//------------------------------------------------------

export type CardType = "resource" | "character" | "event" | "victory";

export type EffectName =
  | "addRice"
  | "addKnowledge"
  | "draw"
  | "discount"
  | "addVictory"
  | "trashFromHand"; // v1.5では最低限

export type Trigger = "onPlay" | "onBuy" | "endGame";

export type ConditionOperator = ">=" | "<=" | "==" | ">" | "<";

export interface EffectCondition {
  resource: "rice" | "knowledge";
  operator: ConditionOperator;
  value: number;
}

export interface CardEffect {
  trigger: Trigger;
  effect: EffectName;
  value?: number;
  targetType?: CardType;       // discount対象など
  condition?: EffectCondition; // 任意
}

export interface Card {
  id: string;               // "CHR_NOBUNAGA"
  era: string;              // "Sengoku"
  name: string;             // "織田信長"
  type: CardType;
  cost: number;             // 購入コスト（米 + 知識）
  requiredKnowledge?: number; // 購入に必要な最低知識値（省略時は0扱い）
  effects: CardEffect[];
  text: string;             // ゲーム内表示テキスト
}

export interface DiscountBuff {
  targetType: CardType;
  value: number;
}

export interface PlayerState {
  deck: Card[];
  hand: Card[];
  discard: Card[];
  playArea: Card[];
  riceThisTurn: number;
  knowledge: number;
  victoryPointsBonus: number; // endGame用ボーナス
  turnsTaken: number;
  // このターンだけ有効な割引情報
  temporaryDiscounts: DiscountBuff[];
}

export interface SupplyPile {
    card: Card;
    remaining: number;
  }
  
  export interface GameState {
    player: PlayerState;
    cpu: PlayerState;
    currentTurn: "player" | "cpu";
  
    // ここから追加
    turnNumber: number;                // 何ターン目か
    maxTurnsPerPlayer: number;         // 1人あたりのターン数上限（v1は12）
    supply: Record<string, SupplyPile>; // 場に出ているカードと残り枚数
  
    isGameOver: boolean;
    winner: "player" | "cpu" | "draw" | null;
  }

//------------------------------------------------------
// 共通：条件評価
//------------------------------------------------------

function evaluateCondition(player: PlayerState, condition?: EffectCondition): boolean {
  if (!condition) return true; // 条件がなければ常に発動

  const current =
    condition.resource === "rice"
      ? player.riceThisTurn
      : player.knowledge;

  switch (condition.operator) {
    case ">=":
      return current >= condition.value;
    case "<=":
      return current <= condition.value;
    case "==":
      return current === condition.value;
    case ">":
      return current > condition.value;
    case "<":
      return current < condition.value;
    default:
      return false;
  }
}

//------------------------------------------------------
// 共通：プレイヤーの参照ヘルパー
//------------------------------------------------------

function getCurrentPlayer(state: GameState, owner: "player" | "cpu"): PlayerState {
  return owner === "player" ? state.player : state.cpu;
}

//------------------------------------------------------
// 共通：ドロー処理（デッキ切れのシャッフル込み）
//------------------------------------------------------

function drawCards(player: PlayerState, count: number): void {
  for (let i = 0; i < count; i++) {
    if (player.deck.length === 0) {
      // デッキが空なら捨札をシャッフルして補充
      if (player.discard.length === 0) {
        return; // 引くものがない
      }
      reshuffleDiscardIntoDeck(player);
    }

    const card = player.deck.shift();
    if (card) {
      player.hand.push(card);
    }
  }
}

function reshuffleDiscardIntoDeck(player: PlayerState): void {
  player.deck = shuffle([...player.discard]);
  player.discard = [];
}

// 単純なシャッフル（Fisher-Yates）
function shuffle<T>(array: T[]): T[] {
  const a = [...array];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

//------------------------------------------------------
// メイン：カード効果の適用
//------------------------------------------------------

/**
 * カードをプレイしたときの効果をすべて適用する
 * - 資源カード / 人物カード / 出来事カード が対象
 */
export function applyOnPlayEffects(
  state: GameState,
  card: Card,
  owner: "player" | "cpu"
): GameState {
  const player = getCurrentPlayer(state, owner);

  for (const ef of card.effects) {
    if (ef.trigger !== "onPlay") continue;
    if (!evaluateCondition(player, ef.condition)) continue;

    applySingleEffectOnPlay(player, ef);
  }

  return state;
}

/**
 * カード購入時の効果（v1ではほぼ使わない想定だが、拡張用に用意）
 */
export function applyOnBuyEffects(
  state: GameState,
  card: Card,
  owner: "player" | "cpu"
): GameState {
  const player = getCurrentPlayer(state, owner);

  for (const ef of card.effects) {
    if (ef.trigger !== "onBuy") continue;
    if (!evaluateCondition(player, ef.condition)) continue;

    applySingleEffectOnBuy(player, ef);
  }

  return state;
}

/**
 * ゲーム終了時に評価される効果（国力カードなど）
 * - 全カード（手札・山札・捨札・プレイエリア）の effects を走査して呼ぶ想定
 */
export function applyEndGameEffects(
  state: GameState,
  card: Card,
  owner: "player" | "cpu"
): GameState {
  const player = getCurrentPlayer(state, owner);

  for (const ef of card.effects) {
    if (ef.trigger !== "endGame") continue;
    if (!evaluateCondition(player, ef.condition)) continue;

    applySingleEffectEndGame(player, ef);
  }

  return state;
}

//------------------------------------------------------
// 個別効果の実装（onPlay）
//------------------------------------------------------

function applySingleEffectOnPlay(player: PlayerState, ef: CardEffect): void {
  const value = ef.value ?? 0;

  switch (ef.effect) {
    case "addRice": {
      player.riceThisTurn += value;
      break;
    }
    case "addKnowledge": {
      player.knowledge += value;
      break;
    }
    case "draw": {
      drawCards(player, value);
      break;
    }
    case "discount": {
      if (!ef.targetType || !value) return;
      player.temporaryDiscounts.push({
        targetType: ef.targetType,
        value
      });
      break;
    }
    case "trashFromHand": {
      // v1 では「プレイヤー選択」ではなく
      // とりあえず手札の先頭を捨てる簡易版で実装しておく。
      // 後で UI から選択できるように拡張してもよい。
      if (player.hand.length === 0) return;
      const trashed = player.hand.shift();
      if (trashed) {
        // 完全除去：どこにも移さない（墓地などを用意するならそこへ）
        // ここでは何もしない＝GC
      }
      // その後 draw は呼び出し元（applyOnPlayEffects）で処理済み想定
      break;
    }
    case "addVictory": {
      // 「天下統一」など、プレイ時に即座に国力を増やすイベントがある場合用
      player.victoryPointsBonus += value;
      break;
    }
    default:
      // 未実装の effect は無視
      break;
  }
}

//------------------------------------------------------
// 個別効果の実装（onBuy）
//------------------------------------------------------

function applySingleEffectOnBuy(player: PlayerState, ef: CardEffect): void {
  const value = ef.value ?? 0;

  switch (ef.effect) {
    case "addRice": {
      player.riceThisTurn += value;
      break;
    }
    case "addKnowledge": {
      player.knowledge += value;
      break;
    }
    // v1 では onBuy 用の特殊効果は未使用だが、拡張に備えて残す
    default:
      break;
  }
}

//------------------------------------------------------
// 個別効果の実装（endGame）
//------------------------------------------------------

function applySingleEffectEndGame(player: PlayerState, ef: CardEffect): void {
  const value = ef.value ?? 0;

  switch (ef.effect) {
    case "addVictory": {
      player.victoryPointsBonus += value;
      break;
    }
    default:
      break;
  }
}


//------------------------------------------------------
// 購入コスト計算用のユーティリティ（割引の反映）
//------------------------------------------------------

export function getEffectiveCostForPlayer(
  player: PlayerState,
  card: Card
): number {
  let discountTotal = 0;

  for (const buff of player.temporaryDiscounts) {
    if (buff.targetType === card.type) {
      discountTotal += buff.value;
    }
  }

  const effective = Math.max(0, card.cost - discountTotal);
  return effective;
}

/**
 * プレイヤーが特定のカードを購入できるかどうかを判定する。
 * - 割引後コスト <= 米 + 知識
 * - 現在の知識 >= requiredKnowledge（未指定なら0）
 */
export function canBuyCard(player: PlayerState, card: Card): boolean {
  const effectiveCost = getEffectiveCostForPlayer(player, card);
  const available = player.riceThisTurn + player.knowledge;
  const required = card.requiredKnowledge ?? 0;

  return available >= effectiveCost && player.knowledge >= required;
}

/**
 * ターン終了時に呼び出して、割引バフをリセットする。
 * （turnFlow.ts の endTurn() から呼ぶ想定）
 */
export function clearTemporaryDiscounts(player: PlayerState): void {
  player.temporaryDiscounts = [];
}
