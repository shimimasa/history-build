// src/game/effects.ts
// public/cards.json の RAW_KEYS を 100% 吸収できる「動くDSL（正規形）」定義（canonical）
// - cards.json の表記ゆれ（gainRice/gainKnowledge/gainVP/draw/reduceCostThisTurn/...）は
//   cardRegistry.normalizeEffects() でこの形に正規化してから、applyEffect が解釈する。

export type GainBundle = {
  rice?: number;
  knowledge?: number;
  draw?: number;
  actions?: number;
  buys?: number;
  vp?: number;
};

export type EffectDSL =
  | { type: "gain"; gain: GainBundle; __cardId?: string; raw?: any }
  | { type: "discount"; discountThisTurn: number; __cardId?: string; raw?: any }
  | { type: "trashFromHand"; count: number; __cardId?: string; raw?: any }
  | { type: "selfDiscard"; count: number; __cardId?: string; raw?: any }
  | { type: "attackDiscard"; count: number; __cardId?: string; raw?: any }
  | {
      type: "conditional";
      if: string;
      then: EffectDSL[];
      else?: EffectDSL[];
      __cardId?: string;
      raw?: any;
    }
  | { type: "unknown"; raw: any; __cardId?: string };


