// src/containers/GameContainer.tsx

import React, { useState } from "react";
import GameScreen from "../screens/GameScreen";
import { initGameState } from "../logic/initGameState";
import {
  GameState,
  PlayerState,
  Card
} from "../logic/cardEffects";
import {
  startTurn,
  playAllResources,
  playActionCardById,
  buyCardById,
  endTurn,
  runCpuTurn
} from "../logic/turnFlow";
import {
  chooseCpuActionCardId,
  chooseCpuBuyCardId
} from "../logic/cpuLogic";

//------------------------------------------------------
// GameState の簡易ディープコピー
// （配列・オブジェクトをコピーしてからロジック関数に渡す）
//------------------------------------------------------

function clonePlayer(p: PlayerState): PlayerState {
  return {
    ...p,
    deck: [...p.deck],
    hand: [...p.hand],
    discard: [...p.discard],
    playArea: [...p.playArea],
    temporaryDiscounts: [...p.temporaryDiscounts]
  };
}

function cloneGameState(state: GameState): GameState {
  const clonedSupply: GameState["supply"] = {};
  for (const key of Object.keys(state.supply)) {
    const pile = state.supply[key];
    clonedSupply[key] = {
      card: pile.card,        // Card は不変オブジェクトとして扱う
      remaining: pile.remaining
    };
  }

  return {
    ...state,
    player: clonePlayer(state.player),
    cpu: clonePlayer(state.cpu),
    supply: clonedSupply
  };
}

//------------------------------------------------------
// コンテナ本体
//------------------------------------------------------

const GameContainer: React.FC = () => {
  // 初期状態：ゲームを初期化してから、プレイヤーの最初のターンを開始
  const [state, setState] = useState<GameState>(() => {
    const s = initGameState();
    return startTurn(s);
  });

  // プレイヤー：資源フェーズ（資源カードを全部出す）
  const handlePlayAllResources = () => {
    if (state.isGameOver || state.currentTurn !== "player") return;

    setState((prev) => {
      const draft = cloneGameState(prev);
      return playAllResources(draft, "player");
    });
  };

  // プレイヤー：行動カード（人物 or 出来事）を1枚出す
  const handlePlayActionCard = (cardId: string) => {
    if (state.isGameOver || state.currentTurn !== "player") return;

    setState((prev) => {
      const draft = cloneGameState(prev);
      return playActionCardById(draft, "player", cardId);
    });
  };

  // プレイヤー：カードを1枚購入
  const handleBuyCard = (cardId: string) => {
    if (state.isGameOver || state.currentTurn !== "player") return;

    setState((prev) => {
      const draft = cloneGameState(prev);
      return buyCardById(draft, "player", cardId);
    });
  };

  // プレイヤー：ターン終了 → CPUターン自動 → プレイヤー次ターン開始
  const handleEndTurn = () => {
    if (state.isGameOver || state.currentTurn !== "player") return;

    setState((prev) => {
      let draft = cloneGameState(prev);

      // 1. プレイヤーのターンを終了
      draft = endTurn(draft);
      if (draft.isGameOver) {
        return draft;
      }

      // 2. CPU のターンを自動で1ターン分まわす
      draft = runCpuTurn(draft, chooseCpuActionCardId, chooseCpuBuyCardId);
      if (draft.isGameOver) {
        return draft;
      }

      // 3. 現在の手番は再びプレイヤーになっているはずなので、次ターンを開始
      draft = startTurn(draft);

      return draft;
    });
  };

  return (
    <GameScreen
      state={state}
      onPlayAllResources={handlePlayAllResources}
      onPlayActionCard={handlePlayActionCard}
      onBuyCard={handleBuyCard}
      onEndTurn={handleEndTurn}
    />
  );
};

export default GameContainer;
