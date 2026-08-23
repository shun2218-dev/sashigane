# 実験: Tailwind v4 の動的 spacing とアダプタ方式

実施日: 2026-08-23
対象: `tailwindcss@4.3.3` / `@tailwindcss/cli@4.3.3`
関連: [decisions.md 決定3-1・3-2](../decisions.md) / [Issue #3](https://github.com/shun2218-dev/sashigane/issues/3)

## なぜ実験したか

決定1-2 で spacing スケールから `20px` `40px` を除外し、決定2-3 で lint による強制を決めた。
しかし Tailwind v4 の spacing ユーティリティは `--spacing` の乗算で**動的生成**されるため、
`p-5`(20px) が自動的に有効になる可能性があった。

対処候補（`--spacing: initial` / クラス名を検査する lint）は**どちらも公式ドキュメントに明記が無い。**
訓練データの記憶で設計せず、実際に動かして確認した。

## 再現手順

```bash
mkdir tw4 && cd tw4
npm init -y && npm i -D tailwindcss@4.3.3 @tailwindcss/cli@4.3.3
# 下記の入力ファイルを置いて
npx tailwindcss -i <input>.css -o out.css
```

v4 CLI に `--content` フラグは無い。`@source` で走査対象を指定する。
（同じディレクトリの他のファイルも自動走査される点に注意。実験中これに引っかかった）

---

## 実験1: `--spacing` を定義すると動的生成が起きるか

```css
@import "tailwindcss";
@source "./content.html";
@theme { --spacing: 4px; }
```

```html
<div class="p-0 p-1 p-2 p-3 p-4 p-5 p-6 p-7 p-8 p-12 p-24"></div>
```

**結果: すべて生成された。**

```css
.p-5 { padding: calc(var(--spacing) * 5); }
.p-7 { padding: calc(var(--spacing) * 7); }
```

→ **懸念は実在した。** スケールから除外した値が Tailwind 経由で書ける。

---

## 実験2: `--spacing: initial` で止まるか

```css
@theme { --spacing: initial; }
```

**結果: spacing ユーティリティが一つも生成されなくなった。** `p-0` すら出ない。

---

## 実験3: 名前付きの段だけを生成できるか

```css
@theme {
  --spacing: initial;
  --spacing-0: 0px;
  --spacing-1: 0.25rem;
  --spacing-2: 0.5rem;
  --spacing-3: 0.75rem;
  --spacing-4: 1rem;
  --spacing-6: 1.5rem;
  --spacing-8: 2rem;
  --spacing-12: 3rem;
  --spacing-24: 6rem;
}
```

**結果: 定義した段だけが生成された。**

```
生成: p-0 p-1 p-2 p-3 p-4 p-6 p-8 p-12 p-24
```

```css
.p-4 { padding: var(--spacing-4); }
```

`p-5` `p-7` は HTML に書いてあるが**生成されない**。

→ **これで構造による強制が成立する。**

---

## 実験4: `--spacing-*: initial` という書き方

```css
@theme {
  --spacing-*: initial;
  --spacing-4: 1rem;
}
```

**結果: `p-4` のみ生成。** 実験2〜3 と等価に機能する。

ワイルドカードは `--spacing` 自体も含めてリセットする。
どちらでもよいが、`--spacing: initial` の方が
「動的乗算を止める」という意図が読み取りやすいため採用する。

---

## 任意値記法は塞げない

```html
<div class="p-4 p-[20px] p-[1.25rem] gap-[7px]"></div>
```

```css
.p-4 { padding: var(--spacing-4); }
.p-\[1\.25rem\] { padding: 1.25rem; }
.p-\[20px\] { padding: 20px; }
.gap-\[7px\] { gap: 7px; }
```

**任意値は生成される。構造では塞げない。**

ただし検査対象が「任意値記法だけ」に狭まったため、
lint ルールは `[...]` 記法の禁止という単純な形で済む。
スケール外の数値クラスを列挙して弾く必要はない。

> **補足（記録）**
> 最初この結果を「任意値も生成されない」と読み違えた。
> 出力を拾う grep が `.p-\[20px\]` のバックスラッシュにマッチしていなかったためで、
> Tailwind の挙動ではなく検証手順の誤りだった。生の出力を直接見て訂正した。

---

## 実験5: `@theme inline` アダプタが機能するか

トークン層が出力する側（Tailwind を一切知らない）:

```css
/* tokens.css */
:root {
  --sg-color-bg-danger: oklch(0.55 0.2 25);
  --sg-space-4: 1rem;
  --sg-radius-2: 0.5rem;
  --sg-font-size-3: 1rem;
  --sg-line-height-3: 1.5;
}
```

Tailwind 用アダプタ:

```css
@import "tailwindcss";
@import "./tokens.css";
@theme inline {
  --spacing: initial;
  --color-*: initial;
  --color-danger: var(--sg-color-bg-danger);
  --spacing-4:   var(--sg-space-4);
  --radius-md:   var(--sg-radius-2);
  --text-body:   var(--sg-font-size-3);
  --leading-body: var(--sg-line-height-3);
}
```

**結果: すべて生成された。**

```css
.bg-danger    { background-color: var(--sg-color-bg-danger); }
.border-danger{ border-color: var(--sg-color-bg-danger); }
.text-danger  { color: var(--sg-color-bg-danger); }
.p-4          { padding: var(--sg-space-4); }
.rounded-md   { border-radius: var(--sg-radius-2); }
.text-body    { font-size: var(--sg-font-size-3); }
.leading-body { --tw-leading: var(--sg-line-height-3); line-height: var(--sg-line-height-3); }
```

**別ファイルで定義した `--sg-*` を `@import` した上で写像できる。**
トークン層は Tailwind の名前空間を一切知らないまま成立する。

---

## 実験6: `inline` の有無で何が変わるか

| | ユーティリティが参照するもの |
|---|---|
| `@theme inline` | `var(--sg-color-bg-danger)` — **`--sg-*` を直接参照** |
| `@theme`（inline なし） | `var(--color-danger)` — Tailwind の変数を経由（2段） |

どちらの場合も Tailwind は `:root` に `--color-danger: var(--sg-color-bg-danger)` を出力する。
違うのは**ユーティリティ側がどちらを見るか**だけ。

### 不透明度修飾子はどちらでも機能する

```css
/* inline あり */
.bg-danger\/15 {
  background-color: var(--sg-color-bg-danger);
  @supports (color: color-mix(in lab, red, red)) {
    background-color: color-mix(in oklab, var(--sg-color-bg-danger) 15%, transparent);
  }
}
```

roles.md で観測した「status の淡い背景（元色の 12〜15%）」は、
アダプタ経由でそのまま表現できる。

### `inline` を採る理由

**`--sg-*` を唯一のスイッチ点にするため。**

inline なしだと、利用側が Tailwind 側の `--color-danger` を上書きしても効いてしまう。
テーマ切り替えの入口が2つになり、「トークンが唯一の正」が崩れる。

---

## 追加実験（自己レビュー中に実施）

### 7. リセットを書かないと素の Tailwind の値が残るか

アダプタの写像だけを書き、名前空間のリセットを書かない場合:

```
生成: .bg-red-500 .rounded-2xl .shadow-lg .leading-tight .text-body
```

**残る。** `bg-red-500` が書けてしまう時点で「トークンが唯一の正」は成立しない。
→ アダプタは所有する名前空間をすべて `initial` でリセットする必要がある（決定3-3）。

### 8. サイズと行高のペアを構造的に強制できるか

```css
@theme inline {
  --text-body: var(--sg-font-size-3);
  --text-body--line-height: var(--sg-line-height-3);
}
```
```css
.text-body {
  font-size: var(--sg-font-size-3);
  line-height: var(--tw-leading, var(--sg-line-height-3));
}
```

ペアで出力されるが `var(--tw-leading, …)` はフォールバック構造なので、
このままでは `leading-*` で上書きできる。

| リセット | 生成されるユーティリティ |
|---|---|
| なし | `.text-body .leading-tight .leading-7` |
| `--leading-*: initial` のみ | `.text-body .leading-7` ← 動的生成が残る |
| `--leading-*` + `--spacing: initial` | `.text-body` ← **上書き手段が消滅** |

`leading-tight` は名前付き、`leading-7` は `--spacing` 由来の動的生成なので、両方を止める必要がある。

**陰性対照:** `--leading-*: initial` を外すと `leading-tight` が復活することを確認した。
（教訓2「ゼロ件の結果には、該当ケースを1件作って検査の発火を確かめる」の実践）

→ **決定1-4「行高のオーバーライド不可」が、lint ではなく構造として Tailwind 上でも成立する。**

### 9. 素の Tailwind v4.3.3 の既定値（写像先の確認）

```
radius: xs=2 sm=4 md=6 lg=8 xl=12 2xl=16 3xl=24 4xl=32   (px)
text:   xs=12 sm=14 base=16 lg=18 xl=20 2xl=24 3xl=30     (px)
```

我々の radius `0/4/8/12/16` は `none/sm/lg/xl/2xl` と**値まで一致する。**
我々の font-size は `base`(16) と `xl`(20) しか一致しない。

→ 名前空間ごとに写像方針を変える必要がある（決定3-3）。

---

## 結論

| 問い | 答え |
|---|---|
| 動的 spacing は問題を起こすか | **起こす。** `p-5` `p-7` が自動生成される |
| `--spacing: initial` で止まるか | **止まる。** 一つも生成されなくなる |
| 名前付きで段を制限できるか | **できる。** 定義した段だけが生成される |
| `--spacing-*: initial` は有効か | **有効。** 等価に機能する |
| アダプタ方式は成立するか | **する。** `--sg-*` を `@theme inline` に写像できる |
| `--sg-*` の差し替えに追随するか | **する。** ユーティリティが `var(--sg-*)` を直接参照する |
| 抜け道は残るか | **残る。** 任意値記法 `p-[20px]` は生成される → lint で塞ぐ |
| リセットは要るか | **要る。** 書かないと素の Tailwind の値が残る |
| 行高のペアを強制できるか | **できる。** `--leading-*` と `--spacing` の両方を initial にする |

決定は [decisions.md 決定3-1・3-2](../decisions.md) に反映した。

## この実験を fixture として残さなかった理由

Tailwind への依存を `packages/tokens` に持ち込まないため、実験用プロジェクトはリポジトリに含めていない。
上記の入力ファイルは全文を掲載しているので、再現手順のとおりに実行すれば同じ結果が得られる。

Phase 1 でアダプタ生成を実装する際、`apps/docs` 側に**回帰テストとして**組み込む。
そのとき検証するのは「生成したアダプタが期待するユーティリティを出すこと」であり、
本実験の目的（Tailwind の仕様の確認）とは別である。
