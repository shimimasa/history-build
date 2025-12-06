// src/App.tsx

import React, { useState } from "react";
import GameContainer from "./containers/GameContainer";
import { StartScreen } from "./components/StartScreen";
import { ResultScreen } from "./components/ResultScreen";
import type { UiScreen, GameOutcome } from "./ui/uiTypes";

const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<UiScreen>("start");
  const [lastOutcome, setLastOutcome] = useState<GameOutcome | null>(null);
  const [gameSessionId, setGameSessionId] = useState(0);

  const handleStartGame = () => {
    // 新しいゲームセッションを開始
    setGameSessionId((id) => id + 1);
    setCurrentScreen("game");
    setLastOutcome(null);
  };

  const handleGameEnd = (outcome: GameOutcome) => {
    setLastOutcome(outcome);
    setCurrentScreen("result");
  };

  const handleRestart = () => {
    // 同じ条件で再戦：sessionId を増やして GameContainer をリセット
    setGameSessionId((id) => id + 1);
    setCurrentScreen("game");
  };

  const handleBackToTitle = () => {
    setCurrentScreen("start");
  };

  if (currentScreen === "start") {
    return <StartScreen onStartGame={handleStartGame} />;
  }

  if (currentScreen === "game") {
    return (
      <GameContainer
        key={gameSessionId}
        onGameEnd={handleGameEnd}
      />
    );
  }

  // result 画面
  if (!lastOutcome) {
    // 理論上ここには来ないが、安全策としてタイトルへ戻す
    return <StartScreen onStartGame={handleStartGame} />;
  }

  return (
    <ResultScreen
      outcome={lastOutcome}
      onRestart={handleRestart}
      onBackToTitle={handleBackToTitle}
    />
  );
};

export default App;