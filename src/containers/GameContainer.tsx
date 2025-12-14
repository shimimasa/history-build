// src/containers/GameContainer.tsx
// 1ゲーム分の状態管理コンテナ。
// - GameState と turnFlow / cpuLogic を使って PLAYER vs CPU の1対戦を進行。
// - プレイヤー操作 → proceedPhase / actionPhase / buyPhase → CPU 自動ターン(runCpuTurn)
//   → turnFlow 内の gameEnded 判定 → false→true になった瞬間に onGameEnd で親(App)へ通知。
// - deckConfig は createGameStateFromDeck に渡され、初期デッキ構成に反映される。

// 新:
import React, { useState, useRef, useEffect, useMemo} from "react";
import { GameScreen } from "../components/GameScreen";
import { computeVictoryPointsForPlayer } from "../game/socre";
import type { Card } from "../game/gameState";
import type { GameOutcome, DeckConfig } from "../ui/uiTypes";
import { CardDetailModal } from "../components/CardDetailModal";
import { useGameEngine } from "../hooks/useGameEngine";

type UiEventKind = "BUY" | "PLAY";

type UiEvent = {
  kind: UiEventKind;
  cardId: string;
  timestamp: number;
};

interface GameContainerProps {
  onGameEnd?: (outcome: GameOutcome) => void;
  deckConfig?: DeckConfig;
}

const GameContainer: React.FC<GameContainerProps> = ({ onGameEnd, deckConfig }) => {
  // 新コアによるゲームエンジン
  const {
    state,
    viewState,
    playCard,
    autoPlayResources,
    buyCard,
    endPhase,
    endTurn
  } = useGameEngine({ deckConfig });

  // ★ UI 用の状態（ゲームロジックとは独立）
  const [hoveredCard, setHoveredCard] = useState<Card | null>(null);
  const [selectedHandCardId, setSelectedHandCardId] = useState<string | null>(null);

  const [selectedCardForDetail, setSelectedCardForDetail] = useState<Card | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // ★ UI 用：直近イベント & ミニ履歴 & ログ
  const [uiLastEvent, setUiLastEvent] = useState<UiEvent | null>(null);
  const [uiRecentBuys, setUiRecentBuys] = useState<UiEvent[]>([]);
  const [uiRecentPlays, setUiRecentPlays] = useState<UiEvent[]>([]);

  // ★ GameScreen に渡す state に UI 情報を埋め込む
  const screenState = useMemo(
    () => ({
      ...viewState,
      hoveredCard,
      uiLastEvent,
      uiRecentBuys,
      uiRecentPlays
    }),
    [viewState, hoveredCard, uiLastEvent, uiRecentBuys, uiRecentPlays]
  );

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

  const handleShowCardDetail = (card: Card) => {
    setSelectedCardForDetail(card);
    setIsDetailOpen(true);
  };

  const handleCloseCardDetail = () => {
    setIsDetailOpen(false);
  };


 // プレイヤー操作ハンドラ:
 const handlePlayHandCard = (cardId: string) => {
  if (state.gameEnded || state.activePlayer !== "player") return;
  if (state.phase !== "ACTION") return;
  playCard(cardId);
};

const handleBuyCard = (cardId: string) => {
  if (state.gameEnded || state.activePlayer !== "player") return;
  if (state.phase !== "BUY") return;
  buyCard(cardId);
};

const handleProceedPhase = () => {
  if (state.gameEnded || state.activePlayer !== "player") return;
  endPhase();
};

// END_TURN は GameScreen から呼ばれる
const handleEndTurn = () => {
  if (state.gameEnded || state.activePlayer !== "player") return;
  endTurn();
};

  return (
    <>
      <GameScreen
        state={screenState}          // ★ ここだけ screenState に変更
        logs={state.eventLog}       // ★ [] → eventLog に変更
        onPlayHandCard={handlePlayHandCard}
        onBuyCard={handleBuyCard}
        onEndPhase={handleProceedPhase}
        onEndTurn={handleEndTurn}
        selectedHandCardId={selectedHandCardId}
        onSelectHandCard={setSelectedHandCardId}
        onHoverCard={setHoveredCard}  // ★ Supply / Hand からの hover を受け取る
      />
      <CardDetailModal
        card={selectedCardForDetail}
        isOpen={isDetailOpen}
        onClose={handleCloseCardDetail}
      />
    </>
  );
};

export default GameContainer;