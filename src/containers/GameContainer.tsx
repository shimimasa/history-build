// src/containers/GameContainer.tsx
// 1ゲーム分の状態管理コンテナ。
// - GameState と turnFlow / cpuLogic を使って PLAYER vs CPU の1対戦を進行。
// - プレイヤー操作 → proceedPhase / actionPhase / buyPhase → CPU 自動ターン(runCpuTurn)
//   → turnFlow 内の gameEnded 判定 → false→true になった瞬間に onGameEnd で親(App)へ通知。
// - deckConfig は createGameStateFromDeck に渡され、初期デッキ構成に反映される。

import React, { useState, useRef, useEffect } from "react";
import { GameScreen } from "../components/GameScreen";
import { createGameStateFromDeck } from "../logic/initGameState";
import type { GameState, Card } from "../game/gameState";
import { proceedPhase, actionPhase, buyPhase } from "../game/turnFlow";
import { runCpuTurn } from "../logic/cpuLogic";
import { computeVictoryPointsForPlayer } from "../game/socre";
import type { GameOutcome, DeckConfig } from "../ui/uiTypes";
import { CardDetailModal } from "../components/CardDetailModal";
import { createCardMap } from "../game/cardDefinitions";
import { canBuyCard } from "../logic/cardEffects";

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
  // 初期 GameState を DeckConfig に基づいて生成。
  // App.tsx 側で key={gameSessionId} を付けているため、
  // 再戦やデッキ変更時には GameContainer が再マウントされ、この初期化が再実行される。
  const [state, setState] = useState<GameState>(() =>
    createGameStateFromDeck(deckConfig)
  );

  // ★ UI 用の状態（ゲームロジックとは独立）
  const [hoveredCard, setHoveredCard] = useState<Card | null>(null);
  const [selectedHandCardId, setSelectedHandCardId] = useState<string | null>(null);

  const [selectedCardForDetail, setSelectedCardForDetail] = useState<Card | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // ★ UI 用：直近イベント & ミニ履歴 & ログ
  const [uiLastEvent, setUiLastEvent] = useState<UiEvent | null>(null);
  const [uiRecentBuys, setUiRecentBuys] = useState<UiEvent[]>([]);
  const [uiRecentPlays, setUiRecentPlays] = useState<UiEvent[]>([]);
  const [logs, setLogs] = useState<string[]>([]);

  // ★ 1度だけカードマップを作る（id → Card）
  const cardMapRef = React.useRef<Record<string, Card> | null>(null);
  if (cardMapRef.current === null) {
    cardMapRef.current = createCardMap();
  }
  const cardMap = cardMapRef.current;

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

  const handleShowCardDetail = (card: Card) => {
    setSelectedCardForDetail(card);
    setIsDetailOpen(true);
  };

  const handleCloseCardDetail = () => {
    setIsDetailOpen(false);
  };

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
  const handlePlayHandCard = (cardId: string) => {
    setState((prev) => {
      if (prev.gameEnded) {
        console.log("[play] blocked: game already ended");
        return prev;
      }
      if (prev.activePlayer !== "player") {
        console.log("[play] blocked: not player turn");
        return prev;
      }
      if (prev.phase !== "ACTION") {
        console.log("[play] blocked: phase is not ACTION:", prev.phase);
        return prev;
      }
      if (!prev.player.hand.includes(cardId)) {
        console.log("[play] blocked: card not in hand:", cardId);
        return prev;
      }
      const pile = prev.supply[cardId];
      const card = pile?.card;
      if (!card || (card.type !== "person" && card.type !== "event")) {
        console.log("[play] blocked: not an action card:", cardId, card?.type);
        return prev;
      }

      const afterAction = actionPhase(prev, cardId);

      // ★ UI イベント & ログ更新（成功時のみ）
      const timestamp = Date.now();
      const uiEvt: UiEvent = { kind: "PLAY", cardId, timestamp };
      const cardName = card.name ?? cardId;

      setUiLastEvent(uiEvt);
      setUiRecentPlays((prevList) => [uiEvt, ...prevList].slice(0, 3));
      setLogs((prevLogs) => [
        `[PLAY] 「${cardName}」を使用`,
        ...prevLogs,
      ].slice(0, 100));

      return applyWithCpuTurn(afterAction);
    });
  };

  // プレイヤー側：BUY フェーズ中にカードを1枚購入
  const handleBuyCard = (cardId: string) => {
    setState((prev) => {
      if (prev.gameEnded) {
        console.log("[buy] blocked: game already ended");
        return prev;
      }
      if (prev.activePlayer !== "player") {
        console.log("[buy] blocked: not player turn");
        return prev;
      }
      if (prev.phase !== "BUY") {
        console.log("[buy] blocked: phase is not BUY:", prev.phase);
        return prev;
      }

      const pile = prev.supply[cardId];
      if (!pile || pile.remaining <= 0) {
        console.log("[buy] blocked: no supply or empty pile:", cardId);
        return prev;
      }

      // v2 仕様に基づき、米・知識条件をチェック（失敗時は state を変えない）
      if (!canBuyCard(prev.player, pile.card)) {
        console.log("[buy] blocked: rice/knowledge不足", {
          riceThisTurn: prev.player.riceThisTurn,
          knowledge: prev.player.knowledge,
          cost: pile.card.cost,
          knowledgeRequired: pile.card.knowledgeRequired,
        });
        return prev;
      }

      const afterBuy = buyPhase(prev, cardId);

      // ★ UI イベント & ログ更新（成功時のみ）
      const timestamp = Date.now();
      const uiEvt: UiEvent = { kind: "BUY", cardId, timestamp };
      const cardName = pile.card?.name ?? cardId;

      setUiLastEvent(uiEvt);
      setUiRecentBuys((prevList) => [uiEvt, ...prevList].slice(0, 3));
      setLogs((prevLogs) => [
        `[BUY] 「${cardName}」を購入`,
        ...prevLogs,
      ].slice(0, 100));

      return applyWithCpuTurn(afterBuy);
    });
  };

  // ★ UI 用の「拡張状態」：
  // - player.hand / cpu.hand をカードID配列 → Card配列に解決
  // - hoveredCard を state に埋め込んで GameScreen から参照できるようにする
  const viewState: any = React.useMemo(() => {
    const resolveHand = (ids: string[]): Card[] =>
      ids.map((id) => cardMap[id] ?? ({
        id,
        name: id,
        type: "resource",
        cost: 0,
        knowledgeRequired: 0,
        effects: [],
        text: ""
      } as Card));

    return {
      ...state,
      hoveredCard, // GameScreen 側の cardForDetail で使う
      // ★ UI 情報を埋め込む
      uiLastEvent,
      uiRecentBuys,
      uiRecentPlays,
      player: {
        ...state.player,
        hand: resolveHand(state.player.hand as unknown as string[])
      },
      cpu: {
        ...state.cpu,
        hand: resolveHand(state.cpu.hand as unknown as string[])
      }
    };
  }, [state, hoveredCard, cardMap, uiLastEvent, uiRecentBuys, uiRecentPlays]);

  return (
    <>
      <GameScreen
        state={viewState}          // ★ ここだけ state → viewState に変更
        logs={logs}                 // ★ [] → logs に変更
        onPlayHandCard={handlePlayHandCard}
        onBuyCard={handleBuyCard}
        onEndPhase={handleProceedPhase}
        onEndTurn={() => {}}
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