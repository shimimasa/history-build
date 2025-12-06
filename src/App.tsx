// src/App.tsx
// アプリ全体の画面遷移を管理するコンテナ。
// - Start → DeckSelect → Game → Result →（再戦/タイトル）に加え、CardDex（カード図鑑）画面を扱う。
// - GameContainer からの onGameEnd 通知で Result 画面に遷移し、再戦 / タイトル戻りを制御する。

import React, { useState } from "react";
import GameContainer from "./containers/GameContainer";
import { StartScreen } from "./components/StartScreen";
import { ResultScreen } from "./components/ResultScreen";
import { DeckSelectScreen } from "./components/DeckSelectScreen";
import { CardDexScreen } from "./components/CardDexScreen";
import type {
  UiScreen,
  GameOutcome,
  DeckConfig
} from "./ui/uiTypes";
import { DEFAULT_DECKS } from "./ui/uiTypes";

const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<UiScreen>("start");
  const [lastOutcome, setLastOutcome] = useState<GameOutcome | null>(null);
  const [gameSessionId, setGameSessionId] = useState(0);
  const [selectedDeck, setSelectedDeck] = useState<DeckConfig | null>(null);

  const handleGoToDeckSelect = () => {
    setCurrentScreen("deckSelect");
  };

  const handleSelectDeck = (deck: DeckConfig) => {
    setSelectedDeck(deck);
    setGameSessionId((id) => id + 1);
    setLastOutcome(null);
    setCurrentScreen("game");
  };

  const handleGameEnd = (outcome: GameOutcome) => {
    setLastOutcome(outcome);
    setCurrentScreen("result");
  };

  const handleRestart = () => {
    if (!selectedDeck) {
      // 念のため：デッキ未選択ならタイトルに戻す
      setLastOutcome(null);
      setCurrentScreen("start");
      return;
    }
    setGameSessionId((id) => id + 1);
    setLastOutcome(null);
    setCurrentScreen("game");
  };

  const handleBackToTitle = () => {
    setLastOutcome(null);
    setSelectedDeck(null);
    setCurrentScreen("start");
  };

  if (currentScreen === "start") {
    return (
      <StartScreen
        onStartGame={handleGoToDeckSelect}
        onShowCardDex={() => setCurrentScreen("cardDex")}
      />
    );
  }

  if (currentScreen === "deckSelect") {
    return (
      <DeckSelectScreen
        decks={DEFAULT_DECKS}
        onSelectDeck={handleSelectDeck}
        onBackToTitle={handleBackToTitle}
      />
    );
  }

  if (currentScreen === "cardDex") {
    return (
      <CardDexScreen
        onBackToTitle={() => setCurrentScreen("start")}
      />
    );
  }

  if (currentScreen === "game") {
    return (
      <GameContainer
        key={gameSessionId}
        onGameEnd={handleGameEnd}
        deckConfig={selectedDeck ?? undefined}
      />
    );
  }

  // result 画面
  if (!lastOutcome) {
    // 理論上ここには来ないが、安全策としてタイトルに戻す
    return (
      <StartScreen
        onStartGame={handleGoToDeckSelect}
        onShowCardDex={() => setCurrentScreen("cardDex")}
      />
    );
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