// DSL 拡張の方針メモ（将来 v2.1 以降で対応する）
//
// 1. discount 効果の正式サポート
//    - Effect に discount フィールドを追加する案:
//      interface Effect {
//        ...
//        discount?: {
//          targetType: "resource" | "person" | "event" | "victory";
//          amount: number;
//        };
//      }
//    - PlayerState にターン中割引の一覧を持たせ（例: discounts: { targetType, amount }[]）
//      applyEffect.ts 内で discount を適用して discounts に push する。
//    - BUY フェーズでは effectiveCost = cost - sum(discounts) を使って購入判定＆米支払いを行う。
//
// 2. 条件付き効果（condition）のサポート
//    - Effect に condition を追加する案:
//      interface EffectCondition {
//        resource: "rice" | "knowledge";
//        operator: ">=" | "<=" | "==" | ">" | "<";
//        value: number;
//      }
//      interface Effect {
//        ...
//        condition?: EffectCondition;
//      }
//    - applyEffect.ts で condition をチェックし、満たした場合だけ該当 Effect を適用する。
//    - 織田信長などの「知識が一定以上なら追加ボーナス」を元の挙動に近づけられる。
//
// 3. trashSelf / trashFromHand 相当のサポート
//    - v2 では trashSelf は「played から自分を除去する」として定義済み。
//    - 手札トラッシュを表現したい場合は、
//      - Effect に discard: number を使い、「手札から捨て札へ」くらいの軽いデッキ調整に寄せる、
//        または
//      - 別の Effect（trashFromHand: number）を追加し、applyEffect.ts で hand から完全除外する。
//    - UI から対象カードを選ばせたい場合は、
//      - Effect 自体は「N枚トラッシュ」のみを表現し、
//      - どのカードを選ぶかは UI / cpuLogic 側の責務とする。