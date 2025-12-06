// src/containers/GameContainer.tsx

import React, { useState } from "react";
import GameScreen from "../components/GameScreen";
import { initGameState } from "../logic/initGameState";
import type { GameState } from "../game/gameState";
import { proceedPhase, actionPhase, buyPhase } from "../game/turnFlow";
// 将来、CPU ロジックを v2 GameState に寄せる際に使用予定：
// import { chooseCpuActionCard, chooseCpuBuyCard } from "../logic/cpuLogic";

const GameContainer: React.FC = () => {
  // v2: initGameState() が createInitialGameState(cards) を呼び出し、
  // GameState（phase="DRAW", activePlayer="player", turnCount=1）を返す。
  const [state, setState] = useState<GameState>(() => initGameState());

  // プレイヤー側：フェーズを1つ進める（DRAW → RESOURCE → ACTION → BUY → CLEANUP → 次ターン…）
  const handleProceedPhase = () => {
    setState((prev) => {
      if (prev.gameEnded || prev.activePlayer !== "player") {
        return prev;
      }

      // v2: プレイヤーの現在フェーズを1ステップ進める。
      // TODO: activePlayer === "cpu" になったタイミングで、
      //   while ループ＋ proceedPhase / actionPhase / buyPhase を使って
      //   CPU のターンを自動処理する実装を追加する。
      return proceedPhase(prev);
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
      return actionPhase(prev, cardId);
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
      return buyPhase(prev, cardId);
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