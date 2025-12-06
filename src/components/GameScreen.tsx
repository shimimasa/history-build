// src/components/GameScreen.tsx

import React, { useState } from "react";
import type { GameState, Card } from "../game/gameState";
import { canBuyCard } from "../logic/cardEffects";
import { computeVictoryPointsForPlayer } from "../game/socre";
import SupplyCardPile from "./SupplyCard";
import HandCard from "./HandCard";

interface GameScreenProps {
  state: GameState;
  onProceedPhase: () => void;
  onPlayActionCard: (cardId: string) => void;
  onBuyCard: (cardId: string) => void;
}

const GameScreen: React.FC<GameScreenProps> = ({
  state,
  onProceedPhase,
  onPlayActionCard,
  onBuyCard
}) => {
  const player = state.player;
  const cpu = state.cpu;
  const isPlayerTurn = state.activePlayer === "player";
  const isActionPhase = state.phase === "ACTION";
  const isBuyPhase = state.phase === "BUY";

  // v2: アクション残り1/0・購入残り1/0はフェーズで管理
  const actionsLeft = isPlayerTurn && isActionPhase ? 1 : 0;
  const buysLeft = isPlayerTurn && isBuyPhase ? 1 : 0;

  // ゲーム終了時のみスコアを計算
  const playerScore =
    state.gameEnded ? computeVictoryPointsForPlayer(state, "player") : null;
  const cpuScore =
    state.gameEnded ? computeVictoryPointsForPlayer(state, "cpu") : null;

  // supply を配列に変換（タイプとコスト順に並べて分かりやすく表示）
  const supplyPiles = Object.values(state.supply).sort((a, b) => {
    const order: Record<Card["type"], number> = {
      resource: 0,
      person: 1,
      event: 2,
      victory: 3
    };

    const typeOrderDiff = order[a.card.type] - order[b.card.type];
    if (typeOrderDiff !== 0) return typeOrderDiff;

    // 同じタイプならコストの安い順
    return a.card.cost - b.card.cost;
  });

  const [detailCard, setDetailCard] = useState<Card | null>(null);
  const [selectedHandId, setSelectedHandId] = useState<string | null>(null);

  const handleSelectHandCard = (cardId: string) => {
    setSelectedHandId((prev) => (prev === cardId ? null : cardId));
  };

  const handlePlayFromHand = (cardId: string) => {
    onPlayActionCard(cardId);
    setSelectedHandId((prev) => (prev === cardId ? null : prev));
  };

  const getCardFromId = (cardId: string): Card | null => {
    return state.supply[cardId]?.card ?? null;
  };

  const phaseLabel = getPhaseButtonLabel(state.phase);

  const winnerLabel =
    state.winner === "player"
      ? "あなたの勝ち！"
      : state.winner === "cpu"
      ? "CPU の勝ち"
      : "引き分け";

  return (
    <div className="hb-app">
      {/* ===== 上部：タイトル + ターン情報 + ステータスバー ===== */}
      <header className="hb-header">
        <div className="hb-header-inner">
          <div className="hb-header-title">
            History Build - 戦国デッキ v1.5
          </div>
          <div className="hb-header-turn">
            <div className="hb-pill">
              ターン{" "}
              <span className="font-bold text-sky-200">
                {state.turnCount}
              </span>
            </div>
            <div className="hb-pill">
              手番{" "}
              <span className="font-bold text-emerald-200">
                {isPlayerTurn ? "プレイヤー" : "CPU"}
              </span>
            </div>
            <div className="hb-pill">
              フェーズ{" "}
              <span className="font-bold text-amber-200">
                {renderPhaseLabel(state.phase)}
              </span>
            </div>
          </div>
        </div>

        <div className="hb-status-row">
          <div className="hb-status-tile">
            <div className="hb-status-icon text-sky-300">A</div>
            <div className="text-xs">
              <div className="text-slate-300">アクション</div>
              <div className="text-lg font-bold">{actionsLeft}</div>
            </div>
          </div>
          <div className="hb-status-tile">
            <div className="hb-status-icon text-indigo-300">B</div>
            <div className="text-xs">
              <div className="text-slate-300">購入</div>
              <div className="text-lg font-bold">{buysLeft}</div>
            </div>
          </div>
          <div className="hb-status-tile">
            <div className="hb-status-icon text-amber-300">米</div>
            <div className="text-xs">
              <div className="text-slate-300">
                このターンつかえる お金
              </div>
              <div className="text-lg font-bold">{player.riceThisTurn}</div>
            </div>
          </div>
          <div className="hb-status-tile">
            <div className="hb-status-icon text-lime-300">知</div>
            <div className="text-xs">
              <div className="text-slate-300">
                ゲーム中ずっと たまる 知識
              </div>
              <div className="text-lg font-bold">{player.knowledge}</div>
            </div>
          </div>
        </div>
      </header>

      {/* ===== 中央：左サイドバー + サプライボード ===== */}
      <div className="hb-main-board">
        <div className="hb-board-inner">
          {/* 左：プレイヤー情報 / CPU情報 / ゲーム結果 */}
          <aside className="hb-sidebar">
            <div className="hb-sidebar-panel">
              <h2 className="text-sm font-semibold mb-1">プレイヤー情報</h2>
              <div className="space-y-1 text-xs">
                <div>山札: {player.deck.length}枚</div>
                <div>手札: {player.hand.length}枚</div>
                <div>捨札: {player.discard.length}枚</div>
                <div>プレイ中: {player.played.length}枚</div>
                <div>自分のターン数: {player.turnsTaken}</div>
                <div>知識: {player.knowledge}</div>
              </div>
            </div>

            <div className="hb-sidebar-panel">
              <h2 className="text-sm font-semibold mb-1">CPU 情報</h2>
              <div className="space-y-1 text-xs">
                <div>ターン数: {cpu.turnsTaken}</div>
                <div>山札: {cpu.deck.length}枚</div>
                <div>手札: {cpu.hand.length}枚</div>
                <div>捨札: {cpu.discard.length}枚</div>
                <div>プレイ中: {cpu.played.length}枚</div>
              </div>
            </div>

            {state.gameEnded && (
              <div className="hb-sidebar-panel border-amber-500/60 bg-amber-900/30">
                <h2 className="text-sm font-semibold mb-1 text-amber-200">
                  ゲーム終了
                </h2>
                <div className="text-xs space-y-1">
                  <div>
                    勝者:{" "}
                    <span className="font-bold">
                      {state.winner === "player"
                        ? "プレイヤー"
                        : state.winner === "cpu"
                        ? "CPU"
                        : "引き分け"}
                    </span>
                  </div>

                  {/* 最終スコア表示 */}
                  {playerScore !== null && cpuScore !== null && (
                    <div className="mt-1 space-y-0.5">
                      <div>プレイヤー: {playerScore} 点</div>
                      <div>CPU: {cpuScore} 点</div>
                      <div className="mt-1 text-[11px] text-amber-100">
                        結果: <span className="font-semibold">{winnerLabel}</span>
                      </div>
                    </div>
                  )}

                  <div className="mt-3 text-[11px] text-amber-100">
                    このゲームで出てきた 人物・出来事
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {collectHistoryCardNames(state).map((name) => (
                      <span
                        key={name}
                        className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/60 text-[11px]"
                      >
                        {name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </aside>

          {/* 中央：サプライボード */}
          <main className="hb-supply">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">
                場のカード（サプライ）
              </h2>
              <span className="text-[11px] text-slate-300">
                コストと知識条件をみて、どのカードを買うか考えよう
              </span>
            </div>

            <div className="hb-supply-grid text-xs">
              {supplyPiles.map((pile) => (
                <SupplyCardPile
                  key={pile.card.id}
                  card={pile.card}
                  remaining={pile.remaining}
                  canBuy={canBuyCard(player, pile.card)}
                  disabled={
                    !isPlayerTurn ||
                    state.gameEnded ||
                    pile.remaining <= 0 ||
                    state.phase !== "BUY"
                  }
                  onBuy={() => onBuyCard(pile.card.id)}
                  onShowDetail={() => setDetailCard(pile.card)}
                />
              ))}
            </div>

            {/* このターンの流れガイド */}
            <div className="mt-3 border border-slate-700 rounded-lg bg-slate-900/70 px-3 py-2 text-[11px] text-slate-200">
              <div className="font-semibold mb-1">
                このターンで できること
              </div>
              <ol className="list-decimal list-inside space-y-0.5">
                <li>DRAW：手札が5枚になるまで引く</li>
                <li>RESOURCE：資源カードをぜんぶ出して、米と知識をふやす</li>
                <li>ACTION：手札から 人物 / 出来事カードを1まい えらんで つかう</li>
                <li>BUY：米と知識をつかって、場のカードを1まい「買う」</li>
                <li>CLEANUP：カードを片づけて、次のプレイヤーへ手番を回す</li>
              </ol>
            </div>
          </main>
        </div>
      </div>

      {/* ===== 下：手札エリア（sticky bottom） ===== */}
      <section className="hb-hand-bar sticky bottom-0 z-30">
        <div className="hb-hand-inner">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1 mb-2">
            <h2 className="text-sm font-semibold">手札</h2>
            <span className="text-[11px] text-slate-300">
              カードをクリックして えらび、「つかう」ボタンでプレイ
            </span>
          </div>
          {player.hand.length === 0 ? (
            <div className="py-3 text-xs text-slate-300">
              手札がありません。次の自分のターン開始時に 5枚引きます。
            </div>
          ) : (
            <div className="hb-hand-scroll">
              {player.hand.map((cardId) => {
                const card = getCardFromId(cardId);
                if (!card) return null;
                return (
                  <HandCard
                    key={card.id}
                    card={card}
                    selected={selectedHandId === card.id}
                    onSelect={() => handleSelectHandCard(card.id)}
                    disabled={
                      !isPlayerTurn ||
                      state.gameEnded ||
                      state.phase !== "ACTION" ||
                      (card.type !== "person" && card.type !== "event")
                    }
                    onShowDetail={() => setDetailCard(card)}
                    onPlay={() => handlePlayFromHand(card.id)}
                  />
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ===== 右下：フェーズボタン ===== */}
      <div className="hb-phase-buttons">
        <button
          className="px-4 py-2 text-xs rounded-full bg-sky-600 hover:bg-sky-500 text-white shadow-md disabled:bg-slate-600 disabled:opacity-60"
          onClick={onProceedPhase}
          disabled={!isPlayerTurn || state.gameEnded}
        >
          {phaseLabel}
        </button>
      </div>

      {/* カード詳細ポップアップ（学習モードライト版） */}
      {detailCard && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-slate-900 border border-slate-600 rounded-lg shadow-xl p-4 w-[90%] max-w-sm">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-sm font-bold">{detailCard.name}</h2>
              <button
                className="text-xs text-slate-300 hover:text-white"
                onClick={() => setDetailCard(null)}
              >
                とじる
              </button>
            </div>
            <div className="text-[11px] text-slate-300 mb-1">
              種類: {renderTypeLabel(detailCard.type)}
            </div>
            <div className="text-[11px] text-slate-300 mb-1">
              コスト: 米 {detailCard.cost}
            </div>
            <div className="text-[11px] text-slate-300 mb-1">
              知識条件: {detailCard.knowledgeRequired}
            </div>
            <div className="text-[12px] text-slate-100 whitespace-pre-wrap mt-2">
              {detailCard.text}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameScreen;

//------------------------------------------------------
// 表示用ヘルパー
//------------------------------------------------------

function renderTypeLabel(type: Card["type"]): string {
  switch (type) {
    case "resource":
      return "資源";
    case "person":
      return "人物";
    case "event":
      return "出来事";
    case "victory":
      return "国力";
    default:
      return "";
  }
}

function renderPhaseLabel(phase: GameState["phase"]): string {
  switch (phase) {
    case "DRAW":
      return "DRAW（ドロー）";
    case "RESOURCE":
      return "RESOURCE（資源）";
    case "ACTION":
      return "ACTION（行動）";
    case "BUY":
      return "BUY（購入）";
    case "CLEANUP":
      return "CLEANUP（片づけ）";
    default:
      return "";
  }
}

function getPhaseButtonLabel(phase: GameState["phase"]): string {
  switch (phase) {
    case "DRAW":
      return "① DRAW を終えて RESOURCE へ進む";
    case "RESOURCE":
      return "② RESOURCE を終えて ACTION へ進む";
    case "ACTION":
      return "③ ACTION を終えて BUY へ進む";
    case "BUY":
      return "④ BUY を終えて CLEANUP へ進む";
    case "CLEANUP":
      return "ターン終了して次の手番へ";
    default:
      return "次のフェーズへ進む";
  }
}

/**
 * このゲームで登場した「人物」「出来事」カード名をユニークに集める。
 * - v2 GameState（deck/hand/discard/played は CardId 配列）を前提とし、
 *   state.supply から Card 定義を引き当てる。
 */
function collectHistoryCardNames(state: GameState): string[] {
  const names = new Set<string>();

  const collectFromPlayer = (p: GameState["player"]) => {
    const allIds: string[] = [
      ...p.deck,
      ...p.hand,
      ...p.discard,
      ...p.played
    ];

    for (const id of allIds) {
      const card = state.supply[id]?.card;
      if (!card) continue;
      if (card.type === "person" || card.type === "event") {
        names.add(card.name);
      }
    }
  };

  collectFromPlayer(state.player);
  collectFromPlayer(state.cpu);

  return Array.from(names).sort();
}