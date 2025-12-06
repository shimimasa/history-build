// src/containers/GameContainer.tsx

import React, { useState } from "react";
import GameScreen from "../components/GameScreen";
import { initGameState } from "../logic/initGameState";
import type { GameState } from "../game/gameState";
import { proceedPhase, actionPhase, buyPhase } from "../game/turnFlow";
import { runCpuTurn } from "../logic/cpuLogic";

const GameContainer: React.FC = () => {
  // v2: initGameState() が createInitialGameState(cards) を呼び出し、
  // GameState（phase="DRAW", activePlayer="player", turnCount=1）を返す。
  const [state, setState] = useState<GameState>(() => initGameState());

  /**
   * プレイヤー操作後に、必要なら CPU のターンを自動実行する共通ヘルパー。
   * - nextState.gameEnded === true の場合はそのまま返す
   * - activePlayer === "cpu" の場合のみ runCpuTurn を呼ぶ
   */
  function applyWithCpuTurn(nextState: GameState): GameState {
    let s = nextState;

    if (s.gameEnded) {
      return s;
    }

    if (s.activePlayer === "cpu") {
      s = runCpuTurn(s);
    }

    return s;
  }

  // プレイヤー側：フェーズを1つ進める（DRAW → RESOURCE → ACTION → BUY → CLEANUP → 次ターン…）
  const handleProceedPhase = () => {
    setState((prev) => {
      if (prev.gameEnded || prev.activePlayer !== "player") {
        return prev;
      }

      const afterPlayer = proceedPhase(prev);
      return applyWithCpuTurn(afterPlayer);
    });
  };

  // プレイヤー側：ACTION フェーズ中に人物 / 出来事カードを1枚プレイ
  const handlePlayActionCard = (cardId: string) => {
    setState((prev) => {
      if (
        prev.gameEnded ||
        prev.activePlayer !== "player" ||
        prev.phase !== "ACTION"
      ) {
        return prev;
      }

      const afterAction = actionPhase(prev, cardId);
      return applyWithCpuTurn(afterAction);
    });
  };

  // プレイヤー側：BUY フェーズ中にカードを1枚購入
  const handleBuyCard = (cardId: string) => {
    setState((prev) => {
      if (
        prev.gameEnded ||
        prev.activePlayer !== "player" ||
        prev.phase !== "BUY"
      ) {
        return prev;
      }

      const afterBuy = buyPhase(prev, cardId);
      return applyWithCpuTurn(afterBuy);
    });
  };

  return (
    <GameScreen
      state={state}
      onProceedPhase={handleProceedPhase}
      onPlayActionCard={handlePlayActionCard}
      onBuyCard={handleBuyCard}
    />
  );
};

export default GameContainer;