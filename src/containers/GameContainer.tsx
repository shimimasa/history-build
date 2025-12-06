// src/containers/GameContainer.tsx
// 1ゲーム分の状態管理コンテナ。
// - GameState と turnFlow / cpuLogic を使って PLAYER vs CPU の1対戦を進行。
// - プレイヤー操作 → proceedPhase / actionPhase / buyPhase → CPU 自動ターン(runCpuTurn)
//   → turnFlow 内の gameEnded 判定 → false→true になった瞬間に onGameEnd で親(App)へ通知。
// - deckConfig は createGameStateFromDeck に渡され、初期デッキ構成に反映される。

import React, { useState, useRef, useEffect } from "react";
import GameScreen from "../components/GameScreen";
import { createGameStateFromDeck } from "../logic/initGameState";
import type { GameState } from "../game/gameState";
import { proceedPhase, actionPhase, buyPhase } from "../game/turnFlow";
import { runCpuTurn } from "../logic/cpuLogic";
import { computeVictoryPointsForPlayer } from "../game/socre";
import type { GameOutcome, DeckConfig } from "../ui/uiTypes";

interface GameContainerProps {
  onGameEnd?: (outcome: GameOutcome) => void;
  deckConfig?: DeckConfig;
}

const GameContainer: React.FC<GameContainerProps> = ({ onGameEnd, deckConfig }) => {
  // 初期 GameState を DeckConfig に基づいて生成。
  // App.tsx 側で key={gameSessionId} を付けているため、
  // 再戦やデッキ変更時には GameContainer が再マウントされ、この初期化が再実行される。
  const [state, setState] = useState<GameState>(() =>
    createGameStateFromDeck(deckConfig)
  );

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

  // 直前の gameEnded の値を保持し、「false → true」遷移を検知する
  const prevGameEndedRef = useRef<boolean>(state.gameEnded);

  useEffect(() => {
    const prev = prevGameEndedRef.current;

    if (!prev && state.gameEnded && onGameEnd) {
      const playerScore = computeVictoryPointsForPlayer(state, "player");
      const cpuScore = computeVictoryPointsForPlayer(state, "cpu");

      const outcome: GameOutcome = {
        finalState: state,
        winner: state.winner,
        playerScore,
        cpuScore
      };

      onGameEnd(outcome);
    }

    prevGameEndedRef.current = state.gameEnded;
  }, [state, state.gameEnded, onGameEnd]);

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