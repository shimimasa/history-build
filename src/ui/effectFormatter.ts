// src/ui/effectFormatter.ts
// Card.effects（v1.5 Effect 型 + raw DSL）を人間が読める短文に変換するユーティリティ

import type { Card, Effect } from "../game/gameState";

function formatSingleEffect(ef: Effect): string[] {
  const lines: string[] = [];
  const raw: any = (ef as any).raw ?? ef;

  // v1.5 Effect フィールド
  if (typeof ef.addRice === "number" && ef.addRice !== 0) {
    lines.push(`米 +${ef.addRice}`);
  }

  if (typeof ef.addKnowledge === "number" && ef.addKnowledge !== 0) {
    lines.push(`知識 +${ef.addKnowledge}`);
  }

  if (typeof ef.draw === "number" && ef.draw > 0) {
    lines.push(`カードを ${ef.draw} 枚引く`);
  }

  if (typeof ef.addVictory === "number" && ef.addVictory !== 0) {
    lines.push(`勝利点 +${ef.addVictory}`);
  }

  if (typeof ef.discard === "number" && ef.discard > 0) {
    lines.push(`手札を ${ef.discard} 枚捨て札にする`);
  }

  if (ef.trashSelf) {
    lines.push("このカードを廃棄する");
  }

  if (typeof ef.gain === "string") {
    lines.push(`カード「${ef.gain}」を獲得する`);
  }

  // raw DSL からの追加情報（cards.json 由来）

  if (raw && typeof raw === "object") {
    // gainRice / gainKnowledge / draw / gainVP が v1.5 にマップされていない場合のフォールバック
    if (!ef.addRice && typeof raw.gainRice === "number" && raw.gainRice !== 0) {
      lines.push(`米 +${raw.gainRice}`);
    }

    if (
      !ef.addKnowledge &&
      typeof raw.gainKnowledge === "number" &&
      raw.gainKnowledge !== 0
    ) {
      lines.push(`知識 +${raw.gainKnowledge}`);
    }

    if (!ef.draw && typeof raw.draw === "number" && raw.draw > 0) {
      lines.push(`カードを ${raw.draw} 枚引く`);
    }

    if (
      !ef.addVictory &&
      (typeof raw.gainVP === "number" || typeof raw.gainVictory === "number")
    ) {
      const v = raw.gainVP ?? raw.gainVictory;
      lines.push(`勝利点 +${v}`);
    }

    // addActions / addBuys（cards.json で将来使う想定）
    if (typeof raw.addActions === "number" && raw.addActions !== 0) {
      lines.push(`アクション +${raw.addActions}`);
    }

    if (typeof raw.addBuys === "number" && raw.addBuys !== 0) {
      lines.push(`購入権 +${raw.addBuys}`);
    }

    // 手札廃棄系
    if (
      typeof raw.trash === "number" ||
      typeof raw.trashFromHand === "number"
    ) {
      const n = raw.trash ?? raw.trashFromHand;
      lines.push(`手札から ${n} 枚廃棄する`);
    }

    // 割引系
    if (raw.discount || raw.reduceCostThisTurn) {
      let amount: number | undefined;
      if (typeof raw.discount === "number") {
        amount = raw.discount;
      } else if (raw.discount && typeof raw.discount.amount === "number") {
        amount = raw.discount.amount;
      } else if (typeof raw.reduceCostThisTurn === "number") {
        amount = raw.reduceCostThisTurn;
      }

      if (typeof amount === "number") {
        lines.push(`このターンの購入コスト -${amount}`);
      } else {
        lines.push("割引の特殊効果");
      }
    }

    // 攻撃（手札破棄）
    if (typeof raw.attackDiscard === "number" && raw.attackDiscard > 0) {
      lines.push(`相手に手札を ${raw.attackDiscard} 枚捨てさせる（攻撃）`);
    }

    // 条件付き効果の存在だけ知らせる
    if (raw.conditional || raw.condition) {
      lines.push("条件付きの特殊効果");
    }
  }

  // 何も解釈できなかった場合は「特殊効果」として最低限表示
  if (lines.length === 0) {
    lines.push("特殊効果");
  }

  return lines;
}

/**
 * Card.effects を人間が読める短文リストに変換する。
 * - 戻り値が空配列の場合は「効果：なし」と表示してよい。
 * - 行数が多くなりすぎる場合は最大 6 行までに切り詰める。
 */
export function formatEffects(card: Card): string[] {
  if (!card.effects || card.effects.length === 0) {
    return [];
  }

  const allLines: string[] = [];

  for (const ef of card.effects as Effect[]) {
    const lines = formatSingleEffect(ef);
    for (const line of lines) {
      allLines.push(line);
    }
  }

  if (allLines.length <= 6) {
    return allLines;
  }

  return [...allLines.slice(0, 5), "…（他にも効果があります）"];
}


