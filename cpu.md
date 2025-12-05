cpu.md（CPU仕様ドキュメント v1）
3-0. 目的

小学生でも「たまに負ける／勝てる」くらいの強さ

思考アルゴリズムはシンプルで、実装が容易

人間のプレイと同じルールで処理できる

3-1. CPUのターン手順

人間と完全に同じルールを適用する。

startTurn（手札5枚 & riceThisTurn = 0）

資源フェーズ：

手札の type = "resource" を 全部プレイ する

行動フェーズ：

手札の type = "event" を最優先で1枚
なければ type = "character" を1枚
どちらもなければ行動フェーズはスキップ

購入フェーズ：

chooseBuy() により購入カードを決める

endTurn（クリーンアップ）

3-2. 購入戦略（chooseBuy）
概要

ターン数に応じて「何を優先して買うか」を変える

フェーズ定義

Early（ターン1〜4）

目的：デッキの基盤を作る

優先度：

資源（resource）

人物（character）

出来事（event）

国力（victory）

Mid（ターン5〜10）

目的：人物・出来事で爆発力を高める

優先度：

人物（character）

出来事（event）

資源（resource）

国力（victory）

Late（ターン11〜12）

目的：国力カードを買い集める

優先度：

国力（victory）

人物（character）

出来事（event）

資源（resource）

擬似コード
function chooseBuy(state: GameState): Card | null {
  const me = state.cpu;
  const rice = me.riceThisTurn;

  const affordable = Object.values(state.supply)
    .filter(pile => pile.remaining > 0 && pile.card.cost <= rice)
    .map(pile => pile.card);

  if (affordable.length === 0) return null;

  const phase = getPhase(me.turnsTaken); // "early" | "mid" | "late"

  const priority: CardType[] =
    phase === "early"
      ? ["resource", "character", "event", "victory"]
      : phase === "mid"
      ? ["character", "event", "resource", "victory"]
      : ["victory", "character", "event", "resource"];

  // 優先度に従ってカードを選ぶ
  for (const t of priority) {
    const candidates = affordable.filter(c => c.type === t);
    if (candidates.length > 0) {
      return pickHighestScoreCard(candidates);
    }
  }

  return null;
}

3-3. カード評価（pickHighestScoreCard）
シンプルなスコア付け
function scoreCard(card: Card): number {
  let score = 0;
  for (const ef of card.effects) {
    if (ef.effect === "addRice") score += (ef.value ?? 0) * 2;
    if (ef.effect === "addKnowledge") score += (ef.value ?? 0) * 1.5;
    if (ef.effect === "draw") score += (ef.value ?? 0) * 1.5;
    if (ef.effect === "addVictory") score += (ef.value ?? 0) * 3;
    if (ef.effect === "discount") score += 2; // おおざっぱでOK
  }
  return score;
}


pickHighestScoreCard は単純に scoreCard が最大のものを選ぶ

3-4. 行動カード選択ロジック
function chooseCardToPlay(hand: Card[]): Card | null {
  const events = hand.filter(c => c.type === "event");
  if (events.length > 0) {
    return events.sort((a, b) => scoreCard(b) - scoreCard(a))[0];
  }

  const characters = hand.filter(c => c.type === "character");
  if (characters.length > 0) {
    return characters.sort((a, b) => scoreCard(b) - scoreCard(a))[0];
  }

  return null; // 資源は資源フェーズで全部出している想定
}

3-5. 難易度調整パラメータ

easyモード：

Mid/Lateでも資源を優先度高めにする（＝国力が伸びにくい）

normalモード（v1のデフォルト）：

上記ロジックそのまま

hardモード（v2以降）：

プレイヤーのデッキ構成を見て、カウンター気味の購入を行う
（v1では実装しない）