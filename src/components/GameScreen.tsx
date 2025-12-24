// src/components/GameScreen.tsx

import React from "react";
import { CardView } from "./CardView";
import { SupplyCardPile } from "./SupplyCard";
import { CardDetailModal } from "./CardDetailModal"; // ★ 追加
import { canBuy } from "../game/core/canBuy";
import type { GameState } from "../game/gameState";
import { formatEffects } from "../ui/effectFormatter";
import { getCardRoleLabel } from "../ui/cardRole";
import { enhanceEventLogForDisplay } from "../ui/logEnhancer";
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

// サプライ表示順を安定させるためのソートヘルパー
function sortSupplyPiles(piles: any[]): any[] {
  const typeOrder: Record<string, number> = {
    resource: 0,
    victory: 1,
    person: 2,
    event: 3,
    structure: 4
  };

  return [...piles].sort((a, b) => {
    const ca = a?.card ?? {};
    const cb = b?.card ?? {};

    const ta = (ca.type ?? ca.cardType ?? "") as string;
    const tb = (cb.type ?? cb.cardType ?? "") as string;

    const oa = typeOrder[ta] ?? 99;
    const ob = typeOrder[tb] ?? 99;

    if (oa !== ob) return oa - ob;

    const costA = typeof ca.cost === "number" ? ca.cost : ca.cost?.rice ?? 0;
    const costB = typeof cb.cost === "number" ? cb.cost : cb.cost?.rice ?? 0;
    if (costA !== costB) return costA - costB;

    const nameA: string = ca.name ?? ca.id ?? "";
    const nameB: string = cb.name ?? cb.id ?? "";
    const nameCmp = nameA.localeCompare(nameB, "ja");
    if (nameCmp !== 0) return nameCmp;

    const idA: string = ca.id ?? "";
    const idB: string = cb.id ?? "";
    return idA.localeCompare(idB, "ja");
  });
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
  // ログ表示モード（Default: デバッグ系を隠す / Debug: 全表示）
  const [logMode, setLogMode] = React.useState<"default" | "debug">("default");
  const [logFilter, setLogFilter] = React.useState<string>("");
  const [isHelpOpen, setIsHelpOpen] = React.useState(false);

  const filteredLogs = React.useMemo(() => {
    if (!logs) return [];
    const enriched = enhanceEventLogForDisplay(logs);

    const base =
      logMode === "debug"
        ? enriched
        : (() => {
            // Default: [EFF][BUY][PLAY][TURN][WARN] のみ + プレフィックス無しは表示
            const allow = new Set(["EFF", "BUY", "PLAY", "TURN", "WARN"]);
            return enriched.filter((line) => {
              // "プレイヤー：..." 形式を考慮して message 部分だけを見る
              const idx = line.indexOf("：");
              const msg = idx >= 0 ? line.slice(idx + 1) : line;
              const m = /^\[([A-Z]+)\]/.exec(msg);
              if (!m) return true;
              return allow.has(m[1]);
            });
          })();

    const q = logFilter.trim();
    if (!q) return base;
    return base.filter((line) => line.includes(q));
  }, [logs, logMode, logFilter]);
  const { player, cpu, currentPhase, turn, supply } = state;

  　
  // ▼ 修正: v1 / v1.5 両対応で「アクティブプレイヤー」を解決
  const activeSide =
    (state.currentPlayer ?? state.activePlayer ?? "player") as "player" | "cpu";
  
  const isPlayerTurn = activeSide === "player";

  // ▼ 修正: v1 / v1.5 両対応でターン数を解決
  const displayTurn = turn ?? state.turnCount ?? 1;

  // 追加：サプライの選択状態（クリックで選択／背景クリックで解除）
  const [selectedSupplyCardId, setSelectedSupplyCardId] = React.useState<string | null>(null);

  // v2 Card / SupplyPile 想定:
  const getCardType = (pile: any): string => {
    return pile?.card?.type ?? pile?.card?.cardType ?? "";
  };

  // v2 Card / SupplyPile 想定:
  const supplyPiles: any[] = sortSupplyPiles(Object.values(supply ?? {}));

  // ゲーム終了条件用の「空山カウント」
  const emptyPileCount = supplyPiles.filter((p) => p.remaining <= 0).length;
  const emptyVictoryPileCount = supplyPiles.filter(
    (p) => getCardType(p) === "victory" && p.remaining <= 0
  ).length;


  // サプライを「基本カード（資源・勝利点）」と「王国カード（人物・出来事）」に分割
  const basicSupplyPiles = supplyPiles.filter((p) => {
    const t = getCardType(p);
    return t === "resource" || t === "victory" || t === "base";
  });

  const kingdomSupplyPiles = supplyPiles.filter((p) => {
    const t = getCardType(p);
    return t === "person" || t === "event" || t === "structure";
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
      ((state.uiRecentBuys ?? []) as any[])
        .map((e) => supply?.[e.cardId]?.card)
        .filter(Boolean)
        .slice(0, 3),
    [state.uiRecentBuys, supply]
  );

  const recentPlayCards = React.useMemo(
    () =>
      ((state.uiRecentPlays ?? []) as any[])
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

         // ★ 優先度:
  //    1. ホバー中のカード
  //    2. 手札でクリック選択中のカード
  //    3. lastEvent（直近の BUY / PLAY）のカード
  //    4. なし
  const cardForDetail = React.useMemo(() => {
    // 1 & 2: 直接の対象があれば、それを優先
    const direct = hoveredCard ?? selectedCardFromHand;
    if (direct) return direct;

    // 3: 無ければ lastEvent のカードをフォールバックに使う
    const uiLast = state.uiLastEvent ?? state.ui?.lastEvent ?? null;
    if (!uiLast) return null;

    const pile = supply?.[uiLast.cardId];
    return pile?.card ?? null;
  }, [hoveredCard, selectedCardFromHand, state.uiLastEvent, state.ui?.lastEvent, supply]);

// ... existing code ...

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

  const nextPhase = React.useMemo(() => {
    const p = String(rawPhase);
    switch (p) {
      case "DRAW":
        return "RESOURCE";
      case "RESOURCE":
        return "ACTION";
      case "ACTION":
        return "BUY";
      case "BUY":
        return "CLEANUP";
      case "CLEANUP":
        return "DRAW";
      default:
        return "";
    }
  }, [rawPhase]);

  const primaryActionLabel = React.useMemo(() => {
    if (!isPlayerTurn) return "待機中";
    if (rawPhase === "ACTION") return "BUYへ進む";
    if (rawPhase === "BUY") return "ターンを終える";
    if (rawPhase === "DRAW") return "ドローを進める";
    if (rawPhase === "CLEANUP") return "片付けを進める";
    return "進める";
  }, [isPlayerTurn, rawPhase]);

  const proceedEnabled =
    isPlayerTurn && !state.gameEnded && (rawPhase === "ACTION" || rawPhase === "BUY");
  const proceedDisabledReason = !isPlayerTurn
    ? "CPUの手番です"
    : state.gameEnded
      ? "ゲームは終了しています"
      : rawPhase !== "ACTION" && rawPhase !== "BUY"
        ? "このフェーズでは操作できません"
        : undefined;

  const endTurnEnabled =
    isPlayerTurn && !state.gameEnded && rawPhase === "BUY";
  const endTurnDisabledReason = !isPlayerTurn
    ? "CPUの手番です"
    : state.gameEnded
      ? "ゲームは終了しています"
      : rawPhase !== "BUY"
        ? "BUYフェーズでのみ終了できます"
        : undefined;

  // クリックで選択中のカード（デバッグ/ナビ用）
  const selectedSupplyCard =
    selectedSupplyCardId ? supply?.[selectedSupplyCardId]?.card : null;
  const selectedCardForLabel =
    selectedCardFromHand ?? selectedSupplyCard ?? null;

  // キーボードショートカット（UI層のみ）
  React.useEffect(() => {
    const isTyping = (t: EventTarget | null): boolean => {
      const el = t as HTMLElement | null;
      if (!el) return false;
      if (el.isContentEditable) return true;
      const tag = (el.tagName ?? "").toLowerCase();
      return tag === "input" || tag === "textarea" || tag === "select";
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return;
      if (e.key === "Escape") {
        if (isHelpOpen) {
          e.preventDefault();
          setIsHelpOpen(false);
          return;
        }
        onSelectHandCard(null);
        setSelectedSupplyCardId(null);
        return;
      }
      if (e.key === "Enter" && e.shiftKey) {
        if (endTurnEnabled) {
          e.preventDefault();
          onEndTurn();
        }
        return;
      }
      if (e.key === "Enter") {
        if (proceedEnabled) {
          e.preventDefault();
          onEndPhase();
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [endTurnEnabled, proceedEnabled, onEndPhase, onEndTurn, onSelectHandCard, isHelpOpen]);

  // BUYフェーズ + プレイヤー手番なら「クリックで即購入」
// それ以外（他フェーズ or CPU 手番 or 在庫0）は詳細モーダルを開くだけ
const handleSupplyClick = (pile: any) => {
  const cardId = pile?.card?.id;
  if (!cardId) return;
  setSelectedSupplyCardId(cardId);

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

  const riceThisTurn =
     player.turn?.rice ?? player.riceThisTurn ?? 0;
   const knowledge =
     player.turn?.knowledge ?? player.knowledge ?? 0;
  const discountThisTurn = Math.max(0, player.discountThisTurn ?? 0);
  
   const actionsLeft =
     player.turn?.actions ?? (rawPhase === "ACTION" ? 1 : 0);
   const buysLeft =
     player.turn?.buys ?? (rawPhase === "BUY" ? 1 : 0);

  const isPlayerBuyPhase = isPlayerTurn && rawPhase === "BUY";

  // 購入可能判定（ボタン見た目用）
  const canBuyFromState = (pile: any): boolean => {
    if (!isPlayerBuyPhase) return false;
    const id = pile?.card?.id;
    if (!id) return false;
    const result = canBuy(state as GameState, "player", id);
    return result.ok;
  };
  
  const canBuyThisCard =
    !!detailModalCard &&
    canBuy(state as GameState, "player", detailModalCard.id).ok;

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

  const proceedLabel = React.useMemo(() => {
    if (!isPlayerTurn) return "待機中";
    if (rawPhase === "ACTION") return "BUYへ進む";
    if (rawPhase === "BUY") return "片付けへ進む";
    if (rawPhase === "DRAW") return "ドローを進める";
    if (rawPhase === "CLEANUP") return "片付けを進める";
    return "進める";
  }, [isPlayerTurn, rawPhase]);

  const mainCta = React.useMemo(() => {
    if (rawPhase === "ACTION") {
      return { primary: "proceed" as const };
    }
    if (rawPhase === "BUY") {
      return { primary: "endTurn" as const };
    }
    return { primary: "proceed" as const };
  }, [rawPhase]);

  const detailCanBuy = React.useMemo(() => {
    if (!cardForDetail?.id) return null;
    // サプライに存在するカードだけ canBuy を評価できる
    if (!supply?.[cardForDetail.id]) return null;
    return canBuy(state as GameState, "player", cardForDetail.id);
  }, [cardForDetail?.id, supply, state]);

  return (
    // 新レイアウト:
    // - 上部: ヘッダー（タイトル＋ターン情報）
    // - 中央: .hb-game-layout（左サイドバー＋右ボード＝サプライ＋カード詳細）
    // - 下部: 手札エリア（横1列＋横スクロール）とアクションボタン
    <div
      className="hb-game-screen"
      onMouseDown={(e) => {
        const t = e.target as HTMLElement | null;
        if (!t) return;
        // カード/ボタン/入力/モーダル内のクリックは無視
        if (
          t.closest(
            ".hb-hand-card, .hb-supply-card, .hb-log-panel, .hb-phase-actions, .hb-modal-overlay, input, button, textarea, select"
          )
        ) {
          return;
        }
        onSelectHandCard(null);
        setSelectedSupplyCardId(null);
      }}
    >
      {/* --- 上部ヘッダー（タイトル＋ターン情報） --- */}
      
      <header className="hb-game-header">
        <div className="hb-header-top">
          <div className="hb-game-title">
            {(() => {
              const eraLabelMap: Record<string, string> = {
                ancient: "古代",
                ancient_mediterranean: "古代地中海",
                medieval: "中世",
                medieval_europe: "中世ヨーロッパ",
                islamic_world: "イスラーム世界",
                east_asia: "東アジア",
                south_asia: "南アジア世界",
                southeast_asia: "東南アジア世界",
                central_asia: "中央アジア世界",
                sub_saharan_africa: "サハラ以南アフリカ",
                north_america: "北アメリカ",
                latin_america: "ラテンアメリカ",
                oceania: "オセアニア",
                modern_global: "近現代グローバル",
                sengoku: "戦国",
                edo: "江戸",
                meiji: "明治",
              };
              const eraKey: string = state.era ?? "sengoku";
              const eraLabel = eraLabelMap[eraKey] ?? "戦国";
              const deckTypeLabel =
                state.deckType === "challenge" ? "チャレンジ" : "基本";
              return (
                <span>
                  History Build - {eraLabel}デッキ（{deckTypeLabel}）
                </span>
              );
            })()}
          </div>
          <div className="hb-header-meta">
            <div className="hb-turn-text">ターン {displayTurn}</div>
            <div className="hb-endgame-hint">
              空になった山: {emptyPileCount} / 3　勝利点の空山:{" "}
              {emptyVictoryPileCount} / 2
            </div>
          </div>
        </div>

        {/* PHASE BAR（最重要） */}
        <div className="hb-phase-bar" aria-label="フェーズバー">
          <div className="hb-phase-bar-left">
            <div className="hb-phase-now">
              <div className="hb-phase-now-label">現在</div>
              <div className="hb-phase-now-value">{String(rawPhase)}</div>
              <div className="hb-phase-now-sub">{phaseLabel}</div>
            </div>
            <div className="hb-phase-next">
              <div className="hb-phase-next-label">次</div>
              <div className="hb-phase-next-value">{nextPhase || "—"}</div>
            </div>
          </div>

          <div className="hb-phase-bar-right">
            <div className="hb-status-group hb-phase-metrics">
              <StatusBadge label="アクション" value={actionsLeft} />
              <StatusBadge label="購入" value={buysLeft} />
              <StatusBadge label="米" value={riceThisTurn} />
              <StatusBadge label="知識" value={knowledge} />
              <StatusBadge label="割引" value={discountThisTurn} />
            </div>

            <div className="hb-phase-pill">
              手番 {isPlayerTurn ? "プレイヤー" : "CPU"}
            </div>

            {toastMessage && <div className="hb-toast">{toastMessage}</div>}
          </div>
        </div>

        {/* “今押すべき主要ボタン” */}
        <div className="hb-phase-actions">
          <div className="hb-phase-actions-row">
            <div className="hb-phase-action">
              <button
                className={`hb-btn ${
                  mainCta.primary === "proceed"
                    ? "hb-btn-primary"
                    : "hb-btn-secondary"
                }`}
                onClick={onEndPhase}
                disabled={!proceedEnabled}
                title={proceedDisabledReason}
              >
                {proceedLabel}
              </button>
              {!proceedEnabled && proceedDisabledReason && (
                <div className="hb-phase-action-reason">{proceedDisabledReason}</div>
              )}
            </div>

            <div className="hb-phase-action">
              <button
                className={`hb-btn ${
                  mainCta.primary === "endTurn"
                    ? "hb-btn-primary"
                    : "hb-btn-secondary"
                }`}
                onClick={onEndTurn}
                disabled={!endTurnEnabled}
                title={endTurnDisabledReason}
              >
                ターンを終える
              </button>
              {!endTurnEnabled && endTurnDisabledReason && (
                <div className="hb-phase-action-reason">{endTurnDisabledReason}</div>
              )}
            </div>
          </div>
          <div className="hb-phase-actions-hint">
            ショートカット：Enter=次へ / Shift+Enter=ターン終了 / Esc=選択解除
          </div>
        </div>
      </header>

      <div className="hb-game-body">
        {/* --- 中央：左 SUPPLY / 右 DETAIL --- */}
        <div className="hb-main-grid">
          {/* 左：SUPPLY */}
          <main className="hb-supply-column">
            <section className="hb-supply-area">
              <h2 className="hb-section-title">SUPPLY</h2>

              <div className="hb-supply-board" onMouseLeave={() => onHoverCard?.(null)}>
                {/* 基本（資源 / 勝利点） */}
                <div className="hb-supply-block">
                  <div className="hb-supply-block-title">基本</div>
                  <div className="hb-basic-grid" aria-label="基本カード">
                    <div className="hb-basic-column hb-basic-column--resource">
                      {resourceSupplyPiles.map((pile: any) => (
                        <SupplyCardPile
                          key={pile.card.id}
                          pile={pile}
                          variant="basic"
                          isDisabled={!canBuyFromState(pile)}
                          isSelected={selectedSupplyCardId === pile.card.id}
                          isFlashingBuy={buyFlashCardId === pile.card.id}
                          onClick={() => handleSupplyClick(pile)}
                          onHover={onHoverCard}
                        />
                      ))}
                    </div>
                    <div className="hb-basic-column hb-basic-column--victory">
                      {victorySupplyPiles.map((pile: any) => (
                        <SupplyCardPile
                          key={pile.card.id}
                          pile={pile}
                          variant="basic"
                          isDisabled={!isPlayerBuyPhase}
                          isSelected={selectedSupplyCardId === pile.card.id}
                          isFlashingBuy={buyFlashCardId === pile.card.id}
                          onClick={() => handleSupplyClick(pile)}
                          onHover={onHoverCard}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* 王国（人物 / 出来事 / 建物） */}
                <div className="hb-supply-block">
                  <div className="hb-supply-block-title">王国</div>
                  <div className="hb-kingdom-supply-grid" aria-label="王国カード">
                    {kingdomSupplyPiles.map((pile: any) => (
                      <SupplyCardPile
                        key={pile.card.id}
                        pile={pile}
                        variant="kingdom"
                        isDisabled={!isPlayerBuyPhase}
                        isSelected={selectedSupplyCardId === pile.card.id}
                        isFlashingBuy={buyFlashCardId === pile.card.id}
                        onClick={() => handleSupplyClick(pile)}
                        onHover={onHoverCard}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </section>
          </main>

          {/* 右：DETAIL */}
          <aside className="hb-detail-column">
            <div className="hb-detail-stack">
              <div className="hb-player-row">
                <PlayerHud
                  title="プレイヤー"
                  data={player}
                  recentBuys={recentBuyCards}
                  recentPlays={recentPlayCards}
                />
                <PlayerHud title="CPU" data={cpu} compact />
              </div>

              <section className="hb-card-detail-panel hb-card-detail-panel--detail">
                <div className="hb-section-title">DETAIL</div>
                {selectedCardForLabel && (
                  <div className="text-[11px] text-slate-300 mb-1">
                    選択中：{selectedCardForLabel.name ?? selectedCardForLabel.id}
                  </div>
                )}

                {cardForDetail?.id && (
                  <div className="hb-detail-buy-status">
                    {detailCanBuy ? (
                      <>
                        <div className="hb-detail-buy-row">
                          <span className="hb-detail-buy-key">購入</span>
                          <span
                            className={`hb-detail-buy-val ${
                              detailCanBuy.ok ? "is-ok" : "is-ng"
                            }`}
                          >
                            {detailCanBuy.ok ? "可" : "不可"}
                          </span>
                        </div>
                        <div className="hb-detail-buy-row">
                          <span className="hb-detail-buy-key">コスト</span>
                          <span className="hb-detail-buy-val">
                            米 {detailCanBuy.costRice} / 知識 {detailCanBuy.reqKnow}
                          </span>
                        </div>
                        {!detailCanBuy.ok && detailCanBuy.reasons.length > 0 && (
                          <div className="hb-detail-buy-reasons">
                            {detailCanBuy.reasons.slice(0, 3).join(" / ")}
                            {detailCanBuy.reasons.length > 3 ? " / …" : ""}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="hb-detail-buy-reasons">
                        サプライ外のカードです（購入判定なし）
                      </div>
                    )}
                  </div>
                )}

                <div className="hb-card-detail-scroll">
                  {cardForDetail ? (
                    <CardDetail card={cardForDetail} />
                  ) : (
                    <p className="hb-card-detail-placeholder">
                      サプライや手札のカードにマウスをのせると、ここに詳細が表示されます。
                    </p>
                  )}
                </div>
              </section>
            </div>
          </aside>
        </div>

        {/* --- 下：手札 --- */}
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

        </section>

        {/* --- 下：ログ（固定高＋内部スクロール） --- */}
        <section className="hb-log-area" aria-label="ログ">
          <div className="hb-log-panel">
            <div className="hb-log-title">
              <span>ログ</span>
              <div className="flex gap-1">
                <button
                  type="button"
                  className={`px-2 py-0.5 rounded border text-[10px] ${
                    logMode === "default"
                      ? "border-sky-400 text-sky-200"
                      : "border-slate-600 text-slate-300"
                  }`}
                  onClick={() => setLogMode("default")}
                >
                  Default
                </button>
                <button
                  type="button"
                  className={`px-2 py-0.5 rounded border text-[10px] ${
                    logMode === "debug"
                      ? "border-sky-400 text-sky-200"
                      : "border-slate-600 text-slate-300"
                  }`}
                  onClick={() => setLogMode("debug")}
                >
                  Debug
                </button>
                <button
                  type="button"
                  className={`px-2 py-0.5 rounded border text-[10px] ${
                    isHelpOpen
                      ? "border-amber-300 text-amber-200"
                      : "border-slate-600 text-slate-300"
                  }`}
                  onClick={() => setIsHelpOpen((v) => !v)}
                  title="ヘルプ"
                >
                  ？
                </button>
              </div>
            </div>

            {isHelpOpen && (
              <div className="hb-log-help">
                <div className="flex items-center justify-between mb-1">
                  <div className="font-semibold text-amber-200">ミニヘルプ</div>
                  <button
                    type="button"
                    className="px-2 py-0.5 rounded border border-slate-700 text-slate-300 hover:text-slate-100"
                    onClick={() => setIsHelpOpen(false)}
                    title="閉じる（Esc）"
                  >
                    閉じる
                  </button>
                </div>
                <ul className="space-y-0.5 text-slate-200">
                  <li>フェーズ：ACTION → BUY → CLEANUP</li>
                  <li>操作：サプライ/手札クリックで詳細、背景クリック/Escで解除</li>
                  <li>ショートカット：Enter=次へ、Shift+Enter=ターン終了</li>
                  <li>終了条件：空山3 or 勝利点空山2</li>
                  <li>ログ：Default/Debug切替、フィルタ可能</li>
                </ul>
              </div>
            )}

            <input
              value={logFilter}
              onChange={(e) => setLogFilter(e.target.value)}
              placeholder="カード名でフィルタ（部分一致）"
              className="hb-log-filter"
            />

            <div className="hb-log-list">
              {filteredLogs.length > 0 ? (
                <ul className="space-y-0.5">
                  {filteredLogs
                    .slice(-15) // 最新 15 件
                    .reverse() // 新しいものを上に
                    .map((line, idx) => (
                      <li key={idx} className="whitespace-pre-wrap">
                        {line}
                      </li>
                    ))}
                </ul>
              ) : (
                <p className="text-slate-400">まだログはありません。</p>
              )}
            </div>
          </div>
        </section>
      </div>

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

  const roleLabel: string = getCardRoleLabel(card);
  const effectLines: string[] = formatEffects(card);
  const shownEffectLines = effectLines.slice(0, 6);
  const hasMoreEffects = effectLines.length > 6;

    return (
      <div className="hb-card-detail">
        <div className="hb-card-detail-name">{card.name}</div>
        {card?.id && (
          <div className="text-[10px] text-slate-500 mt-0.5">
            ID: {card.id}
          </div>
        )}
        <div className="hb-card-detail-meta">
          {cardType && <span>{cardType}</span>}
          <span> / コスト: 米 {riceCost}</span>
          {typeof knowledgeCost === "number" && knowledgeCost > 0 && (
            <span> / 知識 {knowledgeCost}</span>
          )}
        </div>
      {roleLabel && roleLabel !== "その他" && (
        <div className="hb-card-detail-role text-[11px] text-slate-300 mt-1">
          役割：{roleLabel}
        </div>
      )}
        {mainText && (
          <p className="hb-card-detail-text">{mainText}</p>
        )}
      <div className="hb-card-detail-effects">
        <div className="hb-card-detail-effects-title">効果：</div>
        {effectLines.length === 0 ? (
          <p className="hb-card-detail-effects-none">なし</p>
        ) : (
          <ul className="hb-card-detail-effects-list">
            {shownEffectLines.map((line, idx) => (
              <li key={idx}>{line}</li>
            ))}
            {hasMoreEffects && <li>…</li>}
          </ul>
        )}
      </div>
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
