## 概要
このドキュメントは **新しい時代（era）**（例: `ancient-west` / `medieval-europe` など）を追加するときに、迷わず作業できるように **触るファイル/手順/検証コマンド**を固定化したものです。

---

## Step 1: EraId の追加（`src/game/era.ts`）
1. `src/game/era.ts` の `EraId` に新しいID文字列を追加します。
2. 以降、UIや初期化はこの `EraId` を参照する前提です。

例：

```ts
export type EraId =
  | "ancient"
  | "medieval"
  | "sengoku"
  | "edo"
  | "meiji"
  | "ancient-west"; // NEW
```

---

## Step 2: `public/cards.json` へのカード追加ルール
`public/cards.json` が **唯一のカードデータソース**です。

### 必須フィールド
- **id**: 一意（重複禁止）
- **name**: 空文字禁止
- **era**: `EraId` に存在する文字列
- **category**: `resource` / `victory` / `person` / `event` など（プロジェクト定義に合わせる）
- **cost**: 0以上の整数
- **effects**: 配列（空配列でもOK）
- **image**: `/assets/cards/{cardId}.webp`

### image 命名規則
- `image` は必ず **`/assets/cards/{cardId}.webp`** に統一します。
- 実ファイルは後述の画像同期で `public/assets/cards/{cardId}.webp` を生成して揃えます。

---

## Step 3: DEFAULT_DECKS への追加（基本スターターの使い方）
デッキ選択に出すには `src/ui/uiTypes.ts` の `DEFAULT_DECKS` に追加します。

最低限：
- `era`: 新EraId
- `deckType`: `"basic"` など
- `initialDeck`: 既存の基本スターター（例: `COMMON_STARTER_BASIC`）をそのまま使ってOK

例：

```ts
{
  id: "ancient-west-basic",
  name: "古代（西方）デッキ（基本）",
  description: "…",
  era: "ancient-west",
  deckType: "basic",
  initialDeck: COMMON_STARTER_BASIC
}
```

---

## Step 4: 画像の追加手順（PNG配置 → webp生成 → 検証）
このプロジェクトでは `cards.json` の参照は **webp固定**です（`/assets/cards/{cardId}.webp`）。

### 4-1. PNG を配置
元画像（PNG）は以下へ配置します：
- `public/assets/カード画像　全種類/{era}/{cardId}.png`

### 4-2. webp を生成（同期）
PNG → webp を生成します（不足分のみ生成）。

```bash
npm run sync:images
```

強制上書きしたい場合：

```bash
npm run sync:images:force
```

### 4-3. 参照切れが無いことを検証

```bash
npm run validate:assets
```

---

## Step 5: 検証コマンド（CI/ローカル）
追加作業の最後に必ず実行してください。

```bash
npm run validate:cards
npm run validate:assets
```

---

## よくあるエラーと対処
### unknown effect / 未知RAW_KEYS
- `npm run validate:cards` で WARN/ERROR として表示されます。
- `cards.json` の `effects` が想定外のDSLになっている可能性が高いです。
- まずは `effects` のキー（RAW_KEYS）を確認し、正規化が吸収できる形に寄せるか、正規化側の対応を検討します。

### image missing（/assets/cards/{id}.webp が無い）
- `npm run validate:assets` が ERROR で落ちます。
- 対処：
  1) `public/assets/カード画像　全種類/{era}/{id}.png` を配置
  2) `npm run sync:images`
  3) `npm run validate:assets`

### sync:images でプレースホルダーが使われる
- 元PNGが見つからない場合、暫定でプレースホルダーwebpが生成されることがあります。
- 画像を揃えるには `public/assets/カード画像　全種類/{era}/{id}.png` を追加して再実行してください。


