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
  onShowCardDetail: (card: Card) => void;
}

const GameScreen: React.FC<GameScreenProps> = ({
  state,
  onProceedPhase,
  onPlayActionCard,
  onBuyCard,
  onShowCardDetail
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

  // ↓ ここは detailCard ではなく、選択中の手札 id だけを持つ
  // const [detailCard, setDetailCard] = useState<Card | null>(null);
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

  // src/components/GameScreen.tsx （イメージ：return 部分）

return (
  <div className="hb-game-layout">
    {/* 1. 上部 HUD */}
    <header className="hb-game-header">
      <div className="hb-game-header-top">
        <div className="hb-game-title">
          History Build - 戦国デッキ v1.5
        </div>
        <div className="hb-game-status">
          <span className="hb-pill">ターン {state.turnCount}</span>
          <span className="hb-pill">
            手番{" "}
            <span className="font-bold">
              {isPlayerTurn ? "プレイヤー" : "CPU"}
            </span>
          </span>
          <span
            className={`
              hb-phase-badge
              hb-phase-badge-${state.phase.toLowerCase()}
            `}
          >
            フェーズ: {renderPhaseLabel(state.phase)}
          </span>
          <span className="hb-pill">
            山札 {player.deck.length} / 手札 {player.hand.length}
          </span>
        </div>
      </div>

      <div className="hb-game-resources">
        <ResourceBadge label="アクション" value={actionsLeft} />
        <ResourceBadge label="購入" value={buysLeft} />
        <ResourceBadge label="米" value={player.riceThisTurn} />
        <ResourceBadge label="知識" value={player.knowledge} />
      </div>
    </header>

    {/* 2. 中央 3 カラム */}
    <main className="hb-game-main">
      {/* 左: プレイヤー / CPU 情報 */}
      <aside className="hb-column hb-player-panel">
        <PlayerHud player={player} />
        <CpuHud cpu={cpu} gameEnded={state.gameEnded} state={state} />
      </aside>

      {/* 中央: サプライ + プレイエリア */}
      <section className="hb-column hb-center-area">
        <section className="hb-supply-area">
          <SupplyBoard
            supplyPiles={supplyPiles}
            state={state}
            onBuyCard={onBuyCard}
            onShowCardDetail={onShowCardDetail}
            onHoverCard={setHoveredCard}
          />
        </section>

        <section className="hb-play-area">
          <PlayArea
            state={state}
            getCardFromId={getCardFromId}
          />
        </section>
      </section>

      {/* 右: ログ / ガイド + カード簡易説明 */}
      <aside className="hb-column hb-log-panel">
        <GameLog phase={state.phase} />
        <CardHelpPanel hoveredCard={hoveredCard} />
      </aside>
    </main>

    {/* 3. 手札エリア */}
    <section className="hb-hand-area">
      <HandArea
        player={player}
        isPlayerTurn={isPlayerTurn}
        phase={state.phase}
        selectedHandId={selectedHandId}
        onSelectHandCard={handleSelectHandCard}
        onPlayFromHand={handlePlayFromHand}
        onShowDetail={onShowCardDetail}
        onHoverCard={setHoveredCard}
      />
    </section>

    {/* 4. 操作ボタン */}
    <footer className="hb-footer">
      <GameControls
        phase={state.phase}
        isPlayerTurn={isPlayerTurn}
        gameEnded={state.gameEnded}
        onProceedPhase={onProceedPhase}
      />
    </footer>
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

// GameScreen.tsx の下部などに追加

interface ResourceBadgeProps {
  label: string;
  value: number;
}

const ResourceBadge: React.FC<ResourceBadgeProps> = ({ label, value }) => (
  <div className="hb-resource-badge">
    <div className="hb-resource-label">{label}</div>
    <div className="hb-resource-value">{value}</div>
  </div>
);

interface PlayerHudProps {
  player: GameState["player"];
}

const PlayerHud: React.FC<PlayerHudProps> = ({ player }) => (
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
);

interface CpuHudProps {
  cpu: GameState["cpu"];
  gameEnded: boolean;
  state: GameState;
}

const CpuHud: React.FC<CpuHudProps> = ({ cpu, gameEnded, state }) => {
  const playerScore =
    gameEnded ? computeVictoryPointsForPlayer(state, "player") : null;
  const cpuScore =
    gameEnded ? computeVictoryPointsForPlayer(state, "cpu") : null;

  const winnerLabel =
    state.winner === "player"
      ? "あなたの勝ち！"
      : state.winner === "cpu"
      ? "CPU の勝ち"
      : "引き分け";

  return (
    <>
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

      {gameEnded && (
        <div className="hb-sidebar-panel border-amber-500/60 bg-amber-900/30">
          {/* 既存のゲーム終了パネルをそのまま移植 */}
          {/* ... */}
          <div className="text-xs space-y-1">
            <div>結果: {winnerLabel}</div>
            {/* 既存の collectHistoryCardNames の表示もここに */}
          </div>
        </div>
      )}
    </>
  );
};

interface SupplyBoardProps {
  supplyPiles: ReturnType<typeof Object.values<GameState["supply"]>>;
  state: GameState;
  onBuyCard: (cardId: string) => void;
  onShowCardDetail: (card: Card) => void;
  onHoverCard?: (card: Card | null) => void;
}

const SupplyBoard: React.FC<SupplyBoardProps> = ({
  supplyPiles,
  state,
  onBuyCard,
  onShowCardDetail,
  onHoverCard,
}) => {
  const player = state.player;
  const isPlayerTurn = state.activePlayer === "player";

  return (
    <div className="hb-card hb-supply-board">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold">場のカード（サプライ）</h2>
        <span className="text-[11px] text-slate-300">
          コストと知識条件をみて、どのカードを買うか考えよう
        </span>
      </div>

      <div className="hb-supply-area-grid">
        {supplyPiles.map((pile) => (
          <div
            key={pile.card.id}
            onMouseEnter={() => onHoverCard?.(pile.card)}
            onMouseLeave={() => onHoverCard?.(null)}
          >
            <SupplyCardPile
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
              onShowDetail={() => onShowCardDetail(pile.card)}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

interface PlayAreaProps {
  state: GameState;
  getCardFromId: (id: string) => Card | null;
}

const PlayArea: React.FC<PlayAreaProps> = ({ state, getCardFromId }) => {
  const player = state.player;
  const playedCards = player.played
    .map(getCardFromId)
    .filter((c): c is Card => !!c);

  return (
    <div className="hb-card hb-play-area-inner">
      <h2 className="text-sm font-semibold mb-1">プレイエリア</h2>
      <div className="text-[11px] text-slate-300 mb-2">
        このターンで場に出ているカードや、捨て札の山を確認できます。
      </div>

      <div className="hb-play-rows">
        <div>
          <div className="hb-play-label">プレイ中カード</div>
          <div className="hb-play-cards">
            {playedCards.length === 0 ? (
              <span className="hb-play-empty">（まだカードは出ていません）</span>
            ) : (
              playedCards.map((card) => (
                <div key={card.id} className="hb-play-card">
                  {/* 小さめ表示: CardView に variant="hand" などで流用 */}
                  <CardView card={card} variant="hand" />
                </div>
              ))
            )}
          </div>
        </div>

        <div className="hb-play-summary">
          <div>捨て札: {player.discard.length}枚</div>
          <div>山札残り: {player.deck.length}枚</div>
        </div>
      </div>
    </div>
  );
};

interface HandAreaProps {
  player: GameState["player"];
  isPlayerTurn: boolean;
  phase: GameState["phase"];
  selectedHandId: string | null;
  onSelectHandCard: (id: string) => void;
  onPlayFromHand: (id: string) => void;
  onShowDetail: (card: Card) => void;
  onHoverCard?: (card: Card | null) => void;
}

const HandArea: React.FC<HandAreaProps> = ({
  player,
  isPlayerTurn,
  phase,
  selectedHandId,
  onSelectHandCard,
  onPlayFromHand,
  onShowDetail,
  onHoverCard,
}) => {
  const getCardFromId = (id: string) =>
    player.hand.includes(id) ? id : null; // 実コードでは GameScreen 側の getCardFromId を渡す

  return (
    <div className="hb-hand-area-inner">
      <div className="hb-hand-header">
        <h2 className="text-sm font-semibold">手札</h2>
        <span className="text-[11px] text-slate-300">
          カードをクリックして選び、「つかう」ボタンでプレイ
        </span>
      </div>

      {player.hand.length === 0 ? (
        <div className="hb-hand-empty">
          手札がありません。次の自分のターン開始時に 5枚引きます。
        </div>
      ) : (
        <div className="hb-hand-row">
          {player.hand.map((cardId) => {
            const card = (window as any).getCardFromId?.(cardId); // 実装時は props で渡す
            if (!card) return null;
            const disabled =
              !isPlayerTurn ||
              phase !== "ACTION" ||
              (card.type !== "person" && card.type !== "event");

            return (
              <div
                key={card.id}
                onMouseEnter={() => onHoverCard?.(card)}
                onMouseLeave={() => onHoverCard?.(null)}
              >
                <HandCard
                  card={card}
                  selected={selectedHandId === card.id}
                  disabled={disabled}
                  onSelect={() => onSelectHandCard(card.id)}
                  onPlay={() => onPlayFromHand(card.id)}
                  onShowDetail={() => onShowDetail(card)}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

interface GameLogProps {
  phase: GameState["phase"];
}

const GameLog: React.FC<GameLogProps> = ({ phase }) => (
  <div className="hb-card hb-log">
    <div className="text-xs text-slate-300 mb-2">
      現在のフェーズ: <span className="font-semibold">{renderPhaseLabel(phase)}</span>
    </div>
    <div className="hb-log-section">
      <div className="font-semibold mb-1 text-sm">このターンで できること</div>
      <ol className="list-decimal list-inside space-y-0.5 text-[11px]">
        <li>DRAW：手札が5枚になるまで引く</li>
        <li>RESOURCE：資源カードをぜんぶ出して、米と知識をふやす</li>
        <li>ACTION：手札から 人物 / 出来事カードを1まい えらんで つかう</li>
        <li>BUY：米と知識をつかって、場のカードを1まい「買う」</li>
        <li>CLEANUP：カードを片づけて、次のプレイヤーへ手番を回す</li>
      </ol>
    </div>
  </div>
);

interface CardHelpPanelProps {
  hoveredCard: Card | null;
}

const CardHelpPanel: React.FC<CardHelpPanelProps> = ({ hoveredCard }) => (
  <div className="hb-card hb-help-panel">
    <h2 className="text-sm font-semibold mb-1">カードの説明</h2>
    {!hoveredCard ? (
      <div className="text-[11px] text-slate-400">
        サプライや手札のカードにマウスをのせると、ここに説明が表示されます。
      </div>
    ) : (
      <div className="text-[11px] space-y-1">
        <div className="font-bold text-slate-50">{hoveredCard.name}</div>
        <div className="text-slate-300">
          種別: {renderTypeLabel(hoveredCard.type)} / コスト: 米 {hoveredCard.cost} / 知識{" "}
          {hoveredCard.knowledgeRequired}
        </div>
        {hoveredCard.text && (
          <p className="mt-1 whitespace-pre-wrap">{hoveredCard.text}</p>
        )}
      </div>
    )}
  </div>
);

interface GameControlsProps {
  phase: GameState["phase"];
  isPlayerTurn: boolean;
  gameEnded: boolean;
  onProceedPhase: () => void;
}

const GameControls: React.FC<GameControlsProps> = ({
  phase,
  isPlayerTurn,
  gameEnded,
  onProceedPhase,
}) => {
  const isActionPhase = phase === "ACTION";
  const isBuyPhase = phase === "BUY";
  const isCleanupPhase = phase === "CLEANUP";

  const canProceed = isPlayerTurn && !gameEnded;

  return (
    <div className="hb-footer-inner">
      <div className="hb-footer-buttons">
        <button
          type="button"
          className={`
            hb-footer-button
            ${isActionPhase ? "hb-footer-button-primary" : "hb-footer-button-muted"}
          `}
          disabled={!isActionPhase}
        >
          カードをプレイ
        </button>

        <button
          type="button"
          className={`
            hb-footer-button
            ${isBuyPhase ? "hb-footer-button-primary" : "hb-footer-button-muted"}
          `}
          disabled={!isBuyPhase}
        >
          カードを購入
        </button>

        <button
          type="button"
          className={`
            hb-footer-button
            ${!isCleanupPhase ? "hb-footer-button-secondary" : "hb-footer-button-primary"}
          `}
          onClick={canProceed ? onProceedPhase : undefined}
          disabled={!canProceed}
        >
          フェーズ終了
        </button>

        <button
          type="button"
          className={`
            hb-footer-button
            ${isCleanupPhase ? "hb-footer-button-primary" : "hb-footer-button-muted"}
          `}
          onClick={canProceed && isCleanupPhase ? onProceedPhase : undefined}
          disabled={!canProceed || !isCleanupPhase}
        >
          ターン終了
        </button>
      </div>
    </div>
  );
};