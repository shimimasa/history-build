// src/logic/cpuLogic.ts
// CPU が「どのカードをプレイするか」「どのカードを買うか」を決めるロジック

import {
    GameState,
    PlayerState,
    Card,
    CardType,
    getEffectiveCostForPlayer
  } from "./cardEffects";
  
  //------------------------------------------------------
  // ヘルパー
  //------------------------------------------------------
  
  function getCpu(state: GameState): PlayerState {
    return state.cpu;
  }
  
  /**
   * CPU のターンフェーズを判定する
   * - early : 基盤づくり（資源優先）
   * - mid   : 攻めの時間（人物・出来事優先）
   * - late  : 点数を取りに行く（国力優先）
   */
  type CpuPhase = "early" | "mid" | "late";
  
  function getPhase(turnsTaken: number): CpuPhase {
    if (turnsTaken < 4) return "early";      // 1〜4ターン目
    if (turnsTaken < 10) return "mid";       // 5〜10ターン目
    return "late";                           // 11ターン目以降
  }
  
  /**
   * カードのざっくりスコアリング関数
   * - addRice       : *2
   * - addKnowledge  : *1.5
   * - draw          : *1.5
   * - addVictory    : *3
   * - discount      : +2
   */
  function scoreCard(card: Card): number {
    let score = 0;
  
    for (const ef of card.effects) {
      const v = ef.value ?? 0;
  
      if (ef.effect === "addRice") {
        score += v * 2;
      }
      if (ef.effect === "addKnowledge") {
        score += v * 1.5;
      }
      if (ef.effect === "draw") {
        score += v * 1.5;
      }
      if (ef.effect === "addVictory") {
        score += v * 3;
      }
      if (ef.effect === "discount") {
        score += 2;
      }
    }
  
    // 少しだけタイプごとの補正をかけても良い
    if (card.type === "victory") {
      score += 0.5; // 国力カードは終盤で重要
    }
  
    return score;
  }
  
  //------------------------------------------------------
  // 行動カードの選択（人物 or 出来事）
  //------------------------------------------------------
  
  /**
   * CPU がこのターンにプレイする「行動カード」（人物 or 出来事）を 1枚選ぶ
   * - イベント > 人物 の順で優先
   * - そのタイプの中で scoreCard が最も高いものを選択
   * - 適切なカードがなければ null
   */
  export function chooseCpuActionCardId(state: GameState): string | null {
    const cpu = getCpu(state);
    const hand = cpu.hand;
  
    // 出来事カードを優先して候補に
    const events = hand.filter((c) => c.type === "event");
    if (events.length > 0) {
      const sorted = [...events].sort((a, b) => scoreCard(b) - scoreCard(a));
      return sorted[0].id;
    }
  
    // 次に人物カード
    const characters = hand.filter((c) => c.type === "character");
    if (characters.length > 0) {
      const sorted = [...characters].sort((a, b) => scoreCard(b) - scoreCard(a));
      return sorted[0].id;
    }
  
    // 行動カードがない場合は何もしない
    return null;
  }
  
  //------------------------------------------------------
  // 購入カードの選択
  //------------------------------------------------------
  
  /**
   * CPU がこのターンに購入するカードを 1枚決める
   * - 現在の riceThisTurn から「買えるカード」を抽出
   * - フェーズごとの type 優先順に従って候補を絞り込み
   * - その中で scoreCard が最も高いカードを選択
   * - 買えるカードがなければ null
   */
  export function chooseCpuBuyCardId(state: GameState): string | null {
    const cpu = getCpu(state);
    const rice = cpu.riceThisTurn;
    const phase = getPhase(cpu.turnsTaken); // early | mid | late
  
    // supply から、在庫があり、かつ 支払えるカードだけ抜き出す
    const affordable: Card[] = [];
  
    for (const pileId of Object.keys(state.supply)) {
      const pile = state.supply[pileId];
      if (!pile || pile.remaining <= 0) continue;
  
      const card = pile.card;
      const cost = getEffectiveCostForPlayer(cpu, card);
  
      if (cost <= rice) {
        affordable.push(card);
      }
    }
  
    if (affordable.length === 0) {
      return null;
    }
  
    // フェーズごとの優先タイプ
    let priority: CardType[];
  
    if (phase === "early") {
      // デッキの基盤づくり：資源優先
      priority = ["resource", "character", "event", "victory"];
    } else if (phase === "mid") {
      // 攻め：人物＆イベント中心
      priority = ["character", "event", "resource", "victory"];
    } else {
      // late：勝ちに行く：国力最優先
      priority = ["victory", "character", "event", "resource"];
    }
  
    // 優先順に従って候補を絞り、その中でスコア最大を選ぶ
    for (const t of priority) {
      const candidates = affordable.filter((c) => c.type === t);
      if (candidates.length === 0) continue;
  
      const sorted = [...candidates].sort((a, b) => scoreCard(b) - scoreCard(a));
      return sorted[0].id;
    }
  
    // ここまで来ることはほぼないが、安全のため
    const sortedAll = [...affordable].sort((a, b) => scoreCard(b) - scoreCard(a));
    return sortedAll[0]?.id ?? null;
  }
  