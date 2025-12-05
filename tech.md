# 技術仕様書（Technical Spec）  
History Build – 戦国ミニデッキ v1.5

---

## 2-0. 技術スタック

- 言語：TypeScript
- フロント：React + Vite
- スタイリング：Tailwind CSS
- 状態管理：Zustand（またはシンプルな useReducer でもOK）
- データ形式：`cards.json`（静的ファイル）
- ビルド＆ホスティング：Vercel
- 開発補助：Cursor / GitHub

---

## 2-1. ディレクトリ構造（案）

```text
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
  id: string;              // "CHR_NOBUNAGA"
  era: string;             // "Sengoku"
  name: string;            // "織田信長"
  type: CardType;
  cost: number;            // 購入コスト（米 + 知識）
  requiredKnowledge?: number; // 購入に必要な最低知識値（省略時は0扱い）
  effects: CardEffect[];
  text: string;            // ゲーム内表示テキスト
}

🔹 ゲーム状態型
export interface PlayerState {
  deck: Card[];
  hand: Card[];
  discard: Card[];
  playArea: Card[];
  riceThisTurn: number;       // このターンの米
  knowledge: number;          // 累積知識
  victoryPointsBonus: number; // endGame効果などの加算用
  turnsTaken: number;
}

export interface SupplyPile {
  card: Card;
  remaining: number;
}

export interface GameState {
  player: PlayerState;
  cpu: PlayerState;
  currentTurn: "player" | "cpu";
  turnNumber: number;           // 両者共通のターンカウント
  maxTurnsPerPlayer: number;    // v1.5 は 12
  supply: {
    [cardId: string]: SupplyPile;
  };
  isGameOver: boolean;
  winner: "player" | "cpu" | "draw" | null;
}

2-3. cards.json スキーマ（最終形 v1.5）
[
  {
    "id": "CHR_NOBUNAGA",
    "era": "Sengoku",
    "name": "織田信長",
    "type": "character",
    "cost": 5,
    "requiredKnowledge": 3,
    "effects": [
      {
        "trigger": "onPlay",
        "effect": "addRice",
        "value": 1
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
    "text": "米が1ふえる。もし知識が3いじょうなら、米がもう1ふえる。"
  }
]

🔹 スキーマの約束事

effects は配列。上から順に処理する。

addRice：

player.riceThisTurn に value 分を加算

addKnowledge：

player.knowledge に value 分を加算（永続）

draw：

value 分カードを引く（デッキ切れ時は捨札シャッフル）

discount：

このターンの「購入コスト計算」に使う。
例：targetType: "character", value: 1 → 人物カードの cost -1

addVictory：

player.victoryPointsBonus に加算（ゲーム終了時に国力合計へ加算）

trashFromHand：

手札から任意のカードを1枚選び、ゲームから除外する（捨札ではない）

2-4. ターン進行ロジック（turnFlow.ts）

擬似コードレベルで仕様を固定：

function startTurn(state: GameState): GameState {
  const current = state.currentTurn === "player" ? state.player : state.cpu;

  // 必要なら手札をリセットして5枚引く
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

  // 両者とも maxTurnsPerPlayer に達したらゲーム終了
  if (
    state.player.turnsTaken >= state.maxTurnsPerPlayer &&
    state.cpu.turnsTaken >= state.maxTurnsPerPlayer
  ) {
    state.isGameOver = true;
    state.winner = judgeWinner(state);
  }

  return state;
}

2-5. カード購入ロジック
🔹 プレイヤー・CPU共通の購入判定

canBuyCard(player: PlayerState, card: Card, discounts: DiscountState): boolean の仕様：

有効コストの計算

const effectiveCost = getEffectiveCostForPlayer(player, card, discounts);

割引効果（discount）を反映した最終コスト

プレイヤーの支払い可能リソース

const available = player.riceThisTurn + player.knowledge;

知識条件

const required = card.requiredKnowledge ?? 0;

購入可能条件

return available >= effectiveCost && player.knowledge >= required;

🔹 プレイヤー購入フロー

UIでサプライのカードをクリック → cardId が渡される

canBuyCard が true の場合のみ購入処理を実行

購入したカードは player.discard に追加

player.riceThisTurn は支払い後もリセットせずにそのまま（v1.5は簡略化のため「支払ったふり」のみでOKにしてもよいが、将来拡張を考えるなら引き算する実装も可）

🔹 CPU購入フロー

cpuLogic.ts 内で canBuyCard を使い、購入可能なカード一覧を作る

その中から「優先度の高いカード」を Early/Mid/Late 戦略に応じて選択し、1枚だけ購入する

2-6. UI構成（最低限）
TitleScreen

ロゴ「History Build」

「ゲームスタート」ボタン

GameScreen

上部：CPUのデッキ枚数・捨札枚数・概略の国力表示

中央：カード供給エリア（supply）

グリッド表示（資源 / 人物 / 出来事 / 国力 をまとめて表示）

下部：

自分の手札（5枚）

資源バー（米 / 知識）

「人物/出来事をつかう」「カードを買う」「ターン終了」など

ResultScreen

プレイヤー国力 vs CPU国力

勝敗メッセージ

このゲームで登場した人物・出来事リスト（復習用）

2-7. v1.5 実装スコープ

シングルプレイ（人間 vs CPU 1体）

戦国ミニデッキのみ対応

画面はシンプルな1画面構成（固定レイアウト）

モバイルでも最低限プレイ可能なレイアウト（タッチ操作対応は v2 以降）