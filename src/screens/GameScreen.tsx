// src/screens/GameScreen.tsx

import React from "react";
import type { GameState, Card } from "../logic/cardEffects";

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

  // supply を配列に変換
  const supplyPiles = Object.values(state.supply);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      {/* ヘッダー */}
      <header className="p-4 border-b border-slate-700 flex items-center justify-between">
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
      </header>

      <main className="flex-1 grid grid-rows-[minmax(0,1.2fr)_minmax(0,1.3fr)] gap-4 p-4">
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
            <div className="grid grid-cols-3 gap-2 overflow-y-auto text-xs">
              {supplyPiles.map((pile) => (
                <SupplyCardPile
                  key={pile.card.id}
                  card={pile.card}
                  remaining={pile.remaining}
                  disabled={
                    !isPlayerTurn ||
                    state.isGameOver ||
                    pile.remaining <= 0
                  }
                  onBuy={() => onBuyCard(pile.card.id)}
                  riceThisTurn={player.riceThisTurn}
                />
              ))}
            </div>
          </div>
        </section>

        {/* 下段：プレイヤーエリア */}
        <section className="grid grid-rows-[auto_minmax(0,1fr)_auto] gap-3">
          {/* リソースバー */}
          <div className="border border-slate-700 rounded-lg p-3 bg-slate-800/60 flex items-center justify-between">
            <div className="flex items-center gap-6 text-sm">
              <div>
                <div className="text-xs text-slate-300">米（このターン）</div>
                <div className="text-lg font-bold">{player.riceThisTurn}</div>
              </div>
              <div>
                <div className="text-xs text-slate-300">知識（累積）</div>
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
                資源カードをぜんぶ出す
              </button>
              <button
                className="px-3 py-1 text-xs rounded bg-emerald-600 disabled:bg-slate-600 disabled:opacity-60"
                onClick={onEndTurn}
                disabled={!isPlayerTurn || state.isGameOver}
              >
                ターン終了
              </button>
            </div>
          </div>

          {/* 手札 */}
          <div className="border border-slate-700 rounded-lg p-3 bg-slate-800/60 flex flex-col">
            <h2 className="text-sm font-semibold mb-2">手札</h2>
            {player.hand.length === 0 ? (
              <div className="text-xs text-slate-300">手札がありません。</div>
            ) : (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {player.hand.map((card) => (
                  <HandCard
                    key={card.id}
                    card={card}
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

          {/* 山札・捨札などの情報 */}
          <div className="flex gap-3 text-xs">
            <div className="flex-1 border border-slate-700 rounded-lg p-2 bg-slate-800/60">
              <div>山札: {player.deck.length}枚</div>
              <div>捨札: {player.discard.length}枚</div>
              <div>プレイ中: {player.playArea.length}枚</div>
            </div>
            {state.isGameOver && (
              <div className="flex-1 border border-amber-500 rounded-lg p-2 bg-amber-500/10">
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
            )}
          </div>
        </section>
      </main>
    </div>
  );
};

export default GameScreen;

//------------------------------------------------------
// サブコンポーネント
//------------------------------------------------------

interface SupplyCardPileProps {
  card: Card;
  remaining: number;
  riceThisTurn: number;
  disabled: boolean;
  onBuy: () => void;
}

const SupplyCardPile: React.FC<SupplyCardPileProps> = ({
  card,
  remaining,
  riceThisTurn,
  disabled,
  onBuy
}) => {
  const canAfford = riceThisTurn >= card.cost;
  const isDepleted = remaining <= 0;

  return (
    <div className="border border-slate-600 rounded-md p-2 flex flex-col justify-between bg-slate-900/70">
      <div>
        <div className="text-xs font-semibold mb-1">{card.name}</div>
        <div className="text-[10px] text-slate-300 mb-1">
          種類: {renderTypeLabel(card.type)}
        </div>
        <div className="text-[10px] text-slate-300 mb-1">
          コスト: 米 {card.cost}
        </div>
        <div className="text-[10px] text-slate-400 line-clamp-3">{card.text}</div>
      </div>
      <div className="mt-2 flex items-center justify-between text-[10px]">
        <span>のこり: {remaining}枚</span>
        <button
          className="px-2 py-1 rounded bg-indigo-600 disabled:bg-slate-700 disabled:opacity-60"
          onClick={onBuy}
          disabled={disabled || isDepleted || !canAfford}
        >
          買う
        </button>
      </div>
    </div>
  );
};

interface HandCardProps {
  card: Card;
  disabled: boolean;
  onPlay: () => void;
}

const HandCard: React.FC<HandCardProps> = ({ card, disabled, onPlay }) => {
  const isAction = card.type === "character" || card.type === "event";

  return (
    <div className="min-w-[120px] max-w-[160px] border border-slate-600 rounded-md p-2 bg-slate-900/80 flex flex-col justify-between">
      <div>
        <div className="text-xs font-semibold mb-1">{card.name}</div>
        <div className="text-[10px] text-slate-300 mb-1">
          種類: {renderTypeLabel(card.type)}
        </div>
        <div className="text-[10px] text-slate-300 mb-1">
          コスト: 米 {card.cost}
        </div>
        <div className="text-[10px] text-slate-400 line-clamp-3">{card.text}</div>
      </div>
      <div className="mt-2 flex justify-end">
        {isAction ? (
          <button
            className="px-2 py-1 rounded bg-emerald-600 text-[10px] disabled:bg-slate-700 disabled:opacity-60"
            onClick={onPlay}
            disabled={disabled}
          >
            つかう
          </button>
        ) : (
          <span className="text-[10px] text-slate-500">（自動でつかわれる）</span>
        )}
      </div>
    </div>
  );
};

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
