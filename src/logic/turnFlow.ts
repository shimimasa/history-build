// src/logic/turnFlow.ts
// 「資源 → 行動 → 購入 → クリーンアップ」の一連の流れを管理するモジュール

import {
    GameState,
    PlayerState,
    Card,
    applyOnPlayEffects,
    clearTemporaryDiscounts,
    getEffectiveCostForPlayer
  } from "./cardEffects"; // 型と関数はプロジェクトに合わせて調整してください
  
  //------------------------------------------------------
  // 基本ヘルパー
  //------------------------------------------------------
  
  function getCurrentPlayer(state: GameState, owner: "player" | "cpu"): PlayerState {
    return owner === "player" ? state.player : state.cpu;
  }
  
  // 山札からカードを引く（デッキ切れ時は捨札をシャッフル）
  function drawCards(player: PlayerState, count: number): void {
    for (let i = 0; i < count; i++) {
      if (player.deck.length === 0) {
        if (player.discard.length === 0) return;
        reshuffleDiscardIntoDeck(player);
      }
      const card = player.deck.shift();
      if (card) player.hand.push(card);
    }
  }
  
  function reshuffleDiscardIntoDeck(player: PlayerState): void {
    player.deck = shuffle([...player.discard]);
    player.discard = [];
  }
  
  function shuffle<T>(array: T[]): T[] {
    const a = [...array];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  
  // hand から id のカードを1枚取り出して返す（なければ null）
  function takeCardFromHandById(player: PlayerState, cardId: string): Card | null {
    const index = player.hand.findIndex((c) => c.id === cardId);
    if (index === -1) return null;
    const [card] = player.hand.splice(index, 1);
    return card;
  }
  
  //------------------------------------------------------
  // ターン開始・終了
  //------------------------------------------------------
  
  /**
   * ターン開始時に呼ぶ
   * - 米を0にリセット
   * - 前ターンの割引バフをクリア
   * - 手札が空なら5枚引く（ゲーム開始直後や前ターン終了直後を想定）
   */
  export function startTurn(state: GameState): GameState {
    const owner = state.currentTurn;
    const player = getCurrentPlayer(state, owner);
  
    // 前ターンの割引をリセット
    clearTemporaryDiscounts(player);
  
    // 米をリセット
    player.riceThisTurn = 0;
  
    // 手札がなければ5枚引く
    if (player.hand.length === 0) {
      drawCards(player, 5);
    }
  
    return state;
  }
  
  /**
   * ターンを終了し、次のプレイヤーに交代する
   * - 手札＋プレイエリア → 捨札
   * - 米リセット
   * - ターン数カウント
   * - 両者が規定回数プレイしていたらゲーム終了判定
   */
  export function endTurn(state: GameState): GameState {
    const owner = state.currentTurn;
    const me = getCurrentPlayer(state, owner);
  
    // 手札とプレイエリアを捨札へ
    moveAll(me.hand, me.discard);
    moveAll(me.playArea, me.discard);
  
    // 米を0に
    me.riceThisTurn = 0;
  
    // 自分のターン回数をカウント
    me.turnsTaken += 1;
  
    // 手札は空のままにしておく
    // → 次の startTurn() で5枚引く
  
    // ターン交代（人間 → CPU → 人間 …）
    state.currentTurn = owner === "player" ? "cpu" : "player";
  
    // 全体のターン数（手番ごとに+1）
    state.turnNumber += 1;
  
    // ゲーム終了判定（両者とも maxTurnsPerPlayer 回プレイしたら終了）
    const maxTurns = state.maxTurnsPerPlayer;
    if (state.player.turnsTaken >= maxTurns && state.cpu.turnsTaken >= maxTurns) {
      state.isGameOver = true;
      state.winner = judgeWinner(state);
    }
  
    return state;
  }
  
  function moveAll(from: Card[], to: Card[]): void {
    while (from.length > 0) {
      const card = from.shift();
      if (card) to.push(card);
    }
  }
  
  //------------------------------------------------------
  // 資源フェーズ：資源カードをすべてプレイ
  //------------------------------------------------------
  
  /**
   * 資源フェーズ
   * - 手札の resource カードをすべてプレイエリアに出し、効果を適用する
   * - 人間も CPU も同じ処理（資源カードは常に得なので自動でOK）
   */
  export function playAllResources(state: GameState, owner: "player" | "cpu"): GameState {
    const player = getCurrentPlayer(state, owner);
  
    // 手札から resource を抜き出す
    const remainingHand: Card[] = [];
    const resourceCards: Card[] = [];
  
    for (const card of player.hand) {
      if (card.type === "resource") {
        resourceCards.push(card);
      } else {
        remainingHand.push(card);
      }
    }
  
    // 手札を更新
    player.hand = remainingHand;
  
    // 資源カードをプレイエリアへ移しつつ、効果を適用
    for (const card of resourceCards) {
      player.playArea.push(card);
      applyOnPlayEffects(state, card, owner);
    }
  
    return state;
  }
  
  //------------------------------------------------------
  // 行動フェーズ：人物 or 出来事を 1枚プレイ
  //------------------------------------------------------
  
  /**
   * 行動フェーズ（共通ロジック）
   * - 指定されたカードIDの card が「人物 or 出来事」であれば1枚だけプレイ
   * - UI側で「どのカードを出すか」を選ばせ、その cardId を渡す想定
   * - CPU の場合は cpuLogic から cardId を決めて呼ぶ
   */
  export function playActionCardById(
    state: GameState,
    owner: "player" | "cpu",
    cardId: string | null
  ): GameState {
    if (!cardId) return state;
  
    const player = getCurrentPlayer(state, owner);
    const card = takeCardFromHandById(player, cardId);
    if (!card) return state;
  
    // 行動カードとして認めるのは character / event のみ
    if (card.type !== "character" && card.type !== "event") {
      // 資源や国力カードだった場合は何もしないで手札に戻す
      player.hand.push(card);
      return state;
    }
  
    // プレイエリアに置いて効果を適用
    player.playArea.push(card);
    applyOnPlayEffects(state, card, owner);
  
    return state;
  }
  
  //------------------------------------------------------
  // 購入フェーズ：カードを1枚購入
  //------------------------------------------------------
  
  /**
   * カードを1枚購入する
   * - supply から cardId のカードを1枚減らし、プレイヤーの捨札に置く
   * - effectiveCost（割引適用後）が riceThisTurn 以下なら購入成功
   * - 失敗（お金が足りない or 在庫0）の場合は state を変更しない
   */
  export function buyCardById(
    state: GameState,
    owner: "player" | "cpu",
    cardId: string | null
  ): GameState {
    if (!cardId) return state;
  
    const player = getCurrentPlayer(state, owner);
    const pile = state.supply[cardId];
  
    if (!pile || pile.remaining <= 0) {
      // 在庫なし
      return state;
    }
  
    const card = pile.card;
    const effectiveCost = getEffectiveCostForPlayer(player, card);
  
    if (player.riceThisTurn < effectiveCost) {
      // お金が足りない
      return state;
    }
  
    // 米を支払い、カードを獲得
    player.riceThisTurn -= effectiveCost;
    pile.remaining -= 1;
    player.discard.push(card);
  
    // 購入時効果（onBuy）があれば適用したい場合はここで applyOnBuyEffects を呼ぶ
    // state = applyOnBuyEffects(state, card, owner);
  
    return state;
  }
  
  //------------------------------------------------------
  // 「1ターンまるごと」を自動で回すユーティリティ（CPU用）
  //------------------------------------------------------
  
  /**
   * CPU用：1ターンを完全自動で処理する
   * - startTurn → 資源 → 行動（cpuLogicで選択） → 購入（cpuLogicで選択） → endTurn
   * - chooseActionCardId / chooseBuyCardId は cpuLogic.ts から渡してもらう
   */
  export function runCpuTurn(
    state: GameState,
    chooseActionCardId: (state: GameState) => string | null,
    chooseBuyCardId: (state: GameState) => string | null
  ): GameState {
    // ターン開始
    state = startTurn(state);
  
    // 資源フェーズ
    state = playAllResources(state, "cpu");
  
    // 行動フェーズ
    const actionId = chooseActionCardId(state);
    state = playActionCardById(state, "cpu", actionId);
  
    // 購入フェーズ
    const buyId = chooseBuyCardId(state);
    state = buyCardById(state, "cpu", buyId);
  
    // クリーンアップ＆ターン終了
    state = endTurn(state);
  
    return state;
  }
  
  /**
   * プレイヤー用：UI側がフェーズごとに操作する場合のサンプルフロー
   * - 実際には各フェーズをボタンごとに分けて呼び出す想定
   */
  export function runPlayerTurnOnceAllDecided(
    state: GameState,
    actionCardId: string | null,
    buyCardId: string | null
  ): GameState {
    state = startTurn(state);
    state = playAllResources(state, "player");
    state = playActionCardById(state, "player", actionCardId);
    state = buyCardById(state, "player", buyCardId);
    state = endTurn(state);
    return state;
  }
  
  //------------------------------------------------------
  // 勝者判定ロジック（簡易版）
  //------------------------------------------------------
  
  /**
   * 全カードと victoryPointsBonus から最終スコアを計算して勝者を決める
   * - v1では「国力カード（endGame効果）＋ボーナス」の単純な合計
   * - 将来（v1.1以降）は cardEffects.applyEndGameEffects を使う形に差し替える想定
   */
  function judgeWinner(state: GameState): "player" | "cpu" | "draw" {
    const playerScore = calcTotalVictoryPoints(state.player);
    const cpuScore = calcTotalVictoryPoints(state.cpu);
  
    if (playerScore > cpuScore) return "player";
    if (cpuScore > playerScore) return "cpu";
    return "draw";
  }
  
  function calcTotalVictoryPoints(player: PlayerState): number {
    const allCards: Card[] = [
      ...player.deck,
      ...player.hand,
      ...player.discard,
      ...player.playArea
    ];
    let points = player.victoryPointsBonus;
  
    for (const card of allCards) {
      for (const ef of card.effects) {
        if (ef.trigger === "endGame" && ef.effect === "addVictory") {
          points += ef.value ?? 0;
        }
      }
    }
  
    return points;
  }
  