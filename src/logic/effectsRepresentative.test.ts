import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

import type { GameState, Card } from "../game/gameState";
import { createInitialGameState } from "../game/gameState";
import { convertRawCardToGameCard } from "../game/cardRegistry";
import { dispatch } from "../game/core/reducer";
import {
  computeVictoryPointsForPlayer
} from "../game/socre";

function loadAllCards(): Card[] {
  const p = path.join(process.cwd(), "public", "cards.json");
  const raw = JSON.parse(fs.readFileSync(p, "utf8"));
  const cards = (raw.cards ?? raw) as any[];
  return cards.map(convertRawCardToGameCard);
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

    expect(s.player.buyDiscountThisTurn).toBeGreaterThan(0);
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
    expect(s.eventLog.join("\n")).toContain("（攻撃）");
    expect(s.eventLog.join("\n")).toContain("条件未達");
  });

  it("SG_E03: attackDiscarded>=2 の conditional が成立し、gainVP が vpTokens に入る + selfDiscard", () => {
    const all = loadAllCards();
    const cards = pickCards(["SG_E03", "RICE_SMALL"], all);
    let s = baseStateWithSupply(cards);
    s = {
      ...s,
      player: { ...s.player, hand: ["SG_E03", "RICE_SMALL"], discard: [] },
      cpu: { ...s.cpu, hand: ["RICE_SMALL", "RICE_SMALL"], discard: [] }
    };

    s = dispatch(s, { type: "PLAY_CARD", playerId: "player", cardId: "SG_E03" });

    expect(s.player.attackDiscardedThisTurn).toBeGreaterThanOrEqual(2);
    expect(s.player.vpTokens).toBeGreaterThanOrEqual(1);
    expect(s.player.discard.length).toBeGreaterThanOrEqual(1); // selfDiscard
    expect(s.eventLog.join("\n")).toContain("勝利点トークン");
  });

  it("AN_E01: totalKnowledge>=3 を満たすと then(gainVP) が vpTokens に入る", () => {
    const all = loadAllCards();
    const cards = pickCards(["AN_E01"], all);
    let s = baseStateWithSupply(cards);
    s = {
      ...s,
      player: { ...s.player, hand: ["AN_E01"], knowledge: 2 } // gainKnowledge(1)で3に到達
    };

    s = dispatch(s, { type: "PLAY_CARD", playerId: "player", cardId: "AN_E01" });

    expect(s.player.knowledge).toBeGreaterThanOrEqual(3);
    expect(s.player.vpTokens).toBeGreaterThanOrEqual(1);
    expect(s.eventLog.join("\n")).toContain("条件達成");
  });

  it("AN_V06: victory カードとしての gainVP はスコアに入る（vpTokensとは別）", () => {
    const all = loadAllCards();
    const cards = pickCards(["AN_V06"], all);
    let s = baseStateWithSupply(cards);
    s = {
      ...s,
      player: { ...s.player, deck: ["AN_V06"], hand: [], discard: [], played: [], vpTokens: 0 }
    };

    const score = computeVictoryPointsForPlayer(s, "player");
    expect(score).toBe(5);
  });
});


