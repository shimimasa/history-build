// scripts/syncCardImages.ts
// public/assets/カード画像　全種類/<era>/<cardId>.png を元に、
// public/assets/cards/<cardId>.webp を生成して揃える。
//
// - cards.json の image 参照（/assets/cards/{ID}.webp）は維持する前提。
// - 既に出力がある場合はスキップ（--force で上書き）
//
// 実行:
// - npm run sync:images
// - npm run sync:images:force

import fs from "node:fs";
import path from "node:path";

type RawCard = {
  id: string;
  era?: string;
  image?: string;
};

type Result = {
  generated: number;
  skipped: number;
  placeholder: number;
  failed: number;
  placeholderIds: string[];
  failures: { cardId: string; reason: string }[];
};

function readCardsJson(): RawCard[] {
  const p = path.join(process.cwd(), "public", "cards.json");
  const raw = JSON.parse(fs.readFileSync(p, "utf8"));
  const cards = (raw.cards ?? raw) as any[];
  if (!Array.isArray(cards)) {
    throw new Error("public/cards.json: root must be array or { cards: array }");
  }
  return cards as RawCard[];
}

function ensureDir(p: string) {
  fs.mkdirSync(p, { recursive: true });
}

function parseArgs(argv: string[]) {
  return {
    force: argv.includes("--force")
  };
}

function isExpectedWebpRef(image: string, cardId: string): boolean {
  // cards.json は /assets/cards/{ID}.webp を指す方針
  const norm = image.startsWith("/") ? image : `/${image}`;
  return norm === `/assets/cards/${cardId}.webp`;
}

function findSourcePng(card: RawCard): string | null {
  const id = card.id;
  const era = card.era;

  // 優先: era 配下
  if (era) {
    const p = path.join(
      process.cwd(),
      "public",
      "assets",
      "カード画像　全種類",
      era,
      `${id}.png`
    );
    if (fs.existsSync(p)) return p;
  }

  // フォールバック: 全 era を走査（配置ゆれ救済）
  const baseDir = path.join(process.cwd(), "public", "assets", "カード画像　全種類");
  try {
    const eras = fs.readdirSync(baseDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);
    for (const e of eras) {
      const p = path.join(baseDir, e, `${id}.png`);
      if (fs.existsSync(p)) return p;
    }
  } catch {
    // ignore
  }

  return null;
}

async function main() {
  const { force } = parseArgs(process.argv.slice(2));

  // sharp はネイティブ依存があるので、エラー時のメッセージを分かりやすくする
  let sharp: any;
  try {
    sharp = (await import("sharp")).default;
  } catch (e) {
    console.error("[ERROR] sharp の import に失敗しました。依存関係を確認してください。");
    console.error(String(e));
    process.exit(1);
  }

  const cards = readCardsJson();
  const outDir = path.join(process.cwd(), "public", "assets", "cards");
  ensureDir(outDir);
  const placeholderWebp = path.join(outDir, "RICE_SMALL.webp");

  // 母集団: cards.json の cardId（image が /assets/cards/{id}.webp を指すものだけ）
  const targets = cards.filter((c) => typeof c?.id === "string" && typeof c?.image === "string")
    .filter((c) => isExpectedWebpRef(String(c.image), c.id));

  const res: Result = { generated: 0, skipped: 0, placeholder: 0, failed: 0, placeholderIds: [], failures: [] };

  // 速度のため、最大4並列で変換
  const concurrency = 4;
  let idx = 0;

  const worker = async () => {
    while (idx < targets.length) {
      const cur = targets[idx++];
      const cardId = cur.id;
      const outPath = path.join(outDir, `${cardId}.webp`);

      if (!force && fs.existsSync(outPath)) {
        res.skipped++;
        continue;
      }

      const srcPng = findSourcePng(cur);
      if (!srcPng) {
        // 元PNGが無い場合は、暫定プレースホルダー（既存webp）をコピーして参照切れを防ぐ
        if (fs.existsSync(placeholderWebp)) {
          try {
            fs.copyFileSync(placeholderWebp, outPath);
            res.placeholder++;
            res.placeholderIds.push(cardId);
          } catch (e) {
            res.failed++;
            res.failures.push({ cardId, reason: `placeholder copy failed: ${String(e)}` });
          }
          continue;
        }
        res.failed++;
        res.failures.push({ cardId, reason: "source png not found (and placeholder missing)" });
        continue;
      }

      try {
        await sharp(srcPng)
          .webp({ quality: 80 })
          .toFile(outPath);
        res.generated++;
      } catch (e) {
        res.failed++;
        res.failures.push({ cardId, reason: `sharp failed: ${String(e)}` });
      }
    }
  };

  await Promise.all(Array.from({ length: concurrency }, () => worker()));

  console.log("===============");
  console.log("sync:images");
  console.log("===============");
  console.log(`Targets: ${targets.length}`);
  console.log(`Generated: ${res.generated}`);
  console.log(`Skipped: ${res.skipped}`);
  console.log(`Placeholder: ${res.placeholder}`);
  console.log(`Failed: ${res.failed}`);

  if (res.placeholderIds.length > 0) {
    console.log("");
    console.log("[WARN] 元PNGが無いためプレースホルダーを使用した cardId:");
    for (const id of res.placeholderIds.slice(0, 50)) {
      console.log(`- ${id}`);
    }
    if (res.placeholderIds.length > 50) {
      console.log(`... and ${res.placeholderIds.length - 50} more`);
    }
  }

  if (res.failures.length > 0) {
    console.log("");
    console.log("[ERROR] 失敗した cardId:");
    for (const f of res.failures.slice(0, 50)) {
      console.log(`- ${f.cardId}: ${f.reason}`);
    }
    if (res.failures.length > 50) {
      console.log(`... and ${res.failures.length - 50} more`);
    }
  }

  if (res.failed > 0) process.exit(1);
  process.exit(0);
}

main();


