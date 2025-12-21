# History Build – Technical Specification
## version 2.2

---

## 1. 技術設計方針

History Build の技術設計は、
**ゲームデザインを制約せず、宣言的に表現できること**
を最優先とする。

カードの強さや挙動は、
ロジックではなく **cards.json 側で定義される**。

---

## 2. カードデータ設計

### 2.1 cards.json の役割

cards.json は以下を満たす：

- 完全に宣言的
- 時代・カテゴリ・効果を明示
- ゲームロジックから独立

カード効果の解釈・実行は
すべて Effect Resolver に委譲される。

---

## 3. Effect DSL 設計思想

Effect は以下の3系統に分類される。

### 3.1 Acceleration（加速）
- draw
- addRice
- addKnowledge
- discount

### 3.2 Conversion（変換）
- addVictory（条件付き）

### 3.3 Interference / Compression（干渉・圧縮）
- trashFromHand
- trashSelf

※ 1カードに3系統同時使用は禁止（設計ルール）

---

## 4. condition の位置づけ

condition は、
**カードの強さを制御するための主要メカニクス**である。

- プレイ順
- カテゴリ参照
- カード枚数参照
- ステート参照

などを明示的に記述可能とする。

---

## 5. discount の運用ルール

- discount は必ずターン限定
- 重ね掛けは可能だが、
  無限購入が起きないよう cards.json 側で制御する

---

## 6. trashFromHand の設計意図

- 戦国デッキの中核メカニクス
- 古代・江戸では補助的に使用
- UI / CPU は「価値の低いカードを捨てる」前提で実装

---

## 7. Effect Resolver の責務

- cards.json を正として解釈
- ロジック側で強弱判断をしない
- UI / CPU に必要な最小限の情報のみ返却

---

## 8. 設計上の前提

- ゲームバランスはデータで調整する
- ロジックは安定・単純・再利用可能であること
- 拡張（世界史）を前提とした設計を維持する
