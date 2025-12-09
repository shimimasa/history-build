import React from "react";
import { CardView } from "./CardView";
import { SupplyCardPile } from "./SupplyCard";

import "../index.css";

export type GamePhase = "DRAW" | "ACTION" | "BUY" | "CLEANUP";

export interface GameScreenProps {
  state: any; // ExtendedGameState 相当。必要に応じて差し替え
  logs: string[];
  onPlayHandCard: (cardId: string) => void;
  onBuyCard: (cardId: string) => void;
  onEndPhase: () => void;
  onEndTurn: () => void;
  selectedHandCardId: string | null;
  onSelectHandCard: (cardId: string | null) => void;
  onHoverCard: (card: any | null) => void;
}

export const GameScreen: React.FC<GameScreenProps> = ({
  state,
  logs,
  onPlayHandCard,
  onBuyCard,
  onEndPhase,
  onEndTurn,
  selectedHandCardId,
  onSelectHandCard,
  onHoverCard,
}) => {
  const { player, cpu, currentPhase, turn, supply } = state;

  const isPlayerTurn = state.currentPlayer === "player";

  // サプライを「基本（米袋・村落など）」と「人物・出来事」に分割
  const basicPiles = Object.values(supply).filter(
    (p: any) => p.card.cardType === "resource" || p.card.cardType === "base"
  );
  const kingdomPiles = Object.values(supply).filter(
    (p: any) => p.card.cardType !== "resource" && p.card.cardType !== "base"
  );

  const hoveredCard: any | null = state.hoveredCard ?? null;

  const handleHandClick = (cardId: string) => {
    if (selectedHandCardId === cardId) {
      onSelectHandCard(null);
    } else {
      onSelectHandCard(cardId);
    }
  };

  const handleHandDoubleClick = (cardId: string) => {
    onPlayHandCard(cardId);
  };

  const handleSupplyClick = (pile: any) => {
    if (!isPlayerTurn) return;
    onBuyCard(pile.card.id);
  };

  const phaseLabel = getPhaseLabel(currentPhase);

  return (
    <div className="hb-game-layout">
      {/* --- 上部ヘッダー（タイトル＋ターン情報） --- */}
      <header className="hb-game-header">
        <div className="hb-game-title">
          <span>History Build - 戦国デッキ v1.5</span>
        </div>
        <div className="hb-top-status">
          <div className="hb-status-group">
            <StatusBadge label="アクション" value={player.actions ?? 0} />
            <StatusBadge label="購入" value={player.buys ?? 0} />
            <StatusBadge label="米" value={player.rice ?? 0} />
            <StatusBadge label="知識" value={player.knowledge ?? 0} />
          </div>
          <div className="hb-turn-indicator">
            <div className="hb-turn-text">ターン {turn}</div>
            <div className="hb-phase-pill">
              手番 {isPlayerTurn ? "プレイヤー" : "CPU"} / フェーズ: {phaseLabel}
            </div>
          </div>
        </div>
      </header>

      {/* --- メイン 3 カラム --- */}
      <main className="hb-main-area">
        {/* 左：プレイヤー情報 / CPU 情報 */}
        <aside className="hb-side-panel">
          <PlayerHud title="プレイヤー" data={player} />
          <PlayerHud title="CPU" data={cpu} compact />
        </aside>

        {/* 中央：サプライボード ＋ プレイエリア */}
        <section className="hb-center-area">
          <section className="hb-supply-section">
            <div className="hb-section-title">場のカード（サプライ）</div>

            <div className="hb-supply-board">
              {/* 上段：基本カード（縦 1 列） */}
              <div className="hb-supply-basic-column">
                {basicPiles.map((pile: any) => (
                  <SupplyCardPile
                    key={pile.card.id}
                    pile={pile}
                    isDisabled={!isPlayerTurn}
                    onClick={() => handleSupplyClick(pile)}
                    onHover={onHoverCard}
                  />
                ))}
              </div>

              {/* 右側：人物＋出来事カード 5x2 グリッド */}
              <div className="hb-supply-kingdom-grid">
                {kingdomPiles.map((pile: any) => (
                  <SupplyCardPile
                    key={pile.card.id}
                    pile={pile}
                    isDisabled={!isPlayerTurn}
                    onClick={() => handleSupplyClick(pile)}
                    onHover={onHoverCard}
                  />
                ))}
              </div>
            </div>
          </section>

          {/* プレイエリア（場に出したカードなど） */}
          <section className="hb-play-area">
            <div className="hb-section-title">プレイ中のカード</div>
            <div className="hb-play-cards-row">
              {player.playArea?.length ? (
                player.playArea.map((card: any) => (
                  <div key={card.id} className="hb-play-card-wrapper">
                    <CardView
                      card={card}
                      remaining={undefined}
                      variant="play"
                      onHover={onHoverCard}
                    />
                  </div>
                ))
              ) : (
                <div className="hb-play-empty">まだカードはプレイされていません。</div>
              )}
            </div>
          </section>
        </section>

        {/* 右：カード詳細パネル */}
        <aside className="hb-detail-panel">
          <div className="hb-section-title">カードの説明</div>
          <div className="hb-card-detail-scroll">
            {hoveredCard ? (
              <CardDetail card={hoveredCard} />
            ) : (
              <p className="hb-card-detail-placeholder">
                サプライや手札のカードにマウスをのせると、ここに説明が表示されます。
              </p>
            )}
          </div>
        </aside>
      </main>

      {/* --- 下：手札エリア --- */}
      <section className="hb-hand-area">
        <div className="hb-hand-header">
          <span className="hb-section-title">手札</span>
          <span className="hb-hand-hint">
            クリックで選択 / ダブルクリックで即プレイ
          </span>
        </div>
        <div className="hb-hand-row">
          {player.hand?.map((card: any) => (
            <div
              key={card.instanceId ?? card.id}
              className={`hb-hand-card-slot${
                selectedHandCardId === (card.instanceId ?? card.id)
                  ? " hb-hand-card-slot--selected"
                  : ""
              }`}
              onClick={() =>
                handleHandClick(card.instanceId ?? card.id)
              }
              onDoubleClick={() =>
                handleHandDoubleClick(card.instanceId ?? card.id)
              }
              onMouseEnter={() => onHoverCard(card)}
              onMouseLeave={() => onHoverCard(null)}
            >
              <CardView
                card={card}
                remaining={undefined}
                variant="hand"
              />
            </div>
          ))}
        </div>
      </section>

      {/* --- フッター：ボタン＋ログ --- */}
      <footer className="hb-footer">
        <div className="hb-footer-controls">
          <button
            className="hb-btn hb-btn-secondary"
            onClick={onEndPhase}
          >
            フェーズを進める
          </button>
          <button className="hb-btn hb-btn-primary" onClick={onEndTurn}>
            ターンを終了
          </button>
        </div>
        <div className="hb-footer-log">
          <div className="hb-section-title">ログ</div>
          <div className="hb-log-scroll">
            {logs.length === 0 ? (
              <p className="hb-log-empty">まだログはありません。</p>
            ) : (
              logs
                .slice()
                .reverse()
                .map((line, idx) => (
                  <div key={idx} className="hb-log-line">
                    {line}
                  </div>
                ))
            )}
          </div>
        </div>
      </footer>
    </div>
  );
};

const StatusBadge: React.FC<{ label: string; value: number }> = ({
  label,
  value,
}) => (
  <div className="hb-status-badge">
    <span className="hb-status-label">{label}</span>
    <span className="hb-status-value">{value}</span>
  </div>
);

const PlayerHud: React.FC<{
  title: string;
  data: any;
  compact?: boolean;
}> = ({ title, data, compact }) => {
  return (
    <section
      className={`hb-player-panel${
        compact ? " hb-player-panel--compact" : ""
      }`}
    >
      <div className="hb-panel-title">{title}</div>
      <div className="hb-panel-row">
        <span>山札 / 手札</span>
        <span>
          {data.deckCount ?? 0} / {data.hand?.length ?? 0}
        </span>
      </div>
      <div className="hb-panel-row">
        <span>捨て札</span>
        <span>{data.discardCount ?? 0}</span>
      </div>
      <div className="hb-panel-row">
        <span>勝利点</span>
        <span>{data.vp ?? 0}</span>
      </div>
    </section>
  );
};

const CardDetail: React.FC<{ card: any }> = ({ card }) => {
  return (
    <div className="hb-card-detail">
      <div className="hb-card-detail-name">{card.name}</div>
      <div className="hb-card-detail-meta">
        <span>{card.cardType}</span>
        <span> / コスト: 米 {card.cost?.rice ?? 0}</span>
        {card.cost?.knowledge ? (
          <span> / 知識 {card.cost.knowledge}</span>
        ) : null}
      </div>
      {card.description && (
        <p className="hb-card-detail-text">{card.description}</p>
      )}
      {card.effect && (
        <p className="hb-card-detail-text">{card.effect}</p>
      )}
      {card.conditionText && (
        <p className="hb-card-detail-text">{card.conditionText}</p>
      )}
    </div>
  );
};

function getPhaseLabel(phase: GamePhase | string): string {
  switch (phase) {
    case "DRAW":
      return "DRAW（ドロー）";
    case "ACTION":
      return "ACTION（アクション）";
    case "BUY":
      return "BUY（購入）";
    case "CLEANUP":
      return "CLEANUP（片付け）";
    default:
      return String(phase);
  }
}
