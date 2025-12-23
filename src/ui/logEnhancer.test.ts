// src/ui/logEnhancer.test.ts
import { describe, it, expect } from "vitest";
import { enhanceEventLogForDisplay } from "./logEnhancer";

describe("enhanceEventLogForDisplay", () => {
  it("[EFF] に直近の [PLAY]/[TRACE ENTER_PLAY] のカード名/IDが付与される", () => {
    const input = [
      "プレイヤー：[TRACE] ENTER_PLAY: core/resolve.ts::resolvePlayCard cardId=SG_E01 name=平賀源内 type=person",
      "プレイヤー：[PLAY] 「平賀源内」を使用",
      "プレイヤー：[EFF] 見識 +1",
      "CPU：[EFF] 米 +1"
    ];

    const out = enhanceEventLogForDisplay(input);
    expect(out[2]).toContain("[EFF][平賀源内]");
    // CPU側は文脈がないので従来通り
    expect(out[3]).toBe("CPU：[EFF] 米 +1");
  });
});


