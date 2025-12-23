// src/ui/logEnhancer.ts
// UI表示用：eventLog を「追跡しやすい表示」に整形する（ゲームロジックは変更しない）

type Actor = "プレイヤー" | "CPU" | "システム" | string;

type SourceCtx = {
  cardName?: string;
  cardId?: string;
};

function splitActorLine(line: string): { actor: Actor; msg: string } {
  const idx = line.indexOf("：");
  if (idx < 0) return { actor: "", msg: line };
  return { actor: line.slice(0, idx), msg: line.slice(idx + 1) };
}

function parseEnterPlay(msg: string): { cardId?: string; name?: string } | null {
  // 例: [TRACE] ENTER_PLAY: ... cardId=SG_E01 name=平賀源内 type=person
  if (!msg.startsWith("[TRACE] ENTER_PLAY:")) return null;
  const mId = msg.match(/\bcardId=([^\s]+)\b/);
  const mName = msg.match(/\bname=([^\s]+)\b/);
  return {
    cardId: mId?.[1],
    name: mName?.[1]
  };
}

function parsePlay(msg: string): { name?: string } | null {
  // 例: [PLAY] 「平賀源内」を使用
  if (!msg.startsWith("[PLAY]")) return null;
  const m = msg.match(/^\[PLAY\]\s*「(.+?)」を使用/);
  if (!m) return null;
  return { name: m[1] };
}

function hasEffSource(msg: string): boolean {
  return /^\[EFF\]\[[^\]]+\]/.test(msg);
}

function attachEffSource(msg: string, src: SourceCtx | undefined): string {
  if (!msg.startsWith("[EFF]")) return msg;
  if (hasEffSource(msg)) return msg;

  const label = src?.cardName ?? src?.cardId;
  if (!label) return msg;

  // "[EFF] " の直後に差し込む（既存文言は維持）
  const rest = msg.slice("[EFF]".length);
  return `[EFF][${label}]${rest}`;
}

/**
 * eventLog から「発生源カードつきの [EFF]」を表示用に生成する。
 * - **ゲーム状態は変更しない**。UI表示用の整形のみ。
 * - 発生源の推定は「同じactorの直近の [TRACE] ENTER_PLAY / [PLAY]」から行う。
 */
export function enhanceEventLogForDisplay(lines: string[]): string[] {
  const ctxByActor = new Map<Actor, SourceCtx>();
  const out: string[] = [];

  for (const line of lines) {
    const { actor, msg } = splitActorLine(line);

    // 文脈更新（TRACE優先でID+nameが取れる）
    const enter = parseEnterPlay(msg);
    if (enter) {
      const prev = ctxByActor.get(actor) ?? {};
      ctxByActor.set(actor, {
        ...prev,
        cardId: enter.cardId ?? prev.cardId,
        cardName: enter.name ?? prev.cardName
      });
      out.push(line);
      continue;
    }

    const play = parsePlay(msg);
    if (play) {
      const prev = ctxByActor.get(actor) ?? {};
      ctxByActor.set(actor, {
        ...prev,
        cardName: play.name ?? prev.cardName
      });
      out.push(line);
      continue;
    }

    // [EFF] のみ発生源を付与
    const src = ctxByActor.get(actor);
    const enriched = attachEffSource(msg, src);
    out.push(actor ? `${actor}：${enriched}` : enriched);
  }

  return out;
}


