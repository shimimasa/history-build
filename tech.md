技術仕様書（Technical Spec）

History Build – 戦国ミニデッキ v1

2-0. 技術スタック

言語：TypeScript

フロント：React + Vite

スタイリング：Tailwind CSS

状態管理：Zustand（またはシンプルな useReducer でもOK）

データ形式：cards.json（静的ファイル）

ビルド＆ホスティング：Vercel

開発補助：Cursor / GitHub

2-1. ディレクトリ構造（案）
/src
  /components
    Card.tsx
    HandArea.tsx
    CardPool.tsx
    ResourceBar.tsx
    DiscardPile.tsx
    DeckCounter.tsx
    CpuStatus.tsx
    TurnIndicator.tsx
  /screens
    TitleScreen.tsx
    GameScreen.tsx
    ResultScreen.tsx
  /logic
    gameState.ts      // 状態の型・初期化
    turnFlow.ts       // ターン進行処理
    cardEffects.ts    // 効果の解決ロジック
    cpuLogic.ts       // CPUの思考ルーチン
    shuffle.ts        // シャッフルなどのユーティリティ
  /data
    cards.json        // 全カード定義
  /types
    card.ts           // Card, Effect, Condition 型など
    game.ts           // GameState, PlayerState など

2-2. 型設計（card.ts / game.ts）
🔹 カード型
export type CardType = "resource" | "character" | "event" | "victory";

export type EffectName =
  | "addRice"
  | "addKnowledge"
  | "draw"
  | "discount"
  | "addVictory"
  | "trashFromHand"; // v1では最低限

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
  id: string;      // "SENGOKU_C1"
  era: string;     // "sengoku"
  name: string;    // "織田信長"
  type: CardType;
  cost: number;    // 購入コスト（米）
  effects: CardEffect[];
  text: string;    // ゲーム内表示テキスト
}

🔹 ゲーム状態型
export interface PlayerState {
  deck: Card[];
  hand: Card[];
  discard: Card[];
  playArea: Card[];
  riceThisTurn: number;
  knowledge: number;
  victoryPointsBonus: number; // endGame効果などの加算用
  turnsTaken: number;
}

export interface GameState {
  player: PlayerState;
  cpu: PlayerState;
  currentTurn: "player" | "cpu";
  turnNumber: number; // 両者共通のターンカウント
  maxTurnsPerPlayer: number; // v1は12
  supply: {
    [cardId: string]: {
      card: Card;
      remaining: number;
    };
  };
  isGameOver: boolean;
  winner: "player" | "cpu" | "draw" | null;
}

2-3. cards.json スキーマ（最終形）
[
  {
    "id": "SENGOKU_C1",
    "era": "sengoku",
    "name": "織田信長",
    "type": "character",
    "cost": 5,
    "effects": [
      {
        "trigger": "onPlay",
        "effect": "addRice",
        "value": 2
      },
      {
        "trigger": "onPlay",
        "condition": {
          "resource": "knowledge",
          "operator": ">=",
          "value": 3
        },
        "effect": "addRice",
        "value": 1
      }
    ],
    "text": "米が2ふえる。もし知識が3いじょうなら、米が1ふえる"
  }
]

🔹 スキーマの約束事

effects は配列。順番通りに処理する。

addRice：

riceThisTurn に value 分を加算

addKnowledge：

knowledge に value 分を加算（永続）

draw：

value 分カードを引く（デッキ切れ時は捨札シャッフル）

discount：

このターンの「購入コスト計算」に使う。
例：targetType: "character", value: 1 → 人物カードのコスト -1

addVictory：

victoryPointsBonus に加算（ゲーム終了時に合算）

2-4. ターン進行ロジック（turnFlow.ts）

擬似コードレベルで仕様を固定：

function startTurn(state: GameState): GameState {
  const current = state.currentTurn === "player" ? state.player : state.cpu;

  // 1. 必要なら手札をリセットして5枚引く
  if (current.hand.length === 0) {
    drawCards(current, 5);
  }

  // riceはターン開始時に0に
  current.riceThisTurn = 0;

  return state;
}

function endTurn(state: GameState): GameState {
  const current = state.currentTurn === "player" ? state.player : state.cpu;

  // プレイエリア + 手札 → 捨札
  moveAll(current.playArea, current.discard);
  moveAll(current.hand, current.discard);
  current.riceThisTurn = 0;
  current.turnsTaken += 1;

  // 次のプレイヤーにターン交代
  state.currentTurn = state.currentTurn === "player" ? "cpu" : "player";
  state.turnNumber += 1;

  // ゲーム終了判定
  if (current.turnsTaken >= state.maxTurnsPerPlayer &&
      (state.currentTurn === "player" ? state.player : state.cpu).turnsTaken >= state.maxTurnsPerPlayer) {
    state.isGameOver = true;
    state.winner = judgeWinner(state);
  }

  return state;
}

2-5. UI構成（最低限）

TitleScreen

ロゴ「History Build」

「ゲームスタート」ボタン

GameScreen

上部：CPUのデッキ枚数・捨札枚数・国力表示（概略）

中央：カード供給エリア（supply）

下部：

自分の手札（5枚）

資源バー（米 / 知識）

「資源をつかう」「人物/出来事をつかう」「カードを買う」「ターン終了」など

ResultScreen

プレイヤー国力 vs CPU国力

勝敗メッセージ

このゲームで登場した人物・出来事リスト（復習用）