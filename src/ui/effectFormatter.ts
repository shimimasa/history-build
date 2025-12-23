// src/ui/effectFormatter.ts
// Card.effects（v1.5 Effect 型 + raw DSL）を人間が読める短文に変換するユーティリティ

import type { Card, Effect } from "../game/gameState";

function formatSingleEffect(ef: Effect): string[] {
  const lines: string[] = [];

  switch (ef.type) {
    case "gain": {
      const g = ef.gain ?? {};
      if (typeof g.rice === "number" && g.rice !== 0) {
        lines.push(`米 +${g.rice}`);
      }
      if (typeof g.knowledge === "number" && g.knowledge !== 0) {
        lines.push(`見識 +${g.knowledge}`);
      }
      if (typeof g.draw === "number" && g.draw > 0) {
        lines.push(`カードを ${g.draw} 枚引く`);
      }
      if (typeof g.actions === "number" && g.actions !== 0) {
        lines.push(`アクション +${g.actions}`);
      }
      if (typeof g.buys === "number" && g.buys !== 0) {
        lines.push(`購入 +${g.buys}`);
      }
      if (typeof g.vp === "number" && g.vp !== 0) {
        lines.push(`勝利点トークン +${g.vp}`);
      }
      break;
    }
    case "trashFromHand": {
      lines.push(`廃棄：手札から ${ef.count} 枚`);
      break;
    }
    case "discount": {
      lines.push(`割引：-${ef.discountThisTurn}（このターン）`);
      break;
    }
    case "attackDiscard": {
      lines.push(`攻撃：相手は手札から ${ef.count} 枚捨て札`);
      break;
    }
    case "selfDiscard": {
      lines.push(`自分：手札から ${ef.count} 枚捨て札`);
      break;
    }
    case "conditional": {
      const ifStr = ef.if ?? "";
      lines.push(`条件：${ifStr || "（不明）"}`);
      const hasThen = Array.isArray(ef.then) && ef.then.length > 0;
      const hasElse = Array.isArray(ef.else) && ef.else.length > 0;
      const flags = [
        hasThen ? "thenあり" : null,
        hasElse ? "elseあり" : null
      ].filter(Boolean);
      if (flags.length > 0) {
        lines.push(`分岐：${flags.join(" / ")}`);
      }
      break;
    }
    case "unknown": {
      lines.push("未対応効果");
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


