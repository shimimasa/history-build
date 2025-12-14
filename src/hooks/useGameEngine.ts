// src/hooks/useGameEngine.ts

import { useCallback, useMemo, useState } from "react";
import type { GameState, Card } from "../game/gameState";
import { createGameStateFromDeck } from "../logic/initGameState";
import { createCardMap } from "../game/cardDefinitions";
import type { DeckConfig } from "../ui/uiTypes";
import { dispatch } from "../game/core/reducer";
import type { Command } from "../game/core/types";

type UseGameEngineOptions = {
  deckConfig?: DeckConfig;
};

export function useGameEngine(options: UseGameEngineOptions = {}) {
  const { deckConfig } = options;

  const [state, setState] = useState<GameState>(() =>
    createGameStateFromDeck(deckConfig)
  );

  // カードマップ
  const cardMap = useMemo(() => createCardMap(), []);

  // 共通 dispatch
  const send = useCallback((cmd: Command) => {
    setState((prev) => dispatch(prev, cmd));
  }, []);

  // プレイヤー専用ラッパ
  const playerId: "player" = "player";

  const playCard = useCallback(
    (cardId: string) => {
      send({ type: "PLAY_CARD", playerId, cardId });
    },
    [send]
  );

  const autoPlayResources = useCallback(() => {
    send({ type: "AUTO_PLAY_RESOURCES", playerId });
  }, [send]);

  const buyCard = useCallback(
    (supplyCardId: string) => {
      send({ type: "BUY_CARD", playerId, supplyCardId });
    },
    [send]
  );

  const endPhase = useCallback(() => {
    send({ type: "END_PHASE", playerId });
  }, [send]);

  const endTurn = useCallback(() => {
    send({ type: "END_TURN", playerId });
    // TODO: CPU ターンを新コアで自動実行する場合はここで CPU 側にもコマンドを送る
  }, [send]);

  // UI 用 viewState（GameContainer と同様に hand を Card[] に解決）
  const viewState: any = useMemo(() => {
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
      player: {
        ...state.player,
        hand: resolveHand(state.player.hand as unknown as string[])
      },
      cpu: {
        ...state.cpu,
        hand: resolveHand(state.cpu.hand as unknown as string[])
      }
    };
  }, [state, cardMap]);

  return {
    state,
    viewState,
    playCard,
    autoPlayResources,
    buyCard,
    endPhase,
    endTurn
  };
}