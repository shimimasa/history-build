/**
 * * ===== v1.5 仕様 (god.md 1章 / tech.md 2章) との主なズレまとめ =====
 *
 * 1. 型定義まわり
 * - Card 型に requiredKnowledge?: number がなく、cards.json の requiredKnowledge を型として扱えていない。
 * - PlayerState / GameState / SupplyPile は tech.md 2-2 とほぼ一致するが、
 *   PlayerState.temporaryDiscounts などの拡張フィールドがある（discount 実装用で仕様上は許容）。
 * - initGameState で era === "sengoku" フィルタをしており、cards.json の "Sengoku" と大文字小文字が不一致。
 * - STARTING_DECK_CONFIG が god.md 1-2 の「こめ袋（小）×7 ＋ 村落×3」と異なり、"SENGOKU_R1"×10 になっている。
 *
 * 2. ターン進行フロー
 * - startTurn / endTurn の基本挙動（手札0なら5枚ドロー、米0リセット、手番交代、turnNumber / turnsTaken 更新、
 *   両者 maxTurnsPerPlayer 到達で isGameOver + judgeWinner）は tech.md 2-4 と概ね一致。
 * - ただしフェーズ状態（資源→行動→購入）を GameState で管理しておらず、UI でも順序や回数の制限をしていない。
 *   - 行動フェーズ: playActionCardById は1枚前提だが、1ターンに1回までというフラグがなく、
 *     プレイヤーは同一ターン中に複数の人物/出来事カードをプレイできてしまう。
 *   - 購入フェーズ: buyCardById 自体は1購入処理だが、UI から何度でも呼べるため、
 *     「1ターンにカード1枚だけ購入」という god.md 1-3 の仕様とズレている。
 *
 * 3. カードプレイと効果解決
 * - addRice は riceThisTurn に加算、addKnowledge は knowledge に加算、draw はデッキ切れ時に discard をシャッフルするなど、
 *   基本的なリソース処理とドロー処理は tech.md 2-2 / 2-4 と整合。
 * - trashFromHand は UI から任意カード選択ではなく「手札先頭を強制破棄」の簡易版になっており、
 *   tech.md 2-2 の「任意のカード1枚を除外」とは挙動が異なる（コメントで暫定実装である旨は記載済み）。
 *
 * * 4. 購入ロジック（cost + requiredKnowledge）
 * - プレイヤー側 buyCardById / CPU 側 chooseCpuBuyCardId ともに、
 *   支払可能かどうかを riceThisTurn と cost（＋discount）のみで判定しており、
 *   tech.md 2-5 にある
 *     available = riceThisTurn + knowledge
 *     required = card.requiredKnowledge ?? 0
 *     return available >= effectiveCost && player.knowledge >= required
 *   というルールを満たしていない。
 * - 共通の canBuyCard(player, card) 相当の関数が存在せず、プレイヤーと CPU が別々のロジックで購入判定している。
 *
 * 5. GameScreen / UI との接続
 * - tech.md 2-1 にある HandArea / CardPool / ResourceBar などのコンポーネントは未実装で、
 *   現在は GameScreen.tsx に CPU 情報・リソースバー・サプライ表示などをすべて集約している。
 * - サプライの購入ボタン活性条件は riceThisTurn >= card.cost のみで、
 *   discount や requiredKnowledge を考慮していないため、表示上の「買える/買えない」とロジックが一致しない。
 * - カード詳細ポップアップおよびサプライ表示で requiredKnowledge（知識条件）を表示しておらず、
 *   「知識が足りないと強いカードが買えない」という学習要素が UI に反映されていない。
 * - 行動フェーズの「1ターンに1枚まで」という制限を UI 側でも制御していない。
 *
 * 6. CPU ターン処理
 * - runCpuTurn は startTurn → 資源プレイ → 行動1枚 → 購入1枚 → endTurn という流れで、
 *   god.md 1-3 のターン構造とほぼ一致している。
 * - ただし CPU の購入候補抽出は riceThisTurn と cost（＋discount）だけを見ており、
 *   requiredKnowledge を考慮していない。また canBuyCard を共通利用していない。
 * - Early / Mid / Late のタイプ優先戦略（資源→人物/出来事→国力）は cpu.md / tech.md の方針どおり。
 */

import {
  GameState,
  PlayerState,
  Card,
  applyOnPlayEffects,
  clearTemporaryDiscounts,
  canBuyCard
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
 * - 行動／購入フラグをリセット
 * - 手札が空なら5枚引く（ゲーム開始直後や前ターン終了直後を想定）
 */
export function startTurn(state: GameState): GameState {
  const owner = state.currentTurn;
  const player = getCurrentPlayer(state, owner);

  // 前ターンの割引をリセット
  clearTemporaryDiscounts(player);

  // 米をリセット
  player.riceThisTurn = 0;

  // フェーズ用フラグをリセット
  player.hasPlayedActionThisTurn = false;
  player.hasBoughtThisTurn = false;

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
 * - 行動／購入フラグリセット
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

  // フェーズ用フラグをリセット（安全のため）
  me.hasPlayedActionThisTurn = false;
  me.hasBoughtThisTurn = false;

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
 * - すでにこのターン行動カードをプレイしている場合は何もしない
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

  // 1ターンにプレイできる行動カードは1枚まで
  if (player.hasPlayedActionThisTurn) {
    return state;
  }

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

  // このターンの行動は使い切り
  player.hasPlayedActionThisTurn = true;

  return state;
}
  
//------------------------------------------------------
// 購入フェーズ：カードを1枚購入
//------------------------------------------------------

/**
 * カードを1枚購入する
 * - supply から cardId のカードを1枚減らし、プレイヤーの捨札に置く
 * - canBuyCard(player, card) が true のときのみ購入成功
 *   （米 + 知識 が割引後コスト以上 & 知識が requiredKnowledge 以上）
 * - 1ターンに購入できるのは1枚だけ（hasBoughtThisTurn で制御）
 * - 条件を満たさない / 在庫0 の場合は state を変更しない
 */

export function buyCardById(
  state: GameState,
  owner: "player" | "cpu",
  cardId: string | null
): GameState {
  if (!cardId) return state;

  const player = getCurrentPlayer(state, owner);

  // 1ターンに購入できるのは1枚まで
  if (player.hasBoughtThisTurn) {
    return state;
  }

  const pile = state.supply[cardId];

  if (!pile || pile.remaining <= 0) {
    // 在庫なし
    return state;
  }

  const card = pile.card;

  if (!canBuyCard(player, card)) {
    // 米 + 知識 / 知識条件 のどちらかが足りない
    return state;
  }
// v1.5 では「支払ったふり」：リソースは消費せず、条件判定のみ
pile.remaining -= 1;
player.discard.push(card);

// このターンの購入は使い切り
player.hasBoughtThisTurn = true;

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
  