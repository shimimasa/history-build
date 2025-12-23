// src/components/ResultScreen.test.tsx
import { describe, it, expect } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { ResultScreen } from "./ResultScreen";
import { createInitialGameState } from "../game/gameState";
import { BASE_CARDS } from "../game/baseCards";
import type { GameOutcome } from "../ui/uiTypes";

describe("ResultScreen", () => {
  it("終了理由・era/deckType・勝利点内訳が表示される", () => {
    // supply を作るために最小カードセットで GameState を生成
    const s0 = createInitialGameState(BASE_CARDS);
    // 終了条件（A）: 勝利点の空山が2つ以上
    const supply = { ...s0.supply };
    if (supply["VP_VILLAGE"]) supply["VP_VILLAGE"] = { ...supply["VP_VILLAGE"], remaining: 0 };
    if (supply["VP_COUNTRY"]) supply["VP_COUNTRY"] = { ...supply["VP_COUNTRY"], remaining: 0 };

    const finalState = {
      ...s0,
      supply,
      era: "ancient" as const,
      deckType: "basic" as const,
      turnCount: 10,
      gameEnded: true,
      winner: "player" as const
    };

    const outcome: GameOutcome = {
      finalState,
      winner: "player",
      playerScore: 3,
      cpuScore: 1,
      playerBreakdown: [
        { cardId: "VP_VILLAGE", cardName: "村落", count: 1, pointsPerCard: 1, totalPoints: 1 }
      ],
      cpuBreakdown: []
    };

    const html = renderToStaticMarkup(
      <ResultScreen outcome={outcome} onRestart={() => {}} onBackToTitle={() => {}} />
    );

    expect(html).toContain("対戦結果");
    expect(html).toContain("デッキ:");
    expect(html).toContain("古代");
    expect(html).toContain("終了理由");
    expect(html).toContain("勝利点の空山が2つ以上");
    expect(html).toContain("勝利点内訳");
    expect(html).toContain("村落");
  });
});


