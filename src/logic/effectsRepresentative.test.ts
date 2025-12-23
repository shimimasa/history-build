import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

import type { GameState, Card } from "../game/gameState";
import { createInitialGameState } from "../game/gameState";
import { convertRawCardToGameCard } from "../game/cardRegistry";
import { BASE_CARDS } from "../game/baseCards";
import { dispatch } from "../game/core/reducer";

/**
 * Representative cards（public/cards.json から選定・固定）
 * - **ED_E01**: conditional(if="trashedThisTurn>=1") + trashFromHand + draw
 * - **SG_E01**: reduceCostThisTurn(=discount) + trashFromHand
 * - **MD_E04**: attackDiscard（攻撃）
 *
 * EXPECTED LOG（最低限の人間向けログ。TRACEは省略）
 *
 * // EXPECTED LOG (ED_E01):
 * // [PLAY] 「ED_E01」使用（UI側の表示名に依存）
 * // [EFF] 廃棄 1
 * // [EFF] 条件達成（trashedThisTurn>=1）→ 効果発動
 * // [EFF] ドロー +1
 *
 * // EXPECTED LOG (SG_E01):
 * // [PLAY] 「SG_E01」使用
 * // [EFF] 割引 -2（このターン）
 * // [EFF] 廃棄 1
 *
 * // EXPECTED LOG (MD_E04):
 * // [PLAY] 「MD_E04」使用
 * // [EFF] 攻撃: 相手が捨て札 1
 * // [EFF] 条件未達（...） or [WARN] 未対応条件: ...
 */

function loadAllCards(): Card[] {
  const p = path.join(process.cwd(), "public", "cards.json");
  const raw = JSON.parse(fs.readFileSync(p, "utf8"));
  const cards = (raw.cards ?? raw) as any[];
  const eraCards = cards.map(convertRawCardToGameCard);
  return [...BASE_CARDS, ...eraCards];
}

function pickCards(ids: string[], all: Card[]): Card[] {
  const map = new Map(all.map((c) => [c.id, c]));
  return ids.map((id) => {
    const c = map.get(id);
    if (!c) throw new Error(`カードが見つかりません: ${id}`);
    return c;
  });
}

function baseStateWithSupply(cards: Card[]): GameState {
  const s = createInitialGameState(cards);
  // テストでは手札/捨て札を明示的に上書きして使う
  return {
    ...s,
    phase: "ACTION",
    activePlayer: "player"
  };
}

describe("EffectDSL normalization & representative cards", () => {
  it("unknown が 0 件になる（public/cards.json 全カードの normalize 結果）", () => {
    const all = loadAllCards();
    const unknown = all
      .flatMap((c) => c.effects)
      .filter((e) => e.type === "unknown");
    expect(unknown.length).toBe(0);
  });

  it("SG_E01: discount + trashFromHand が反映される", () => {
    const all = loadAllCards();
    const cards = pickCards(["SG_E01", "RICE_SMALL"], all);
    let s = baseStateWithSupply(cards);
    s = {
      ...s,
      player: {
        ...s.player,
        hand: ["SG_E01", "RICE_SMALL"]
      }
    };

    s = dispatch(s, { type: "PLAY_CARD", playerId: "player", cardId: "SG_E01" });

    expect(s.player.discountThisTurn).toBeGreaterThan(0);
    expect(s.trashPile.length).toBe(1);
    expect(s.eventLog.join("\n")).toContain("割引 -2（このターン）");
    expect(s.eventLog.join("\n")).toContain("廃棄");
  });

  it("ED_E01: trashFromHand -> conditional(trashedThisTurn>=1) -> draw が発動する", () => {
    const all = loadAllCards();
    const cards = pickCards(["ED_E01", "RICE_SMALL"], all);
    let s = baseStateWithSupply(cards);
    s = {
      ...s,
      player: {
        ...s.player,
        hand: ["ED_E01", "RICE_SMALL"]
      }
    };

    s = dispatch(s, { type: "PLAY_CARD", playerId: "player", cardId: "ED_E01" });

    expect(s.player.trashedThisTurn).toBeGreaterThan(0);
    expect(s.eventLog.join("\n")).toContain("条件達成");
    // 2枚→プレイで-1→廃棄で-1→ドローで+1 => 最終手札は 1 枚になる想定
    expect(s.player.hand.length).toBe(1);
  });

  it("MD_E04: attackDiscard が相手に反映され、条件未達ログが出る", () => {
    const all = loadAllCards();
    const cards = pickCards(["MD_E04", "RICE_SMALL"], all);
    let s = baseStateWithSupply(cards);
    s = {
      ...s,
      player: { ...s.player, hand: ["MD_E04"] },
      cpu: { ...s.cpu, hand: ["RICE_SMALL"], discard: [] }
    };

    s = dispatch(s, { type: "PLAY_CARD", playerId: "player", cardId: "MD_E04" });

    expect(s.cpu.discard.length).toBe(1);
    expect(s.eventLog.join("\n")).toContain("攻撃");
  });
});


