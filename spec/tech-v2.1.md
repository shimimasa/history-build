==============================
🛠 技術仕様書（TDS） v2.1
==============================
1. 🧠 Effect 評価の拡張（applyEffect.ts）
1.1 条件付き効果の処理
if (effect.condition) {
  const ok = evaluateCondition(effect.condition, player);
  if (!ok) return state;
}

1.2 割引の処理
if (effect.discount) {
  player.discounts.push(effect.discount);
}

PlayerState 拡張
interface PlayerState {
  ...
  discounts: { targetType: CardType; amount: number }[];
}

1.3 手札トラッシュの処理

applyEffect.ts は「選択の要求」を返し、
UI が選択後に resolver を呼ぶ設計とする。

if (effect.trashFromHand) {
  return { state, pending: { type: "trashFromHand", count: effect.trashFromHand }};
}

2. 🧩 getEffectiveCostForPlayer の拡張
v2.1 仕様
function getEffectiveCostForPlayer(player, card) {
  const base = card.cost;

  const discountTotal =
    player.discounts
      .filter(d => d.targetType === card.type)
      .reduce((sum, d) => sum + d.amount, 0);

  return Math.max(0, base - discountTotal);
}

3. 🔁 ターン終了時に割引をリセット

cleanupPhase 内で実施：

updatedPlayer.discounts = [];

4. 🌅 trashFromHand の UI フロー

プレイヤーがカードをプレイ

applyEffect が pending: { type: "trashFromHand", count: N } を返す

UI が手札を選ばせる

選択カードの ID を resolver へ渡す

resolver が hand / trash を更新し state を返す

5. 🤖 CPU AI の拡張
CPU は trashFromHand の対象選びが必要となる

「価値の低いカード（RICE_SMALL 等）を優先」

「VP カードはトラッシュしない」

「割引を最大化するカードの優先購入」

※ この AI は v2.2 で詳細化される予定。

6. 📦 cards.json の v2.1 構造

全カードが以下の形になる：

{
  "id": "CHR_IEYASU",
  "name": "徳川家康",
  "type": "person",
  "cost": 6,
  "knowledgeRequired": 4,
  "effects": [
    { "addRice": 1 },
    { "addKnowledge": 1 },
    { "discount": { "targetType": "victory", "amount": 1 } }
  ],
  "text": "米+1、知識+1、勝利点カードの購入コストが1下がる。"
}

==============================
🧪 テスト仕様（Test Plan） v2.1
==============================
1. 条件付き効果

knowledge = 2 → 信長の追加効果が発動しない

knowledge = 3 → 発動する

2. 割引

人物カード割引 → そのターンの購入コストが減る

cleanupPhase 後 → 割引はリセットされる

3. trashFromHand

プレイ時に pending が発生する

resolver によって正しく手札から除外される

テスト名例：

effect-condition.test.ts  
effect-discount.test.ts  
effect-trashFromHand.test.ts  
turnFlow-discount-reset.test.ts  