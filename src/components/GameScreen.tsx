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
  const { player, cpu } = state;
  const isPlayerTurn = state.activePlayer === "player";
  const isActionPhase = state.phase === "ACTION";
  const isBuyPhase = state.phase === "BUY";
  const isCleanupPhase = state.phase === "CLEANUP";

  // v2: 残りアクション / 残り購入はフェーズ基準で簡易表示
  const actionsLeft = isPlayerTurn && isActionPhase ? 1 : 0;
  const buysLeft = isPlayerTurn && isBuyPhase ? 1 : 0;

  const [selectedHandId, setSelectedHandId] = useState<string | null>(null);
  const [selectedSupplyId, setSelectedSupplyId] = useState<string | null>(null);
  const [hoveredCard, setHoveredCard] = useState<Card | null>(null);

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

  // 基本資源カードと王国カード群に分離
  const basicPiles = supplyPiles.filter((pile) => pile.card.type === "resource");
  const kingdomPiles = supplyPiles.filter((pile) => pile.card.type !== "resource");

  const getCardFromId = (cardId: string): Card | null =>
    state.supply[cardId]?.card ?? null;

  const canPlaySelected =
    isPlayerTurn && isActionPhase && selectedHandId !== null;

  const canBuySelected =
    isPlayerTurn && isBuyPhase && selectedSupplyId !== null;

  const handleSelectHand = (cardId: string) => {
    setSelectedHandId((prev) => (prev === cardId ? null : cardId));
  };

  const handleSelectSupply = (cardId: string) => {
    setSelectedSupplyId((prev) => (prev === cardId ? null : cardId));
  };

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

  const canProceed = !state.gameEnded;

  const playerVP = computeVictoryPointsForPlayer(state, "player");
  const cpuVP = computeVictoryPointsForPlayer(state, "cpu");

  return (
    <div className="hb-game-layout">
      {/* 1. ヘッダー */}
      <header className="hb-game-header">
        <div className="hb-game-header-top">
          <div className="hb-game-title">History Build - 戦国デッキ v1.5</div>
          <div className="hb-game-status">
            <span className="hb-pill">
              {state.gameEnded
                ? "ゲーム終了"
                : isPlayerTurn
                ? "プレイヤーのターン"
                : "CPUのターン"}
            </span>
            <span className="hb-pill">
              フェーズ:{" "}
              {state.phase === "ACTION"
                ? "アクション"
                : state.phase === "BUY"
                ? "購入"
                : "クリーンアップ"}
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
          <section className="hb-player-box">
            <h2 className="hb-player-title">プレイヤー</h2>
            <div className="hb-player-body">
              <div className="hb-player-row">
                <span className="hb-player-label">勝利点</span>
                <span className="hb-player-value">{playerVP}</span>
              </div>
              <div className="hb-player-row">
                <span className="hb-player-label">山札 / 手札</span>
                <span className="hb-player-value">
                  {player.deck.length} / {player.hand.length}
                </span>
              </div>
              <div className="hb-player-row">
                <span className="hb-player-label">捨て札</span>
                <span className="hb-player-value">
                  {player.discard.length}
                </span>
              </div>
            </div>
          </section>

          <section className="hb-player-box hb-player-box-cpu">
            <h2 className="hb-player-title">CPU</h2>
            <div className="hb-player-body">
              <div className="hb-player-row">
                <span className="hb-player-label">勝利点</span>
                <span className="hb-player-value">{cpuVP}</span>
              </div>
              <div className="hb-player-row">
                <span className="hb-player-label">山札 / 手札</span>
                <span className="hb-player-value">
                  {cpu.deck.length} / {cpu.hand.length}
                </span>
              </div>
              <div className="hb-player-row">
                <span className="hb-player-label">捨て札</span>
                <span className="hb-player-value">
                  {cpu.discard.length}
                </span>
              </div>
            </div>
          </section>
        </aside>

        {/* 中央：サプライボード */}
        <section className="hb-column hb-center-area">
          <section className="hb-supply-area">
            <h2 className="hb-section-title">場のカード</h2>
            <div className="hb-supply-board">
              <div className="hb-supply-layout">
                {/* 左：基本資源カードの縦列 */}
                <div className="hb-supply-basic-column">
                  {basicPiles.map((pile) => (
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
                      onShowDetail={() => onShowCardDetail(pile.card)}
                      compact
                      selected={selectedSupplyId === pile.card.id}
                      onSelect={() => handleSelectSupply(pile.card.id)}
                    />
                  ))}
                </div>

                {/* 右：人物・出来事・勝利点カード（5 列グリッド） */}
                <div className="hb-supply-kingdom-grid">
                  {kingdomPiles.map((pile) => (
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
                      onShowDetail={() => onShowCardDetail(pile.card)}
                      compact
                      selected={selectedSupplyId === pile.card.id}
                      onSelect={() => handleSelectSupply(pile.card.id)}
                    />
                  ))}
                </div>
              </div>
            </div>
          </section>
        </section>

        {/* 右：カード説明パネル */}
        <aside className="hb-column hb-detail-panel">
          <div className="hb-card-detail-panel">
            {hoveredCard ? (
              <>
                <div className="hb-detail-name">{hoveredCard.name}</div>
                <div className="hb-detail-type">
                  {hoveredCard.type} / 知識 {hoveredCard.knowledgeRequired}
                </div>
                {hoveredCard.text && (
                  <p className="hb-detail-text">{hoveredCard.text}</p>
                )}
              </>
            ) : (
              <p className="hb-detail-placeholder">
                カードにマウスを重ねると説明が表示されます。
              </p>
            )}
          </div>
        </aside>
      </main>

      {/* 3. 手札エリア */}
      <section className="hb-hand-area">
        <div className="hb-hand-area-inner">
          <div className="hb-hand-header">
            <span className="hb-section-title">手札</span>
            <span className="hb-hand-helper">
              クリックで選択 / ダブルクリックで即使用
            </span>
          </div>

          {player.hand.length === 0 ? (
            <div className="hb-hand-empty">手札がありません。</div>
          ) : (
            <div className="hb-hand-scroll">
              {player.hand.map((cardId) => {
                const card = getCardFromId(cardId);
                if (!card) return null;
                const selected = selectedHandId === cardId;

                return (
                  <div
                    key={cardId}
                    className={`hb-hand-card-wrapper ${
                      selected ? "hb-hand-card-selected" : ""
                    }`}
                    onMouseEnter={() => setHoveredCard(card)}
                    onMouseLeave={() => setHoveredCard(null)}
                  >
                    <HandCard
                      card={card}
                      disabled={!isPlayerTurn || !isActionPhase}
                      selected={selected}
                      onSelect={() => handleSelectHand(cardId)}
                      onPlay={() => onPlayActionCard(card.id)}
                      onShowDetail={() => onShowCardDetail(card)}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* 4. フッター：フェーズ操作ボタン */}
      <footer className="hb-footer">
        <div className="hb-footer-inner">
          <div className="hb-footer-buttons">
            <button
              type="button"
              className={`hb-footer-button ${
                canPlaySelected
                  ? "hb-footer-button-primary"
                  : "hb-footer-button-muted"
              }`}
              onClick={handlePlaySelected}
              disabled={!canPlaySelected}
            >
              選択カードを使う
            </button>

            <button
              type="button"
              className={`hb-footer-button ${
                canBuySelected
                  ? "hb-footer-button-primary"
                  : "hb-footer-button-muted"
              }`}
              onClick={handleBuySelected}
              disabled={!canBuySelected}
            >
              選択カードを購入
            </button>

            <button
              type="button"
              className={`hb-footer-button ${
                isCleanupPhase
                  ? "hb-footer-button-primary"
                  : "hb-footer-button-muted"
              }`}
              onClick={onProceedPhase}
              disabled={!canProceed}
            >
              フェーズを進める
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};

interface ResourceBadgeProps {
  label: string;
  value: number;
}

const ResourceBadge: React.FC<ResourceBadgeProps> = ({ label, value }) => {
  return (
    <div className="hb-resource-badge">
      <span className="hb-resource-label">{label}</span>
      <span className="hb-resource-value">{value}</span>
    </div>
  );
};

export default GameScreen;

