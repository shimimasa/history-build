// src/components/GameScreen.tsx

import React from "react";
import { CardView } from "./CardView";
import { SupplyCardPile } from "./SupplyCard";
import { CardDetailModal } from "./CardDetailModal"; // ★ 追加
import { canBuyCard } from "../logic/cardEffects"; // ★ 追加
import type { Card as GameCard, PlayerState } from "../game/gameState"; // ★ 追加

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

  // ▼ 修正: v1 / v1.5 両対応で「プレイヤー手番」を解決
  const isPlayerTurn =
    (state.currentPlayer ?? state.activePlayer ?? "player") === "player";

  // ▼ 修正: v1 / v1.5 両対応でターン数を解決
  const displayTurn = turn ?? state.turnCount ?? 1;

  // v2 Card / SupplyPile 想定:
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

  // ▼ 追加: 基本カードを「資源」と「勝利点」に分割
  const resourceSupplyPiles = basicSupplyPiles.filter(
    (p) => getCardType(p) === "resource"
  );
  const victorySupplyPiles = basicSupplyPiles.filter((p) => {
    const t = getCardType(p);
    return t === "victory" || t === "base";
  });


   // ★ 説明パネル用
   const [focusedCard, setFocusedCard] = React.useState<any | null>(null);
   // ★ 中央モーダル用
   const [detailModalCard, setDetailModalCard] = React.useState<any | null>(null);
   const [isDetailModalOpen, setIsDetailModalOpen] = React.useState(false);
 
   const hoveredCard: any | null = state.hoveredCard ?? null;

  // 手札カードの「表示用の一意キー」を解決（instanceId が無い場合は id__index）
  // これを選択IDとして使うことで、同名カードが複数あっても「1枚だけ」選択できる。
  const resolveHandKey = (c: any, index: number) =>
    (c.instanceId ?? `${c.id}__${index}`);

  // 手札から「直近で選択されたカード」を説明パネル用に解決
  const selectedCardFromHand =
    selectedHandCardId != null
      ? (() => {
          const hand = player.hand ?? [];
          for (let i = 0; i < hand.length; i++) {
            if (resolveHandKey(hand[i], i) === selectedHandCardId) return hand[i];
          }
          return null;
        })()
      : null;

      // ★ 優先度: ホバー中 > クリック選択 > 手札選択 > なし
      const cardForDetail =
       hoveredCard ?? selectedCardFromHand ?? null;

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
          // クリックは「詳細を見る」に統一（購入はモーダルのボタンから行う）
          setFocusedCard(pile.card);
          setDetailModalCard(pile.card);
          setIsDetailModalOpen(true);
        };

  // v2 GameState 互換：turnPhase / phase / currentPhase のどれかを参照
  const rawPhase =
    state.turnPhase ?? state.phase ?? currentPhase ?? "DRAW";

  const phaseLabel = getPhaseLabel(rawPhase);

  // ▼ 追加: v1.5 GameState に合わせた表示用ステータス
  const riceThisTurn = player.riceThisTurn ?? player.rice ?? 0;
  const knowledge = player.knowledge ?? 0;

  // フェーズに応じて「今行えるアクション / 購入」の残り数を簡易表示
  const actionsLeft = rawPhase === "ACTION" ? 1 : 0;
  const buysLeft = rawPhase === "BUY" ? 1 : 0;

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
            <StatusBadge label="アクション" value={actionsLeft} />
            <StatusBadge label="購入" value={buysLeft} />
            <StatusBadge label="米" value={riceThisTurn} />
            <StatusBadge label="知識" value={knowledge} />
          </div>
          <div className="hb-turn-indicator">
            <div className="hb-turn-text">ターン {displayTurn}</div>
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
          {/* プレイヤーと CPU を横並び表示 */}
          <div className="hb-player-row">
            <PlayerHud title="プレイヤー" data={player} />
            <PlayerHud title="CPU" data={cpu} compact />
          </div>

          {/* その下にカード説明ボックスを配置 */}
          <section className="hb-card-detail-panel hb-card-detail-panel--sidebar">
            <div className="hb-section-title">カードの説明</div>
            <div className="hb-card-detail-scroll">
              {cardForDetail ? (
                <CardDetail card={cardForDetail} />
              ) : (
                <p className="hb-card-detail-placeholder">
                  サプライや手札のカードにマウスをのせると、ここに説明が表示されます。
                </p>
              )}
            </div>
          </section>
        </aside>
        {/* 右側ボード：サプライのみ（横幅を最大化） */}
        <main className="hb-board">
          {/* サプライボード（左：基本カード / 右：人物・出来事） */}
          <section>
            <h2 className="hb-section-title">場のカード（サプライ）</h2>
            <div className="hb-supply-board">
              {/* 左：基本カード（資源 / 勝利点） */}
              <div className="hb-basic-grid">
                {/* 資源カード 1列×3行 */}
                <div className="hb-basic-column hb-basic-column--resource">
                  {resourceSupplyPiles.map((pile: any) => (
                    <SupplyCardPile
                      key={pile.card.id}
                      pile={pile}
                      variant="basic"
                      isDisabled={!isPlayerTurn}
                      onClick={() => handleSupplyClick(pile)}
                      onHover={onHoverCard}
                    />
                  ))}
                </div>

                {/* 勝利点カード 1列×3行 */}
                <div className="hb-basic-column hb-basic-column--victory">
                  {victorySupplyPiles.map((pile: any) => (
                    <SupplyCardPile
                      key={pile.card.id}
                      pile={pile}
                      variant="basic"
                      isDisabled={!isPlayerTurn}
                      onClick={() => handleSupplyClick(pile)}
                      onHover={onHoverCard}
                    />
                  ))}
                </div>
              </div>

              {/* 右：人物・出来事カード（王国カード） 5列×2行 */}
              <div className="hb-kingdom-supply-grid">
                {kingdomSupplyPiles.map((pile: any) => (
                  <SupplyCardPile
                    key={pile.card.id}
                    pile={pile}
                    variant="kingdom"
                    isDisabled={!isPlayerTurn}
                    onClick={() => handleSupplyClick(pile)}
                    onHover={onHoverCard}
                  />
                ))}
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
        <div className="hb-hand-cards">
        {player.hand?.map((card: any, index: number) => {
            // 選択・描画のための「手札1枚ごとの一意キー」
            const handKey = resolveHandKey(card, index);
            // 実際にプレイ処理に渡すID（既存ロジック互換）
            const playId = (card.instanceId ?? card.id);

            const selected = selectedHandCardId === handKey;
            return (
              <div
                key={handKey}
                className={`hb-hand-card${selected ? " hb-hand-card--selected" : ""}`}
                onClick={() => handleHandClick(handKey)}
                onDoubleClick={(e) => {
                     e.stopPropagation();
                     handleHandDoubleClick(playId);
                   }}
                onContextMenu={(e) => {
                      e.preventDefault();
                      setDetailModalCard(card);
                      setIsDetailModalOpen(true);
                    }}
                    onMouseEnter={() => onHoverCard(card)}
                     onMouseLeave={() => onHoverCard(null)}

              >
                <CardView card={card} variant="hand" />
              </div>
            );
          })}
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

    {/* ★ モーダルは CardDetailModal 側の overlay で完結させる */}
      <CardDetailModal
        card={detailModalCard}
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        onPrimaryAction={(cardId) => {
          onBuyCard(cardId);
          setIsDetailModalOpen(false);
        }}
        primaryLabel="購入する"
        primaryEnabled={!canBuyCard(player, detailModalCard)}
        primaryDisabledReason={!canBuyCard(player, detailModalCard) ? "資源・知識不足" : undefined}
      />
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
      {/* 捨て札行は削除 */}
      <div className="hb-panel-row">
        <span>勝利点</span>
        <span>{data.vp ?? 0}</span>
      </div>
    </section>
  );
};

const CardDetail: React.FC<{ card: any }> = ({ card }) => {
  // 種別ラベル（v1: card.cardType, v2: card.type）
  const cardType: string =
    card.cardType ?? card.type ?? card.cardTypeLabel ?? "";

  // コスト（v1: cost.rice, v2: cost: number）
  const riceCost: number =
    (typeof card.cost === "number" ? card.cost : card.cost?.rice) ?? 0;

  // 知識コスト（v2: knowledgeRequired）
  const knowledgeCost: number | undefined =
    card.knowledgeRequired ??
    (typeof card.cost === "object" ? card.cost?.knowledge : undefined);

  // メインテキスト（v2: text。なければ従来フィールドをフォールバック）
  const mainText: string | undefined =
    card.text ??
    card.description ??
    card.effect ??
    card.conditionText;

    return (
      <div className="hb-card-detail">
        <div className="hb-card-detail-name">{card.name}</div>
        <div className="hb-card-detail-meta">
          {cardType && <span>{cardType}</span>}
          <span> / コスト: 米 {riceCost}</span>
          {typeof knowledgeCost === "number" && knowledgeCost > 0 && (
            <span> / 知識 {knowledgeCost}</span>
          )}
        </div>
        {mainText && (
          <p className="hb-card-detail-text">{mainText}</p>
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
