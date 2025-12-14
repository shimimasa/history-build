// src/game/core/types.ts

// 既存 ActivePlayer に合わせたプレイヤーID
export type PlayerId = "player" | "cpu";

// 新フェーズ（状態遷移のステートマシン）
export type Phase = "ACTION" | "BUY" | "CLEANUP" | "GAME_OVER";

// 1ターン中のカウンタ
export type TurnCounters = {
  actions: number;
  buys: number;
  rice: number;
  knowledge: number;
};

// UI / エンジンから飛んでくる「コマンド」
export type Command =
  | { type: "PLAY_CARD"; playerId: PlayerId; cardId: string }
  | { type: "AUTO_PLAY_RESOURCES"; playerId: PlayerId }
  | { type: "BUY_CARD"; playerId: PlayerId; supplyCardId: string }
  | { type: "END_PHASE"; playerId: PlayerId }
  | { type: "END_TURN"; playerId: PlayerId };

// ゲーム内部で流れる「イベント」
export type GameEvent =
  | { type: "LOG"; msg: string }
  | { type: "PHASE_SET"; phase: Phase }
  | {
      type: "COUNTER_ADD";
      playerId: PlayerId;
      key: keyof TurnCounters;
      amount: number;
    }
  | {
      type: "COUNTER_SET";
      playerId: PlayerId;
      counters: TurnCounters;
    }
  | {
      type: "MOVE_CARD";
      playerId: PlayerId;
      cardInstanceId: string; // いまは cardId をそのまま使う
      from: "DECK" | "HAND" | "DISCARD" | "IN_PLAY";
      to: "DECK" | "HAND" | "DISCARD" | "IN_PLAY";
    }
  | { type: "DRAW"; playerId: PlayerId; count: number }
  | {
      type: "GAIN_CARD";
      playerId: PlayerId;
      supplyCardId: string;
      to: "DISCARD" | "HAND" | "TOP_DECK";
    }
  | {
      type: "SUPPLY_DEC";
      supplyCardId: string;
      amount: number;
    }
  | { type: "TURN_PLAYER_SET"; playerId: PlayerId }
  | { type: "GAME_END" };