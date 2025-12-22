// src/ui/effectFormatter.ts
// Card.effects（v1.5 Effect 型 + raw DSL）を人間が読める短文に変換するユーティリティ

import type { Card, Effect } from "../game/gameState";

function formatSingleEffect(ef: Effect): string[] {
  const lines: string[] = [];

  switch (ef.type) {
    case "gain": {
      if (typeof ef.riceDelta === "number" && ef.riceDelta !== 0) {
        lines.push(`米 +${ef.riceDelta}`);
      }
      if (typeof ef.knowledgeDelta === "number" && ef.knowledgeDelta !== 0) {
        lines.push(`知識 +${ef.knowledgeDelta}`);
      }
      if (typeof ef.draw === "number" && ef.draw > 0) {
        lines.push(`カードを ${ef.draw} 枚引く`);
      }
      if (typeof ef.victoryDelta === "number" && ef.victoryDelta !== 0) {
        lines.push(`勝利点 +${ef.victoryDelta}`);
      }
      if (typeof ef.actionsDelta === "number" && ef.actionsDelta !== 0) {
        lines.push(`アクション +${ef.actionsDelta}`);
      }
      if (typeof ef.buysDelta === "number" && ef.buysDelta !== 0) {
        lines.push(`購入権 +${ef.buysDelta}`);
      }
      break;
    }
    case "trash": {
      const target =
        ef.from === "played"
          ? "プレイ中のカード"
          : ef.from === "discard"
          ? "捨て札"
          : "手札";
      lines.push(`${target}から ${ef.count} 枚廃棄する`);
      break;
    }
    case "discount": {
      lines.push(`次の購入コスト -${ef.amount}`);
      break;
    }
    case "attackDiscard": {
      lines.push(`相手に手札を ${ef.count} 枚捨てさせる（攻撃）`);
      break;
    }
    case "conditional": {
      lines.push("条件付きの特殊効果");
      break;
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


