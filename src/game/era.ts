// src/game/era.ts
// 時代ID（cards.json の era）を、循環参照を避けるために独立定義する。

export type EraId =
  | "ancient"
  | "medieval"
  | "medieval_europe"
  | "sengoku"
  | "edo"
  | "meiji"
  | "ancient_mediterranean"
  | "islamic_world"
  | "east_asia"
  | "south_asia";


