// src/game/effects.ts
// public/cards.json の RAW_KEYS を 100% 吸収できる「動くDSL（正規形）」定義
// - cards.json の表現ゆれ（gainRice/gainKnowledge/gainVP/draw/reduceCostThisTurn/...）は
//   cardRegistry.normalizeEffects() でこの型に正規化してから、applyEffect が解釈する。

export type EffectDSL =
  | {
      type: "gain";
      rice?: number;
      knowledge?: number;
      draw?: number;
      actions?: number;
      buys?: number;
      vp?: number;
      raw?: any;
    }
  | {
      type: "trashFromHand";
      count: number;
      raw?: any;
    }
  | {
      type: "selfDiscard";
      count: number;
      raw?: any;
    }
  | {
      type: "attackDiscard";
      count: number;
      raw?: any;
    }
  | {
      type: "discount";
      amount: number;
      raw?: any;
    }
  | {
      type: "conditional";
      if: string;
      then: EffectDSL[];
      else?: EffectDSL[];
      raw?: any;
    }
  | {
      type: "unknown";
      raw: any;
    };


