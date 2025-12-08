// src/components/GameScreen.tsx

import React, { useState } from "react";
import type { GameState, Card } from "../game/gameState";
import { canBuyCard } from "../logic/cardEffects";
import { computeVictoryPointsForPlayer } from "../game/socre";
import SupplyCardPile from "./SupplyCard";
import HandCard from "./HandCard";
import { CardView } from "./CardView";

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

  // v2: 残りアクション / 残り購入はフェーズ基準で簡易表示
  const actionsLeft = isPlayerTurn && isActionPhase ? 1 : 0;
  const buysLeft = isPlayerTurn && isBuyPhase ? 1 : 0;

  // サプライを type → cost 順で並べる
  const supplyPiles = Object.values(state.supply).sort((a, b) => {
    const order: Record<Card["type"], number> = {
      resource: 0,
      person: 1,
      event: 2,
      victory: 3
    };
    const diff = order[a.card.type] - order[b.card.type];
    if (diff !== 0) return diff;
    return a.card.cost - b.card.cost;
  });

  // 選択中 / ホバー中
  const [selectedHandId, setSelectedHandId] = useState<string | null>(null);
  const [selectedSupplyId, setSelectedSupplyId] = useState<string | null>(null);
  const [hoveredCard, setHoveredCard] = useState<Card | null>(null);

  const handleSelectHandCard = (cardId: string) => {
    setSelectedHandId(prev => (prev === cardId ? null : cardId));
  };

  const handlePlayFromHand = (cardId: string) => {
    onPlayActionCard(cardId);
    setSelectedHandId(prev => (prev === cardId ? null : prev));
  };

  const handleSelectSupply = (cardId: string) => {
    setSelectedSupplyId(prev => (prev === cardId ? null : cardId));
  };

  const getCardFromId = (cardId: string): Card | null =>
    state.supply[cardId]?.card ?? null;

  const canPlaySelected =
    isPlayerTurn && state.phase === "ACTION" && selectedHandId !== null;
  const canBuySelected =
    isPlayerTurn && state.phase === "BUY" && selectedSupplyId !== null;

  const handlePlaySelected = () => {
    if (!canPlaySelected || !selectedHandId) return;
    onPlayActionCard(selectedHandId);
    setSelectedHandId(null);
  };

  const handleBuySelected = () => {
    if (!canBuySelected || !selectedSupplyId) return;
    onBuyCard(selectedSupplyId);
    setSelectedSupplyId(null);
  };

  return (
    <div className="hb-game-layout">
      {/* 1. ヘッダー */}
      <header className="hb-game-header">
        <div className="hb-game-header-top">
          <div className="hb-game-title">History Build - 戦国デッキ v1.5</div>
          <div className="hb-game-status">
            <span className="hb-pill">ターン {state.turnCount}</span>
            <span className="hb-pill">
              手番{" "}
              <span className="font-bold">
                {isPlayerTurn ? "プレイヤー" : "CPU"}
              </span>
            </span>
            <span
              className={`hb-phase-badge hb-phase-badge-${state.phase.toLowerCase()}`}
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
        {/* 左：プレイヤー / CPU 情報 */}
        <aside className="hb-column hb-player-panel">
          <PlayerHud player={player} />
          <CpuHud cpu={cpu} gameEnded={state.gameEnded} state={state} />
        </aside>

        {/* 中央：サプライ + プレイエリア */}
        <section className="hb-column hb-center-area">
          <section className="hb-supply-area">
            <SupplyBoard
              supplyPiles={supplyPiles}
              state={state}
              onBuyCard={onBuyCard}
              onShowCardDetail={onShowCardDetail}
              onHoverCard={setHoveredCard}
              selectedSupplyId={selectedSupplyId}
              onSelectSupply={handleSelectSupply}
            />
          </section>

          {/* プレイエリアは ACTION / CLEANUP のときだけ表示 */}
          <section
            className={`hb-play-area ${
              state.phase === "BUY" ? "hb-play-area-compact" : ""
            } ${
              state.phase === "ACTION" || state.phase === "CLEANUP"
                ? ""
                : "hb-play-area--hidden"
            }`}
          >
            <PlayArea state={state} getCardFromId={getCardFromId} />
          </section>
        </section>

        {/* 右：カード説明パネル */}
        <aside className="hb-column hb-log-panel">
          <div className="hb-card-detail-panel">
            <CardHelpPanel hoveredCard={hoveredCard} />
          </div>
        </aside>
      </main>

      {/* 3. 手札エリア（フェーズガイドを重ねて表示） */}
      <section className="hb-hand-area">
        <div className="hb-phase-guide">
          <GameLog phase={state.phase} />
        </div>

        <HandArea
          player={player}
          isPlayerTurn={isPlayerTurn}
          phase={state.phase}
          selectedHandId={selectedHandId}
          onSelectHandCard={handleSelectHandCard}
          onPlayFromHand={handlePlayFromHand}
          onShowDetail={onShowCardDetail}
          onHoverCard={setHoveredCard}
          getCardFromId={getCardFromId}
        />
      </section>

      {/* 4. 操作ボタン */}
      <footer className="hb-footer">
        <GameControls
          phase={state.phase}
          isPlayerTurn={isPlayerTurn}
          gameEnded={state.gameEnded}
          onProceedPhase={onProceedPhase}
          canPlaySelected={canPlaySelected}
          canBuySelected={canBuySelected}
          onPlaySelected={handlePlaySelected}
          onBuySelected={handleBuySelected}
        />
      </footer>
    </div>
  );
};

export default GameScreen;

/* ================= ヘルパー群 ================= */

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

/** このゲームで登場した「人物」「出来事」カード名をユニークに集める */
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

/* ==== 小コンポーネント ==== */

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

  const historyNames = collectHistoryCardNames(state);

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
          <h2 className="text-sm font-semibold mb-1 text-amber-200">
            ゲーム終了
          </h2>
          <div className="text-xs space-y-1 text-amber-100">
            <div>
              勝者: <span className="font-bold">{winnerLabel}</span>
            </div>
            {playerScore !== null && cpuScore !== null && (
              <div className="mt-1 space-y-0.5">
                <div>プレイヤー: {playerScore} 点</div>
                <div>CPU: {cpuScore} 点</div>
              </div>
            )}
            {historyNames.length > 0 && (
              <div className="mt-3">
                <div className="text-[11px] mb-1">
                  このゲームで出てきた 人物・出来事
                </div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {historyNames.map(name => (
                    <span
                      key={name}
                      className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/60 text-[11px]"
                    >
                      {name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

interface SupplyBoardProps {
  supplyPiles: { card: Card; remaining: number }[];
  state: GameState;
  onBuyCard: (cardId: string) => void;
  onShowCardDetail: (card: Card) => void;
  onHoverCard?: (card: Card | null) => void;
  selectedSupplyId: string | null;
  onSelectSupply: (cardId: string) => void;
}

const SupplyBoard: React.FC<SupplyBoardProps> = ({
  supplyPiles,
  state,
  onBuyCard,
  onShowCardDetail,
  onHoverCard,
  selectedSupplyId,
  onSelectSupply
}) => {
  const player = state.player;
  const isPlayerTurn = state.activePlayer === "player";
  const isBuyPhase = state.phase === "BUY";

  const hintText = isBuyPhase
    ? "サプライのカードを選んで、下の「カードを購入」を押そう"
    : "カードの効果を見ておこう。BUY フェーズになったらここからカードを買えます。";
  const hintClass = isBuyPhase
    ? "text-[11px] text-slate-300"
    : "text-[11px] text-slate-500";

  // 基本カード（資源・国力）と王国カード（人物・出来事）に分割
  const basicPiles = supplyPiles.filter(
    p => p.card.type === "resource" || p.card.type === "victory"
  );
  const kingdomPiles = supplyPiles.filter(
    p => p.card.type === "person" || p.card.type === "event"
  );

  const renderPile = (pile: { card: Card; remaining: number }) => {
    const isBasic =
      pile.card.type === "resource" || pile.card.type === "victory";

    return (
      <div
        key={pile.card.id}
        onClick={() => onSelectSupply(pile.card.id)}
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
          // 基本カードだけコンパクト表示にして、王国カードとの差をつける
          compact={isBasic}
          selected={selectedSupplyId === pile.card.id}
        />
      </div>
    );
  };

  return (
    <div className="hb-card hb-supply-board">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold">場のカード（サプライ）</h2>
        <span className={hintClass}>{hintText}</span>
      </div>

      <div className="hb-supply-layout">
        <div className="hb-supply-basic-column">
          {basicPiles.map(renderPile)}
        </div>
        <div className="hb-supply-kingdom-grid">
          {kingdomPiles.map(renderPile)}
        </div>
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
              playedCards.map(card => (
                <div key={card.id} className="hb-play-card">
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
  getCardFromId: (id: string) => Card | null;
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
  getCardFromId
}) => {
  let helperText = "カードをクリックして選び、「つかう」ボタンでプレイ";
  if (phase === "ACTION") {
    helperText =
      "手札のカードを選んで、下の「カードをプレイ」ボタンを押そう。";
  } else if (phase === "BUY") {
    helperText =
      "今は購入フェーズです。サプライのカードを選んで「カードを購入」ボタンを押そう。";
  }

  return (
    <div className="hb-hand-area-inner">
      <div className="hb-hand-header">
        <h2 className="text-sm font-semibold">手札</h2>
        <span className="text-[11px] text-slate-300">{helperText}</span>
      </div>

      {player.hand.length === 0 ? (
        <div className="hb-hand-empty">
          手札がありません。次の自分のターン開始時に 5枚引きます。
        </div>
      ) : (
        <div className="hb-hand-row">
          {player.hand.map(cardId => {
            const card = getCardFromId(cardId);
            if (!card) return null;

            // ACTION フェーズ以外や、人 ･ 出来事以外はプレイ不可
            const disabled =
              !isPlayerTurn ||
              phase !== "ACTION" ||
              (card.type !== "person" && card.type !== "event");

            return (
              <div
                key={card.id}
                className="hb-hand-card-wrapper"
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
    <div className="text-xs text-slate-300 mb-1">
      現在のフェーズ:{" "}
      <span className="font-semibold">{renderPhaseLabel(phase)}</span>
    </div>
    <div className="hb-log-section">
      <div className="font-semibold mb-1 text-[11px]">
        このターンで できること
      </div>
      <ol className="list-decimal list-inside space-y-0.5 text-[10px]">
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
          種別: {renderTypeLabel(hoveredCard.type)} / コスト: 米{" "}
          {hoveredCard.cost} / 知識 {hoveredCard.knowledgeRequired}
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
  canPlaySelected: boolean;
  canBuySelected: boolean;
  onPlaySelected?: () => void;
  onBuySelected?: () => void;
}

const GameControls: React.FC<GameControlsProps> = ({
  phase,
  isPlayerTurn,
  gameEnded,
  onProceedPhase,
  canPlaySelected,
  canBuySelected,
  onPlaySelected,
  onBuySelected
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
          className={`hb-footer-button ${
            isActionPhase ? "hb-footer-button-primary" : "hb-footer-button-muted"
          }`}
          onClick={
            canPlaySelected && onPlaySelected ? onPlaySelected : undefined
          }
          disabled={!canPlaySelected}
        >
          カードをプレイ
        </button>

        <button
          type="button"
          className={`hb-footer-button ${
            isBuyPhase ? "hb-footer-button-primary" : "hb-footer-button-muted"
          }`}
          onClick={canBuySelected && onBuySelected ? onBuySelected : undefined}
          disabled={!canBuySelected}
        >
          カードを購入
        </button>

        <button
          type="button"
          className={`hb-footer-button ${
            !isCleanupPhase
              ? "hb-footer-button-secondary"
              : "hb-footer-button-primary"
          }`}
          onClick={canProceed ? onProceedPhase : undefined}
          disabled={!canProceed}
        >
          フェーズ終了
        </button>

        <button
          type="button"
          className={`hb-footer-button ${
            isCleanupPhase ? "hb-footer-button-primary" : "hb-footer-button-muted"
          }`}
          onClick={canProceed && isCleanupPhase ? onProceedPhase : undefined}
          disabled={!canProceed || !isCleanupPhase}
        >
          ターン終了
        </button>
      </div>
    </div>
  );
};
