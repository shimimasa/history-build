技術仕様書（Technical Spec）

History Build – 戦国ミニデッキ v1.5

2-0. 技術スタック

言語：TypeScript

フロントエンド：React + Vite

スタイリング：Tailwind CSS

状態管理：

小規模のため基本は useReducer または useState

将来的に拡張する場合は Zustand でラップしてもよい

データ形式：cards.json（静的ファイル／デッキごとに分割可）

ビルド＆ホスティング：Vercel

開発補助：Cursor / GitHub

※ ゲーム内ロジックの詳細な状態遷移は history-spec.md（エンジン仕様）を参照する。

2-1. ディレクトリ構成

v1.5 では、戦国ミニデッキ専用の最小構成とする。

src/
  game/
    cards.json            # 戦国ミニデッキのカード定義
    cardDefinitions.ts    # Card 型と cards.json ロード処理
    gameState.ts          # GameState / PlayerState 型定義と初期化
    turnFlow.ts           # ターン進行（DRAW → RESOURCE → ACTION → BUY → CLEANUP）
    applyEffect.ts        # Effect DSL の処理
    cpuLogic.ts           # CPU の意思決定ロジック
    score.ts              # 勝利点計算（必要に応じて）
  components/
    GameScreen.tsx        # ゲーム全体の画面
    PlayerBoard.tsx       # プレイヤー情報（人間 / CPU の共通UI）
    HandCard.tsx          # 手札カード表示
    SupplyCard.tsx        # サプライのカード表示
    PhaseControl.tsx      # フェーズ遷移ボタン（行動終了 / 購入終了など）
    LogArea.tsx           # ログ・メッセージ表示
  hooks/
    useGameEngine.ts      # GameState と UI をつなぐカスタムフック（任意）

public/
  # アイコン類・OGP 等（必要に応じて）

2-2. データモデル
2-2-1. カード型（Card）

cards.json を TypeScript 上で扱うための型定義。

export type CardType = "resource" | "person" | "event" | "victory";

export interface Effect {
  // DSL の各オペレーションは「1フィールドだけを持つオブジェクト」として表現
  addRice?: number;
  addKnowledge?: number;
  draw?: number;
  discard?: number;
  gain?: string;         // CardId
  trashSelf?: boolean;   // 自分を廃棄
  addVictory?: number;   // 勝利点をカードに付与（必要なら）
  // 今後 conditional や対象選択系を追加する余地を残す
}

export interface Card {
  id: string;                 // ユニークID（例: "rice_small"）
  name: string;               // 表示名（例: "こめ袋（小）"）
  type: CardType;
  cost: number;               // 米コスト
  knowledgeRequired: number;  // 購入に必要な知識（0 なら制限なし）
  effects: Effect[];          // 効果の配列（順番に適用）
  text: string;               // UI に表示する説明文
}


カードの効果は DSL（Effect）で統一し、
ベタ書きの if/else ではなく applyEffect() で解釈する。

デッキが増えた場合も、新しい cards-edo.json 等を同じ型で追加できる。

2-2-2. プレイヤー状態（PlayerState）
export interface PlayerState {
  deck: string[];      // 山札（CardId の配列）
  hand: string[];      // 手札
  discard: string[];   // 捨て札
  played: string[];    // このターンにプレイしたカード

  riceThisTurn: number;  // このターンに使用できる米
  knowledge: number;     // 累積知識（ゲームを通じて保持）
  turnsTaken: number;    // 行動したターン数（先手有利の調整などに使用可能）
}


※ actions や buys などの Dominion 的なカウンタは v1.5 では使用しない。
アクションは「1ターンに人物/出来事カード 1枚まで」というルールで固定する。

2-2-3. ゲーム状態（GameState）
export type ActivePlayer = "player" | "cpu";

export type TurnPhase =
  | "DRAW"
  | "RESOURCE"
  | "ACTION"
  | "BUY"
  | "CLEANUP";

export interface SupplyPile {
  card: Card;
  remaining: number;
}

export interface GameState {
  player: PlayerState;        // 人間プレイヤー
  cpu: PlayerState;           // CPUプレイヤー

  supply: Record<string, SupplyPile>;  // cardId → サプライ情報

  phase: TurnPhase;           // 現在のフェーズ
  activePlayer: ActivePlayer; // 現在の手番（player / cpu）
  turnCount: number;          // 人間のターン数（1ターン＝player+cpu のセットでもよい）

  gameEnded: boolean;
  winner: ActivePlayer | "draw" | null;
}


エンジン内部の状態遷移は必ず GameState を入力・出力とする純関数で扱う。

詳細なフェーズ挙動は history-spec.md のエンジン仕様に従う。

2-3. cards.json スキーマ
2-3-1. ファイル構造
[
  {
    "id": "rice_small",
    "name": "こめ袋（小）",
    "type": "resource",
    "cost": 0,
    "knowledgeRequired": 0,
    "effects": [
      { "addRice": 1 }
    ],
    "text": "米を1増やす。"
  },
  {
    "id": "village",
    "name": "村落",
    "type": "victory",
    "cost": 2,
    "knowledgeRequired": 0,
    "effects": [
      { "addVictory": 1 }
    ],
    "text": "ゲーム終了時、勝利点1。"
  }
  // ...
]

2-3-2. 読み込み処理（cardDefinitions.ts の責務）

cards.json を fetch もしくは import で読み込み、Card[] として扱う。

createInitialSupply() でサプライ（Record<string, SupplyPile>）を構築する。

export function createInitialSupply(cards: Card[]): Record<string, SupplyPile> {
  const supply: Record<string, SupplyPile> = {};

  for (const card of cards) {
    const initialCount = getInitialCount(card); // カード種別に応じた枚数
    supply[card.id] = {
      card,
      remaining: initialCount,
    };
  }

  return supply;
}


getInitialCount(card) は v1.5 ではハードコードでよい（将来は設定ファイル化）。

2-4. ゲームフロー（エンジン呼び出しレベル）
2-4-1. 初期化（gameState.ts）
export function createInitialPlayerState(deck: string[]): PlayerState {
  const shuffled = shuffle(deck);
  const { newDeck, drawn } = drawCards(shuffled, 5);

  return {
    deck: newDeck,
    hand: drawn,
    discard: [],
    played: [],
    riceThisTurn: 0,
    knowledge: 0,
    turnsTaken: 0,
  };
}

export function createInitialGameState(cards: Card[]): GameState {
  const initialDeck = [
    "rice_small",
    "rice_small",
    "rice_small",
    "rice_small",
    "rice_small",
    "rice_small",
    "rice_small",
    "village",
    "village",
    "village"
  ];

  const supply = createInitialSupply(cards);

  return {
    player: createInitialPlayerState(initialDeck),
    cpu: createInitialPlayerState(initialDeck),
    supply,
    phase: "DRAW",
    activePlayer: "player",
    turnCount: 1,
    gameEnded: false,
    winner: null,
  };
}

2-4-2. ターン進行（turnFlow.ts）

history-spec.md に定義された 5フェーズに対応する関数を用意する：

export function proceedPhase(state: GameState): GameState {
  switch (state.phase) {
    case "DRAW":
      return drawPhase(state);
    case "RESOURCE":
      return resourcePhase(state);
    case "ACTION":
      return actionPhase(state);
    case "BUY":
      return buyPhase(state);
    case "CLEANUP":
      return cleanupPhase(state);
  }
}

DRAW フェーズ

アクティブプレイヤーの手札が 5 枚になるまでドロー。

終了後、phase = "RESOURCE" に遷移。

RESOURCE フェーズ

手札の type = "resource" のカードをすべて自動プレイ。

applyEffect() で addRice を処理。

終了後、phase = "ACTION"。

ACTION フェーズ

人間の場合：UI から「どの人物/出来事カードを使うか」が指示される。

CPU の場合：cpuLogic.ts で 1枚選択する。

1枚プレイしたら effects を処理して phase = "BUY"。

行動しない場合も phase = "BUY" へスキップ。

BUY フェーズ

購入可能なカードのうち 1枚だけ購入可能。

人間：UI で選択された cardId を buyCard() に渡す。

CPU：cpuLogic.ts で候補を選択。

購入処理後、phase = "CLEANUP"。

CLEANUP フェーズ

手札・played を捨て札へ移動。

riceThisTurn = 0 にリセット。

アクティブプレイヤーの turnsTaken++。

activePlayer を player ↔ cpu で切り替え。

player に戻ったタイミングで turnCount++。

ゲーム終了条件をチェックし、続行なら phase = "DRAW" に戻る。

2-5. Effect 処理（applyEffect.ts）
2-5-1. 基本方針

Effect は 1つのオペレーションだけを持つオブジェクト

配列として順に適用する

export function applyEffects(
  state: GameState,
  target: ActivePlayer,
  effects: Effect[]
): GameState {
  return effects.reduce((s, effect) => applyEffect(s, target, effect), state);
}

function applyEffect(
  state: GameState,
  target: ActivePlayer,
  effect: Effect
): GameState {
  const player = target === "player" ? state.player : state.cpu;
  const updated = { ...state };

  if (effect.addRice) {
    player.riceThisTurn += effect.addRice;
  }
  if (effect.addKnowledge) {
    player.knowledge += effect.addKnowledge;
  }
  if (effect.draw) {
    // drawCards を用いて N枚ドロー
  }
  // ...必要なオペレーションを順次実装

  return updated;
}


UI から Effect を直接呼び出さない。
すべて turnFlow 経由で呼び出す。

2-6. CPU ロジック概要（cpuLogic.ts）
2-6-1. 行動フェーズ（ACTION）
export function chooseCpuActionCard(state: GameState): string | null {
  const cpu = state.cpu;
  // 手札から person / event を抽出
  const actionCardIds = cpu.hand.filter((id) => {
    const card = state.supply[id]?.card;
    return card && (card.type === "person" || card.type === "event");
  });

  if (actionCardIds.length === 0) return null;

  // シンプルな優先順位：知識が増えるカード → ドロー系
  // v1.5 はハードコードでOK
  return actionCardIds[0];
}

2-6-2. 購入フェーズ（BUY）
export function chooseCpuBuyCard(state: GameState): string | null {
  const cpu = state.cpu;

  const candidates = Object.values(state.supply)
    .filter(({ card, remaining }) => {
      return (
        remaining > 0 &&
        card.cost <= cpu.riceThisTurn &&
        cpu.knowledge >= card.knowledgeRequired
      );
    })
    .map(({ card }) => card);

  if (candidates.length === 0) return null;

  // 優先順位：victory > knowledge 系 > resource > その他
  candidates.sort((a, b) => {
    const score = (card: Card): number => {
      if (card.type === "victory") return 100 + card.cost;
      if (card.effects.some((e) => e.addKnowledge)) return 80 + card.cost;
      if (card.type === "resource") return 60 + card.cost;
      return card.cost;
    };
    return score(b) - score(a);
  });

  return candidates[0].id;
}

2-7. UI / コンポーネント構成
2-7-1. GameScreen.tsx

GameState を受け取り、全体レイアウトを構築。

主な構成要素：

上部：フェーズ表示 / 現在の米 / 知識 / ターン数

中央上：サプライ（SupplyCard の一覧）

中央下：人間プレイヤーの手札（HandCard の一覧）

左右：PlayerBoard（人間 / CPU の情報）

下部：PhaseControl（行動終了 / 購入終了ボタン）

右下：LogArea（ゲームログ）

2-7-2. PlayerBoard.tsx

プレイヤー名（人間 / CPU）

山札枚数 / 捨て札枚数 / 手札枚数

米・知識・獲得カード数などのサマリ

2-7-3. HandCard.tsx

カード名・種別・簡易効果説明

ACTION フェーズ中はクリックで「プレイ」イベントを発火

BUY フェーズ中はクリックしても何もしない（混乱防止）

2-7-4. SupplyCard.tsx

カード名・コスト・知識条件・残り枚数

BUY フェーズ中、購入可能ならボタンを有効化

購入不可の場合はボタン disabled + 視覚的にグレーアウト

2-7-5. PhaseControl.tsx

現在フェーズに応じてボタンを出し分け：

ACTION フェーズ：

「行動せずに進む」

BUY フェーズ：

「購入せずに進む」

ボタン押下で proceedPhase() を呼ぶ。

2-8. v1.5 実装スコープ

シングルプレイ（人間 vs CPU 1体）

戦国ミニデッキの cards.json のみ対応

ターン進行は 5フェーズ固定（DRAW → RESOURCE → ACTION → BUY → CLEANUP）

スマホでもプレイ可能なシンプルな1画面レイアウト

横スクロールなし

ボタンとカードのタップ領域を十分大きくする

演出（アニメーション・効果音など）は最小限（v2 以降で拡張）