---------------------------------------------------------
📘 History Build – エンジン仕様書 v2（最終版）
---------------------------------------------------------

この文書は History Build（戦国ミニデッキ v1.5）における
ゲーム内部ロジック・状態遷移・Effect DSL の取り扱い・CPU AI の意思決定
を厳密に定義する。

技術仕様（tech.md）およびゲームデザイン仕様（god.md）と整合しており、
ゲームエンジンとしての唯一の基準である。

Cursor がコードを自動生成する場合、
本書に記載されたルールは「絶対遵守」とする。

1. エンジン全体構造
1.1 ゲームループの主役：GameState

ゲームのすべての情報（プレイヤー状況、サプライ、フェーズ、ターン進行、勝敗判定など）を保持する。

GameState に対する操作は 純関数（Immutable） でなければならず、
UI 側で状態を直接 mutate してはならない。

1.2 データ駆動（Data-Driven）設計

すべてのカードは cards.json に定義され、
カード効果は Effect DSL（後述）に従う。

つまり、if (card.id === "…") のような カード別の個別ロジックは禁止。

新カード追加は cards.json を変更するだけでよい。

1.3 フェーズ制（5フェーズ固定）

ターンは以下のフェーズで進む：

① DRAW
② RESOURCE
③ ACTION
④ BUY
⑤ CLEANUP


この順序は固定であり、
途中スキップは存在するが順番が入れ替わることはない。

2. データモデルの定義

god.md・tech.md と完全一致している。

2.1 Card
interface Card {
  id: string;
  name: string;
  type: "resource" | "person" | "event" | "victory";
  cost: number;
  knowledgeRequired: number;
  effects: Effect[];     // Effect DSL の配列
  text: string;
}

2.2 Effect DSL

Effect は「1フィールドだけ持つオブジェクト」で構成される。

interface Effect {
  addRice?: number;
  addKnowledge?: number;
  draw?: number;
  discard?: number;
  gain?: string;        // CardId
  trashSelf?: boolean;
  addVictory?: number;  // 必要なら
}


Effect は配列として順番に適用される。

2.3 PlayerState
interface PlayerState {
  deck: string[];
  hand: string[];
  discard: string[];
  played: string[];

  riceThisTurn: number;    // ターン中の米（RESET at CLEANUP）
  knowledge: number;       // 累積値
  turnsTaken: number;
}

2.4 GameState
type TurnPhase = "DRAW" | "RESOURCE" | "ACTION" | "BUY" | "CLEANUP";
type ActivePlayer = "player" | "cpu";

interface GameState {
  player: PlayerState;
  cpu: PlayerState;

  supply: Record<string, SupplyPile>;

  phase: TurnPhase;
  activePlayer: ActivePlayer;
  turnCount: number;

  gameEnded: boolean;
  winner: ActivePlayer | "draw" | null;
}

3. ターン進行規則（最重要）

ターンは以下のように進む。
ここでは「アクティブプレイヤー」を AP と書く。

3.1 DRAW フェーズ
目的

手札を 5 枚にする。

詳細規則

AP の手札が 5 枚になるまで drawCards() でカードを引く。

山札が足りなければ捨て札をシャッフルして山札にする。

終了後：phase = "RESOURCE"

3.2 RESOURCE フェーズ
目的

資源カード（resource）を自動処理して米を増やす。

詳細規則

AP の手札から type = "resource" のカードをすべて取り出し、played へ移動。

そのカードの effects を順に適用する（通常は addRice）。

riceThisTurn が増加する。

終了後：phase = "ACTION"

制約

RESOURCE フェーズでは人物・イベントカードは自動プレイしない。

3.3 ACTION フェーズ
目的

AP は 人物 / 出来事カードを 1 枚だけ使うことができる。

詳細規則

AP が手札から「人物 or 出来事カード」を 1 枚指定してプレイする。

実行後は applyEffects() によって効果を処理する。

played に移動する。

何もしない選択も可能。

UI仕様

人間の場合：カードをクリック

CPU は cpuLogic.ts の chooseCpuActionCard() で選択

終了後：phase = "BUY"

3.4 BUY フェーズ
目的

カードを 1 枚だけ購入できる。

購入可能条件

riceThisTurn >= card.cost

AP.knowledge >= card.knowledgeRequired

supply[card.id].remaining > 0

購入処理
riceThisTurn -= card.cost
AP.discard.push(card.id)
supply[card.id].remaining -= 1

CPU の購入は chooseCpuBuyCard() が決定する。

終了後：phase = "CLEANUP"

3.5 CLEANUP フェーズ
目的

ターンを終了し、状態を初期化して次のプレイヤーに渡す。

詳細規則

手札 → 捨て札

played → 捨て札

riceThisTurn = 0

AP.turnsTaken++

手番交代
activePlayer = activePlayer === "player" ? "cpu" : "player"

ターン数

activePlayer が player に戻ったタイミングで turnCount++

ゲーム終了判定

サプライ枯渇 or ターン数上限

勝者：勝利点合計で決定

終了後：phase = "DRAW"（次ターン開始）

4. Effect 処理（applyEffect）
4.1 実装原則

each effect must be processed purely（元の state は変更しない）

return value は 新しい GameState

効果処理の標準形
applyEffects(state, player, effects) {
  let s = state;
  for (const e of effects) {
    s = applyEffect(s, player, e);
  }
  return s;
}

4.2 各 Effect の意味
addRice
AP.riceThisTurn += amount

addKnowledge
AP.knowledge += amount

draw
for N times:
  if deck empty → reshuffle
  draw 1 card → AP.hand

discard
AP.handからN枚を選びAP.discardへ
（UIが選択をサポート。CPU は自動）

gain
AP.discard.push(cardId)

trashSelf

played から該当カードを除去する。
捨て札に入らない。

addVictory

勝利点は GameState に累積しない。
勝利判定時に deck + discard + played から集計する。

5. CPU ロジック（AI Specification）
5.1 ACTION フェーズ

優先度：

知識が増える person/event

米が増える person/event

ドロー系

その他の行動

AI は「1枚だけ使える」ことを踏まえ、
最も期待値の高いカード 1 枚を選ぶ。

5.2 BUY フェーズ

優先度：

victory カード

knowledge 系のカード

resource カード

person / event（コスト高い順）

購入条件を満たす候補から「優先スコア最大」のカードを買う。

6. ゲーム終了と勝利判定

終了条件：

サプライの主要カードが枯れる

または turnCount が上限に到達

勝利点の計算：

player, cpu の所持カード（deck + discard）から
すべての victory カードの effects.addVictory を集計する。

多い方が勝ち。

同点なら "draw"。

7. 禁止事項（Cursor に対して厳密化）

GameState を直接 mutate してはならない。

UI コンポーネント内でゲームロジックを記述してはならない。

ロジックは必ず turnFlow / applyEffect に置く。

カードごとに if/else を書くのは禁止。

必ず Effect DSL を処理する。

フェーズを飛ばすロジックは禁止（正しくスキップは可）。

CPU ロジックが人間専用の処理を参照するのは禁止。

8. 実装ファイルの責務（tech.md と一致）
ファイル	責務
gameState.ts	GameState の型定義・初期化
turnFlow.ts	フェーズ遷移の純関数
applyEffect.ts	Effect DSL の実行
cpuLogic.ts	CPU の ACTION / BUY 意思決定
cardDefinitions.ts	cards.json の読み込みと貸出
GameScreen.tsx	UI 全体の統合
HandCard.tsx	手札のカードUI
SupplyCard.tsx	サプライのカードUI
9. エンジンの保証するべきこと

プレイヤー操作が必ずゲームロジックに正しく伝わる

「米」「知識」は常に一貫して更新される

カード効果の処理は順序どおり、純関数で行われる

5 フェーズは絶対に壊れない

次の時代デッキ（江戸・世界史）でもこの仕組みをそのまま使える拡張性を持つ