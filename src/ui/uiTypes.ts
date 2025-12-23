// src/ui/uiTypes.ts
// アプリ全体で共有する UI スクリーン状態とゲーム結果・デッキ情報の型

import type { GameState, ActivePlayer } from "../game/gameState";
import type { EraId } from "../game/era";
import type { VictoryBreakdownEntry } from "../game/socre";

export type UiScreen = "start" | "deckSelect" | "game" | "result" | "cardDex";

export interface GameOutcome {
  finalState: GameState;
  winner: ActivePlayer | "draw" | null;
  playerScore: number;
  cpuScore: number;
  playerBreakdown: VictoryBreakdownEntry[];
  cpuBreakdown: VictoryBreakdownEntry[];
}

// デッキ設定（将来の拡張を見越した構成）
export interface DeckConfig {
  id: string;
  name: string;
  description: string;
  era: EraId;
  deckType: "basic" | "challenge";
  initialDeck: string[]; // CardId の配列（cards.json の id と一致させる）
}

// スターターデッキ定義
const COMMON_STARTER_BASIC: string[] = [
  "RICE_SMALL",
  "RICE_SMALL",
  "RICE_SMALL",
  "RICE_SMALL",
  "RICE_SMALL",
  "RICE_SMALL",
  "RICE_SMALL",
  "VP_VILLAGE",
  "VP_VILLAGE",
  "VP_VILLAGE"
];

const SENGOKU_STARTER_CHALLENGE: string[] = [
  "RICE_SMALL",
  "RICE_SMALL",
  "RICE_SMALL",
  "RICE_SMALL",
  "RICE_SMALL",
  "RICE_MEDIUM",
  "RICE_MEDIUM",
  "VP_VILLAGE",
  "VP_VILLAGE",
  "VP_VILLAGE"
];

export const DEFAULT_DECKS: DeckConfig[] = [
  {
    id: "ancient-basic",
    name: "古代デッキ（基本）",
    description:
      "古代日本をテーマにした基本デッキ。まずはここから歴史の流れを体験できます。",
    era: "ancient",
    deckType: "basic",
    initialDeck: COMMON_STARTER_BASIC
  },
  {
    id: "ancient-mediterranean-basic",
    name: "古代地中海世界デッキ（基本）",
    description:
      "メソポタミア・ギリシア・ローマを中心とした古代地中海世界の基本デッキ。",
    era: "ancient_mediterranean",
    deckType: "basic",
    initialDeck: COMMON_STARTER_BASIC
  },
  {
    id: "islamic-world-basic",
    name: "イスラーム世界デッキ（基本）",
    description:
      "翻訳運動・隊商交易・学問都市など、イスラーム世界をテーマにした基本デッキ。",
    era: "islamic_world",
    deckType: "basic",
    initialDeck: COMMON_STARTER_BASIC
  },
  {
    id: "medieval-europe-basic",
    name: "中世ヨーロッパデッキ（基本）",
    description:
      "封建制・十字軍・都市の発達など、中世ヨーロッパ世界をテーマにした基本デッキ。",
    era: "medieval_europe",
    deckType: "basic",
    initialDeck: COMMON_STARTER_BASIC
  },
  {
    id: "medieval-basic",
    name: "中世デッキ（基本）",
    description:
      "鎌倉・室町といった中世の日本史を味わえる標準デッキです。",
    era: "medieval",
    deckType: "basic",
    initialDeck: COMMON_STARTER_BASIC
  },
  {
    id: "sengoku-basic",
    name: "戦国デッキ（基本）",
    description:
      "こめ袋（小）7枚と村落3枚の、もっとも標準的なデッキ。",
    era: "sengoku",
    deckType: "basic",
    initialDeck: COMMON_STARTER_BASIC
  },
  {
    id: "sengoku-challenge",
    name: "戦国デッキ（チャレンジ）",
    description:
      "こめ袋（小）を減らし、中サイズの米を混ぜた上級者向け構成。",
    era: "sengoku",
    deckType: "challenge",
    initialDeck: SENGOKU_STARTER_CHALLENGE
  },
  {
    id: "edo-basic",
    name: "江戸デッキ（基本）",
    description:
      "平和な江戸時代を舞台にした基本デッキ。経済と文化の広がりを楽しめます。",
    era: "edo",
    deckType: "basic",
    initialDeck: COMMON_STARTER_BASIC
  },
  {
    id: "meiji-basic",
    name: "明治デッキ（基本）",
    description:
      "近代国家への変化を追体験できる基本デッキ。まずは標準構成で遊べます。",
    era: "meiji",
    deckType: "basic",
    initialDeck: COMMON_STARTER_BASIC
  }
];