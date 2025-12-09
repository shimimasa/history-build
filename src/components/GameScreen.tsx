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

  // v2 Card / SupplyPile 想定:
  // supply: Record<string, { card: { type: 'resource' | 'person' | 'event' | 'victory', ... }, remaining }>
  // 互換性のため card.cardType もフォールバックとして参照する
  const supplyPiles: any[] = Object.values(supply ?? {});

  const getCardType = (pile: any): string => {
    return pile?.card?.type ?? pile?.card?.cardType ?? "";
  };

  // サプライを「基本カード（資源・勝利点）」と「王国カード（人物・出来事）」に分割
  const basicSupplyPiles = supplyPiles.filter((p) => {
    const t = getCardType(p);
    return t === "resource" || t === "victory" || t === "base";
  });

  const kingdomSupplyPiles = supplyPiles.filter((p) => {
    const t = getCardType(p);
    return t === "person" || t === "event";
  });

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
    // 新レイアウト:
    // - 上部: ヘッダー（タイトル＋ターン情報）
    // - 中央: .hb-game-layout（左サイドバー＋右ボード＝サプライ＋カード詳細）
    // - 下部: 手札エリア（横1列＋横スクロール）とアクションボタン
    <div className="hb-game-screen">
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

      {/* --- メインボードレイアウト（左サイドバー＋右ボード） --- */}
      <div className="hb-game-layout">
        {/* 左サイドバー：プレイヤー情報 / CPU 情報 */}
        <aside className="hb-sidebar">
          <PlayerHud title="プレイヤー" data={player} />
          <PlayerHud title="CPU" data={cpu} compact />
        </aside>

        {/* 右側ボード：左にサプライ、右にカード詳細パネル */}
        <main className="hb-board">
          {/* サプライボード（基本カード列＋王国カードグリッド） */}
          <section className="hb-supply-board">
            <h2 className="hb-section-title">場のカード（サプライ）</h2>

            <div className="hb-supply-layout">
              {/* 基本カード：上部 1 行に横並び */}
              <div className="hb-supply-basic-row">
                {basicSupplyPiles.map((pile: any) => (
                  <SupplyCardPile
                    key={pile.card.id}
                    pile={pile}
                    isDisabled={!isPlayerTurn}
                    onClick={() => handleSupplyClick(pile)}
                    onHover={onHoverCard}
                  />
                ))}
              </div>

              {/* 王国カード：右側に 5 列グリッド（縦スクロール可） */}
              <div className="hb-supply-kingdom-grid">
                {kingdomSupplyPiles.map((pile: any) => (
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

          {/* カード説明パネル（右カラム） */}
          <section className="hb-card-detail-panel">
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

            {/* ログはカード詳細パネル下部に配置 */}
            <div className="hb-detail-log-panel">
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
          </section>
        </main>
      </div>

      {/* --- 下：手札エリア＋アクションボタン --- */}
      <section className="hb-hand-area">
        <div className="hb-hand-header">
          <span className="hb-section-title">手札</span>
          <span className="hb-hand-hint">
            クリックで選択 / ダブルクリックで即プレイ
          </span>
        </div>

        {/* 下部いっぱいに横一列に並ぶ手札。多い場合は横スクロール */}
        <div className="hb-hand-scroll">
          {player.hand?.map((card: any) => (
            <div
              key={card.instanceId ?? card.id}
              className={`hb-hand-card${
                selectedHandCardId === (card.instanceId ?? card.id)
                  ? " hb-hand-card--selected"
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
                variant="hand"
              />
            </div>
          ))}
        </div>

        {/* アクションボタンは右下寄せで横並び。カードとは重ならないように別コンテナにする */}
        <div className="hb-hand-actions">
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
      </section>
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
