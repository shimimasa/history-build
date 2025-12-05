// src/screens/GameScreen.tsx

import React, { useState } from "react";
import type { GameState, Card } from "../logic/cardEffects";
import SupplyCardPile from "../components/SupplyCardPile";
import HandCard from "../components/HandCard";

interface GameScreenProps {
  state: GameState;
  // フェーズごとの操作は親コンポーネントが実装して渡す
  onPlayAllResources: () => void;
  onPlayActionCard: (cardId: string) => void;
  onBuyCard: (cardId: string) => void;
  onEndTurn: () => void;
}

const GameScreen: React.FC<GameScreenProps> = ({
  state,
  onPlayAllResources,
  onPlayActionCard,
  onBuyCard,
  onEndTurn
}) => {
  const player = state.player;
  const cpu = state.cpu;
  const isPlayerTurn = state.currentTurn === "player";

  // supply を配列に変換（タイプとコスト順に並べて分かりやすく表示）
  const supplyPiles = Object.values(state.supply).sort((a, b) => {
    const order: Record<Card["type"], number> = {
      resource: 0,
      character: 1,
      event: 2,
      victory: 3
    };

    const typeOrderDiff = order[a.card.type] - order[b.card.type];
    if (typeOrderDiff !== 0) return typeOrderDiff;

    // 同じタイプならコストの安い順
    return a.card.cost - b.card.cost;
  });

  const [detailCard, setDetailCard] = useState<Card | null>(null);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      {/* ヘッダー（中央揃え・盤面幅固定） */}
      <header className="border-b border-slate-700">
        <div className="w-full max-w-6xl mx-auto p-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">History Build - 戦国デッキ v1</h1>
          <div className="text-sm">
            <span className="mr-4">
              ターン: <span className="font-semibold">{state.turnNumber}</span>
            </span>
            <span>
              手番:{" "}
              <span className="font-semibold">
                {isPlayerTurn ? "プレイヤー" : "CPU"}
              </span>
            </span>
          </div>
        </div>
      </header>

      {/* 盤面エリア（中央・max-w-6xl）＋ 下部の手札バー */}
      <div className="flex-1 w-full flex flex-col items-center">
        <main className="w-full max-w-6xl flex-1 grid grid-rows-[minmax(0,1.2fr)_minmax(0,1.3fr)] gap-4 px-4 py-3">
          {/* 上段：CPUエリア＋サプライ */}
          <section className="grid grid-cols-[0.8fr_minmax(0,2fr)] gap-4">
            {/* CPU 情報 */}
            <div className="border border-slate-700 rounded-lg p-3 bg-slate-800/60">
              <h2 className="text-sm font-semibold mb-2">CPU 情報</h2>
              <div className="space-y-1 text-xs">
                <div>ターン数: {cpu.turnsTaken}</div>
                <div>山札: {cpu.deck.length}枚</div>
                <div>捨札: {cpu.discard.length}枚</div>
                <div>手札: {cpu.hand.length}枚</div>
                <div>プレイ中: {cpu.playArea.length}枚</div>
                {/* 最終スコアは結果画面で計算する想定なのでここでは概略だけ */}
              </div>
            </div>

            {/* サプライ（場に出ている購入可能カード） */}
            <div className="border border-slate-700 rounded-lg p-3 bg-slate-800/60 flex flex-col">
              <h2 className="text-sm font-semibold mb-2">場のカード（サプライ）</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 text-xs">
                {supplyPiles.map((pile) => (
                  <SupplyCardPile
                    key={pile.card.id}
                    card={pile.card}
                    remaining={pile.remaining}
                    riceThisTurn={player.riceThisTurn}
                    disabled={
                      !isPlayerTurn ||
                      state.isGameOver ||
                      pile.remaining <= 0
                    }
                    onBuy={() => onBuyCard(pile.card.id)}
                    onShowDetail={() => setDetailCard(pile.card)}
                  />
                ))}
              </div>
            </div>
          </section>

          {/* 下段：プレイヤー情報（手札以外） */}
          <section className="grid grid-rows-[auto_auto_auto] gap-3">
            {/* リソースバー */}
            <div className="border border-slate-700 rounded-lg p-3 bg-slate-800/60 flex items-center justify-between">
              <div className="flex items-center gap-6 text-sm">
                <div>
                  <div className="text-xs text-slate-300">
                    米（このターンつかえる お金）
                  </div>
                  <div className="text-lg font-bold">{player.riceThisTurn}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-300">
                    知識（ゲーム中ずっと たまる）
                  </div>
                  <div className="text-lg font-bold">{player.knowledge}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-300">自分のターン数</div>
                  <div className="text-lg font-bold">{player.turnsTaken}</div>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  className="px-3 py-1 text-xs rounded bg-sky-600 disabled:bg-slate-600 disabled:opacity-60"
                  onClick={onPlayAllResources}
                  disabled={!isPlayerTurn || state.isGameOver}
                >
                  ① 資源カードをぜんぶ出す
                </button>
                <button
                  className="px-3 py-1 text-xs rounded bg-emerald-600 disabled:bg-slate-600 disabled:opacity-60"
                  onClick={onEndTurn}
                  disabled={!isPlayerTurn || state.isGameOver}
                >
                  ④ ターン終了
                </button>
              </div>
            </div>

            {/* このゲームの 1ターンの流れガイド */}
            <div className="border border-slate-700 rounded-lg p-2 bg-slate-900/60 text-[11px] text-slate-200">
              <div className="font-semibold mb-1">このターンで できること</div>
              <ol className="list-decimal list-inside space-y-0.5">
                <li>資源カードをぜんぶ出して、米と知識をふやす</li>
                <li>手札から 人物 / 出来事カードを1まい えらんで つかう</li>
                <li>たまった米で、場のカードを1まい「買う」</li>
                <li>おわったら「④ ターン終了」ボタンを おす</li>
              </ol>
            </div>

            {/* 山札・捨札などの情報 + ゲーム終了時の復習リスト */}
            <div className="flex gap-3 text-xs">
              <div className="flex-1 border border-slate-700 rounded-lg p-2 bg-slate-800/60">
                <div>山札: {player.deck.length}枚</div>
                <div>捨札: {player.discard.length}枚</div>
                <div>プレイ中: {player.playArea.length}枚</div>
              </div>
              {state.isGameOver && (
                <div className="flex-1 border border-amber-500 rounded-lg p-2 bg-amber-500/10 space-y-2">
                  <div>
                    <div className="font-semibold mb-1">ゲーム終了</div>
                    <div className="text-sm">
                      勝者:{" "}
                      <span className="font-bold">
                        {state.winner === "player"
                          ? "プレイヤー"
                          : state.winner === "cpu"
                          ? "CPU"
                          : "引き分け"}
                      </span>
                    </div>
                  </div>

                  {/* このゲームで登場した 人物・出来事リスト（ミニ復習） */}
                  <div className="text-[11px]">
                    <div className="font-semibold mb-1">
                      このゲームで出てきた 人物・出来事
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {collectHistoryCardNames(state).map((name) => (
                        <span
                          key={name}
                          className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/60"
                        >
                          {name}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>
        </main>

        {/* 画面下部固定の手札エリア（横スクロール） */}
        <section className="w-full max-w-6xl px-4 pb-4 sticky bottom-0 z-30">
          <div className="border border-slate-700 rounded-t-lg bg-slate-900/95">
            <div className="px-3 py-2 border-b border-slate-700 flex items-center justify-between">
              <h2 className="text-sm font-semibold">手札</h2>
              <span className="text-[11px] text-slate-300">
                左右にスクロールして すべてのカードを見られます
              </span>
            </div>
            {player.hand.length === 0 ? (
              <div className="px-3 py-3 text-xs text-slate-300">
                手札がありません。
              </div>
            ) : (
              <div className="px-3 py-2 flex gap-2 overflow-x-auto pb-2">
                {player.hand.map((card) => (
                  <HandCard
                    key={card.id}
                    card={card}
                    onShowDetail={() => setDetailCard(card)}
                    disabled={
                      !isPlayerTurn ||
                      state.isGameOver ||
                      (card.type !== "character" && card.type !== "event")
                    }
                    onPlay={() => onPlayActionCard(card.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
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
    case "character":
      return "人物";
    case "event":
      return "出来事";
    case "victory":
      return "国力";
    default:
      return "";
  }
}

/**
 * このゲームで登場した「人物」「出来事」カード名をユニークに集める。
 * v1 では結果画面を分けないため、GameScreen 内でミニ復習用に使う。
 */
function collectHistoryCardNames(state: GameState): string[] {
  const names = new Set<string>();

  const collectFromPlayer = (p: GameState["player"]) => {
    const allCards: Card[] = [
      ...p.deck,
      ...p.hand,
      ...p.discard,
      ...p.playArea
    ];

    for (const card of allCards) {
      if (card.type === "character" || card.type === "event") {
        names.add(card.name);
      }
    }
  };

  collectFromPlayer(state.player);
  collectFromPlayer(state.cpu);

  return Array.from(names).sort();
}
