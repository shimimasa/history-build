📘 history-build v2.1 仕様書（完全版）
==============================
📘 ゲームデザイン仕様書（GDS） v2.1
==============================
🎯 v2.1 の目的

v2 では最低限の「純粋 DSL + エンジン + UI」が完成した。
v2.1 の目的は ゲーム性を高める改善機能を、破綻なく DSL に統合すること。

追加される要素は以下の 3 つ：

条件付き効果（condition）

割引効果（discount）

手札トラッシュ（trashFromHand）

これらは全て DSL（Effect）内で正式に表現できるようにする。

1. 🎴 カード効果の DSL 拡張（Effect v2.1）
v2.1 Effect 構造（拡張版）
interface Effect {
  addRice?: number;
  addKnowledge?: number;
  draw?: number;
  addVictory?: number;
  trashSelf?: boolean;

  // v2.1 追加
  discount?: {
    targetType: CardType;         // "resource" | "person" | "event" | "victory"
    amount: number;               // 割引量
  };

  trashFromHand?: number;         // 手札から N 枚トラッシュ

  condition?: EffectCondition;    // 条件（v2.1新機能）
}

2. 🎯 条件付き効果（condition）
2.1 EffectCondition
interface EffectCondition {
  resource: "rice" | "knowledge";
  operator: ">=" | ">" | "==" | "<=" | "<";
  value: number;
}

条件例

knowledge >= 3 → 効果を発動

rice < 2 → 発動

knowledge == 0 → ペナルティ

カード例（織田信長の正式再現）
{
  "id": "CHR_NOBUNAGA",
  "name": "織田信長",
  "type": "person",
  "cost": 5,
  "knowledgeRequired": 2,
  "effects": [
    { "addRice": 1 },
    {
      "addRice": 1,
      "condition": { "resource": "knowledge", "operator": ">=", "value": 3 }
    }
  ]
}

3. 💸 割引効果（discount）
discount の仕様
discount?: {
  targetType: CardType;
  amount: number;
}

割引の処理仕様

プレイ時に player.discounts に追加

そのターン中のみ有効

BUY フェーズで getEffectiveCostForPlayer にて集計される

カード例（楽市楽座の正式再現）
{
  "id": "EV_RAKUICHI",
  "name": "楽市楽座",
  "type": "event",
  "cost": 4,
  "knowledgeRequired": 1,
  "effects": [
    { "addRice": 1 },
    { "discount": { "targetType": "person", "amount": 1 } },
    { "discount": { "targetType": "event",  "amount": 1 } }
  ]
}

4. 🗑 手札トラッシュ（trashFromHand）
仕様
trashFromHand?: number;

実装方針

UI or CPU が対象カードを選ぶ責務

applyEffect では「選択待ちフラグ」をセット

プレイヤーが UI で選択 → effect resolver が完了処理

カード例（刀狩の正式再現）
{
  "id": "EV_KATANAGARI",
  "name": "刀狩",
  "type": "event",
  "cost": 5,
  "knowledgeRequired": 1,
  "effects": [
    { "trashFromHand": 1 },
    { "addKnowledge": 1 },
    { "addVictory": 1 }
  ]
}