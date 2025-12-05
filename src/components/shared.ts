// src/components/shared.ts
// UI 用の小さな共通ヘルパー

import type { Card } from "../logic/cardEffects";

export function renderTypeLabel(type: Card["type"]): string {
  switch (type) {
    case "resource":
      return "資源";
    case "character":
      return "人物";
    case "event":
      return "出来事";
    case "victory":
      return "国力";
    default:
      return "";
  }
}


