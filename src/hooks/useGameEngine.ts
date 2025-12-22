// src/hooks/useGameEngine.ts

import { useCallback, useEffect, useMemo, useState } from "react";
import type { GameState, Card } from "../game/gameState";
import { createGameStateFromDeck } from "../logic/initGameState";
import type { DeckConfig } from "../ui/uiTypes";
import { dispatch } from "../game/core/reducer";
import type { Command } from "../game/core/types";

type UseGameEngineOptions = {
  deckConfig?: DeckConfig;
};

export function useGameEngine(options: UseGameEngineOptions = {}) {
  const { deckConfig } = options;

  const [state, setState] = useState<GameState | null>(null);
  const [cardMap, setCardMap] = useState<Record<string, Card>>({});
  const [ready, setReady] = useState(false);

  // 初期化：public/cards.json からカードを読み込み、GameState を構築
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const gameState = await createGameStateFromDeck(deckConfig);
      if (cancelled) return;

      setState(gameState);

      // supply から Card マップを構築（id → Card）
      const map: Record<string, Card> = {};
      for (const pile of Object.values(gameState.supply)) {
        map[pile.card.id] = pile.card;
      }
      setCardMap(map);
      setReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [deckConfig]);

  // 共通 dispatch
  const send = useCallback((cmd: Command) => {
    setState((prev) => (prev ? dispatch(prev, cmd) : prev));
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
        setState((prev) => {
          if (!prev) return prev;

          // まずプレイヤーの END_TURN を適用
          let s: GameState = dispatch(prev, { type: "END_TURN", playerId });
    
          // すでにゲーム終了ならそこで止める
          if (s.gameEnded) return s;
    
          // CPU の手番でなければ（例えば将来 2人プレイなど）そのまま返す
          if (s.activePlayer !== "cpu") return s;
    
          // --- ここから簡易 CPU ターン（何もプレイせず、資源→購入→終了だけ） ---
    
          // 1. 資源を自動プレイ（ACTION フェーズ想定）
          s = dispatch(s, { type: "AUTO_PLAY_RESOURCES", playerId: "cpu" });
    
          // 2. ACTION → BUY へ
          s = dispatch(s, { type: "END_PHASE", playerId: "cpu" });
    
          // 3. 何も買わずにターン終了（CLEANUP & 手番交代）
          s = dispatch(s, { type: "END_TURN", playerId: "cpu" });
    
          return s;
        });
      }, []);

  // UI 用 viewState（GameContainer と同様に hand を Card[] に解決）
  const viewState: any = useMemo(() => {
    if (!state) return null;

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
    ready,
    playCard,
    autoPlayResources,
    buyCard,
    endPhase,
    endTurn
  };
}