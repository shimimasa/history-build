/* eslint-disable no-console */
// scripts/scan-effects.cjs
// public/cards.json を走査して、RAW(effect objectのキー) と 正規化後タイプ を集計する。
//
// 実行:
//   node scripts/scan-effects.cjs

const fs = require("fs");
const path = require("path");

function readCardsJson() {
  const p = path.join(process.cwd(), "public", "cards.json");
  const raw = fs.readFileSync(p, "utf8");
  const json = JSON.parse(raw);
  const cards = Array.isArray(json) ? json : json.cards;
  if (!Array.isArray(cards)) {
    throw new Error("cards.json の形式が不正です（json.cards が配列ではありません）");
  }
  return cards;
}

function addSample(map, key, cardId) {
  const e = map.get(key) ?? { count: 0, cards: new Set() };
  e.count += 1;
  if (e.cards.size < 5) e.cards.add(cardId);
  map.set(key, e);
}

function normalizeEffectTypesForRawEffect(rawEf) {
  // ここは src/game/cardRegistry.ts の normalizeEffects 相当の「概算版」。
  // 目的は cards.json 内の実データ分布を把握すること（漏れの特定）なので、
  // type がある場合はそれを優先し、legacy は代表的なキーから推定する。
  if (!rawEf || typeof rawEf !== "object") return [];

  // typed DSL
  if (typeof rawEf.type === "string") {
    const t = rawEf.type;
    if (
      t === "gain" ||
      t === "discount" ||
      t === "attackDiscard" ||
      t === "trashFromHand" ||
      t === "selfDiscard" ||
      t === "conditional" ||
      t === "unknown"
    ) {
      return [t];
    }
    return ["unknown"];
  }

  // legacy DSL
  const rice = rawEf.gainRice ?? rawEf.addRice ?? 0;
  const knowledge = rawEf.gainKnowledge ?? rawEf.addKnowledge ?? 0;
  const draw = rawEf.draw ?? 0;
  const victory = rawEf.gainVP ?? rawEf.gainVictory ?? rawEf.addVictory ?? 0;

  const types = [];
  if (rice || knowledge || draw || victory) types.push("gain");

  if (typeof rawEf.trashFromHand === "number" && rawEf.trashFromHand > 0)
    types.push("trashFromHand");

  if (typeof rawEf.reduceCostThisTurn === "number" && rawEf.reduceCostThisTurn !== 0)
    types.push("discount");

  if (typeof rawEf.attackDiscard === "number" && rawEf.attackDiscard > 0)
    types.push("attackDiscard");

  if (typeof rawEf.selfDiscard === "number" && rawEf.selfDiscard > 0)
    types.push("selfDiscard");

  const condSrc = rawEf.conditional ?? rawEf.condition;
  if (condSrc && typeof condSrc === "object") types.push("conditional");

  if (types.length === 0) types.push("unknown");
  return [...new Set(types)];
}

function main() {
  const cards = readCardsJson();

  const rawKeys = new Map(); // key -> {count, cards:Set}
  const normTypes = new Map(); // type -> {count, cards:Set}

  for (const c of cards) {
    const cardId = c.id ?? "(no-id)";
    const effects = Array.isArray(c.effects) ? c.effects : [];
    if (effects.length === 0) {
      addSample(rawKeys, "(no-effects)", cardId);
      addSample(normTypes, "(no-effects)", cardId);
      continue;
    }

    for (const ef of effects) {
      if (!ef || typeof ef !== "object") {
        addSample(rawKeys, "(non-object)", cardId);
        addSample(normTypes, "unknown", cardId);
        continue;
      }

      // RAW_KEYS: typed は type=<...>、legacy はトップレベルキーを列挙
      if (typeof ef.type === "string") {
        addSample(rawKeys, `type:${ef.type}`, cardId);
      } else {
        const keys = Object.keys(ef);
        if (keys.length === 0) addSample(rawKeys, "(empty-object)", cardId);
        for (const k of keys) addSample(rawKeys, k, cardId);
      }

      // NORM_TYPES（概算）
      const types = normalizeEffectTypesForRawEffect(ef);
      for (const t of types) addSample(normTypes, t, cardId);
    }
  }

  function printMap(title, map) {
    const rows = [...map.entries()].map(([k, v]) => ({
      key: k,
      count: v.count,
      sampleCards: [...v.cards].join(", ")
    }));
    rows.sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
    console.log(`\n=== ${title} ===`);
    for (const r of rows) {
      console.log(`${r.key}\tcount=${r.count}\tsample=${r.sampleCards}`);
    }
  }

  printMap("RAW_KEYS", rawKeys);
  printMap("NORM_TYPES (estimated)", normTypes);
}

main();


