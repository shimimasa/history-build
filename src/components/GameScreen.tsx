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

  　
  // ▼ 修正: v1 / v1.5 両対応で「アクティブプレイヤー」を解決
  const activeSide =
    (state.currentPlayer ?? state.activePlayer ?? "player") as "player" | "cpu";
  
  const isPlayerTurn = activeSide === "player";

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

  // ★ HUD 用：最近の BUY / PLAY をカードオブジェクトに解決（最大3件）
  const recentBuyCards = React.useMemo(
    () =>
      (state.uiRecentBuys as any[])
        .map((e) => supply?.[e.cardId]?.card)
        .filter(Boolean)
        .slice(0, 3),
    [state.uiRecentBuys, supply]
  );

  const recentPlayCards = React.useMemo(
    () =>
      (state.uiRecentPlays as any[])
        .map((e) => supply?.[e.cardId]?.card)
        .filter(Boolean)
        .slice(0, 3),
    [state.uiRecentPlays, supply]
  );


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



  // v2 GameState 互換：turnPhase / phase / currentPhase のどれかを参照
  const rawPhase =
    state.turnPhase ?? state.phase ?? currentPhase ?? "DRAW";

  // BUYフェーズ + プレイヤー手番なら「クリックで即購入」
// それ以外（他フェーズ or CPU 手番 or 在庫0）は詳細モーダルを開くだけ
const handleSupplyClick = (pile: any) => {
  const cardId = pile?.card?.id;
  if (!cardId) return;

  const remaining = pile?.remaining;
  const isOutOfStock =
    typeof remaining === "number" && remaining <= 0;

  // 在庫切れは購入不可（詳細だけ見せる）
  if (isOutOfStock) {
    setFocusedCard(pile.card);
    setDetailModalCard(pile.card);
    setIsDetailModalOpen(true);
    return;
  }

  // BUYフェーズ + プレイヤー手番なら「クリックで購入」
  if (isPlayerTurn && rawPhase === "BUY") {
    onBuyCard(cardId); // ← GameContainer の handleBuyCard(cardId) まで飛ぶ
    return;
  }

  // それ以外は詳細表示
  setFocusedCard(pile.card);
  setDetailModalCard(pile.card);
  setIsDetailModalOpen(true);
};

  const phaseLabel = getPhaseLabel(rawPhase);

  // ▼ 追加: v1.5 GameState に合わせた表示用ステータス
  const riceThisTurn = player.riceThisTurn ?? player.rice ?? 0;
  const knowledge = player.knowledge ?? 0;

  // フェーズに応じて「今行えるアクション / 購入」の残り数を簡易表示
  const actionsLeft = rawPhase === "ACTION" ? 1 : 0;
  const buysLeft = rawPhase === "BUY" ? 1 : 0;

  // ▼ 追加：モーダル用の「このカードを今買えるか」と理由
  const isPlayerBuyPhase = isPlayerTurn && rawPhase === "BUY";

  const canBuyThisCard =
    !!detailModalCard &&
    canBuyCard(player as PlayerState, detailModalCard as GameCard);

  let buyDisabledReason: string | undefined;
  if (!isPlayerTurn) {
    buyDisabledReason = "プレイヤーの手番ではありません";
  } else if (!isPlayerBuyPhase) {
    buyDisabledReason = "購入は BUY フェーズのみ行えます";
  } else if (detailModalCard && !canBuyThisCard) {
    buyDisabledReason = "資源・知識不足";
  }

  // ★ GameContainer から渡ってくる UI 情報
　const lastEvent = state.uiLastEvent ?? state.ui?.lastEvent ?? null;
　const recentBuys = state.uiRecentBuys ?? state.ui?.recentBuys ?? [];
　const recentPlays = state.uiRecentPlays ?? state.ui?.recentPlays ?? [];

　// ★ 600ms の一時的なハイライト用 state
　const [buyFlashCardId, setBuyFlashCardId] = React.useState<string | null>(null);
　const [playFlashCardId, setPlayFlashCardId] = React.useState<string | null>(null);

　// ★ 1.2 秒表示のトーストメッセージ
　const [toastMessage, setToastMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!lastEvent) return;

    if (lastEvent.kind === "BUY") {
      setBuyFlashCardId(lastEvent.cardId);
      const timer = setTimeout(() => setBuyFlashCardId(null), 600);
      return () => clearTimeout(timer);
    }

    if (lastEvent.kind === "PLAY") {
      setPlayFlashCardId(lastEvent.cardId);
      const timer = setTimeout(() => setPlayFlashCardId(null), 600);
      return () => clearTimeout(timer);
    }
  }, [lastEvent?.kind, lastEvent?.cardId, lastEvent?.timestamp]);

　// ★ トースト表示（1.2 秒）
React.useEffect(() => {
  if (!lastEvent) return;

  const pile = supply?.[lastEvent.cardId];
  const cardName = pile?.card?.name ?? lastEvent.cardId;
  const label =
    lastEvent.kind === "BUY"
      ? `購入：${cardName}`
      : `使用：${cardName}`;

  setToastMessage(label);

  const timer = setTimeout(() => setToastMessage(null), 1200);
  return () => clearTimeout(timer);
}, [lastEvent?.kind, lastEvent?.cardId, lastEvent?.timestamp, supply]);

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
            {toastMessage && (
        <div className="hb-toast">
          {toastMessage}
        </div>
        )}
          </div>
        </div>
      </header>

      {/* --- メインボードレイアウト（左サイドバー＋右ボード） --- */}
      <div className="hb-game-layout">
        {/* 左サイドバー：プレイヤー情報 / CPU 情報 */}
        <aside className="hb-sidebar">
          {/* プレイヤーと CPU を横並び表示 */}
          <div className="hb-player-row">
          <PlayerHud
      title={activeSide === "player" ? "プレイヤー" : "CPU"}
      data={activeSide === "player" ? player : cpu}
      // 「今回獲得 / 使用」はプレイヤーターンのときのみ表示
      recentBuys={activeSide === "player" ? recentBuyCards : []}
      recentPlays={activeSide === "player" ? recentPlayCards : []}
    />
          </div>

          {/* その下にカード説明ボックスを配置 */}
          <section
            className={[
              "hb-card-detail-panel",
              "hb-card-detail-panel--sidebar",
              cardForDetail ? "is-active" : "is-empty",
            ].join(" ")}
          >
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
    // プレイヤー手番かつ BUY フェーズ以外は「見た目だけ」無効化
    isDisabled={!isPlayerBuyPhase}
    isFlashingBuy={buyFlashCardId === pile.card.id}
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
    isDisabled={!isPlayerBuyPhase}
    isFlashingBuy={buyFlashCardId === pile.card.id}
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
    isDisabled={!isPlayerBuyPhase}
    isFlashingBuy={buyFlashCardId === pile.card.id}
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
            const isPlayFlash = playFlashCardId === card.id; // ★ PLAY ハイライト判定

            return (
              <div
                key={handKey}
                className={`hb-hand-card${
                  selected ? " hb-hand-card--selected" : ""
                }${isPlayFlash ? " hb-flash-play" : ""}`}
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
                     // ★ 600ms の一時的なハイライト用
                     // className={`hb-hand-card${selected ? " hb-hand-card--selected" : ""}${playFlashCardId === playId ? " hb-flash-play" : ""}`}

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
        // ★ canBuyThisCard は detailModalCard が null のときは false になるようガード済み
        primaryEnabled={isPlayerBuyPhase && canBuyThisCard}
        primaryDisabledReason={
          !(isPlayerBuyPhase && canBuyThisCard) ? buyDisabledReason : undefined
        }
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
  recentBuys?: any[];
  recentPlays?: any[];
}> = ({ title, data, compact, recentBuys = [], recentPlays = [] }) => {
  const trimName = (raw: string | undefined, max: number = 8) => {
    const name = raw ?? "";
    return name.length > max ? `${name.slice(0, max)}…` : name;
  };

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

      {/* ★ 最近の獲得 / 使用（compact でないときだけ） */}
      {!compact && (recentBuys.length > 0 || recentPlays.length > 0) && (
        <div className="hb-panel-recent">
          <div className="hb-panel-recent-row">
            <span className="hb-panel-recent-label">今回獲得</span>
            <div className="hb-panel-recent-cards">
              {recentBuys.slice(0, 3).map((c: any, i: number) => (
                <div key={`${c.id}-buy-${i}`} className="hb-panel-recent-card">
                  <div className="hb-panel-recent-thumb">
                    <CardView card={c} variant="supply" />
                  </div>
                  <div className="hb-panel-recent-name">
                    {trimName(c.name ?? c.id, 8)}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="hb-panel-recent-row">
            <span className="hb-panel-recent-label">今回使用</span>
            <div className="hb-panel-recent-cards">
              {recentPlays.slice(0, 3).map((c: any, i: number) => (
                <div key={`${c.id}-play-${i}`} className="hb-panel-recent-card">
                  <div className="hb-panel-recent-thumb">
                    <CardView card={c} variant="supply" />
                  </div>
                  <div className="hb-panel-recent-name">
                    {trimName(c.name ?? c.id, 8)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
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
