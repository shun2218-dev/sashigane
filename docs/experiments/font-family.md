# 実験: 書体トークンの差し込み口と Tailwind の名前空間

実施日: 2026-08-24
対象: `tailwindcss@4.3.3` / Chromium（Claude Code の Browser ペイン）
関連: [decisions.md 決定1-11・2-7・3-3](../decisions.md) / [Issue #30](https://github.com/shun2218-dev/sashigane/issues/30)

## なぜ実験したか

`font-family` は `root` から導出できない唯一の**値の次元**である（時間は独自アンカーを持つが、
書体は「アンカーを決める」ことすらできない。書体名はブランドの選択であってシステムの選択ではない）。

そこで「構造だけをトークンが持ち、書体名は利用側が差す」形を採った。

```css
--sg-font-stack-body: var(--sg-font-brand-body-latin, ui-sans-serif),
                      var(--sg-font-brand-body-cjk, system-ui),
                      sans-serif;
```

ここで確かめる必要があったのは3点。**どれも訓練データの記憶では危うい。**

1. Tailwind v4 は `--text-*` にサイズ・行高と同じ形で書体を束ねられるか
2. `tabular-nums` を書体と対にして出せるか
3. **差し込み口はどこに書けば効くのか**

---

## 実験1: `--text-*` に書体を束ねられるか

```css
@theme inline {
  --text-body: var(--sg-text-body);
  --text-body--line-height: var(--sg-text-body-leading);
  --text-body--font-family: var(--sg-text-body-family);
}
```

**結果: `--font-family` 修飾子は無視された。** エラーも警告も出ない。

```css
.text-body { font-size: var(--sg-text-body); line-height: var(--tw-leading, var(--sg-text-body-leading)); }
```

行高は束ねられるが書体は束ねられない。**書体は `--font-*` 名前空間から出すしかない。**

## 実験2: `--font-*` のリセットと写像

```css
@theme inline {
  --font-*: initial;
  --font-numeric: var(--sg-text-numeric-family);
  --font-numeric--font-variant-numeric: tabular-nums;   /* ← 効くか？ */
  --font-numeric--font-feature-settings: "tnum";        /* ← 効くか？ */
}
```

**結果:**

| 事実 | 結果 |
|---|---|
| `--font-*: initial` | `font-sans` / `font-mono` / `font-serif` が消える。**書かないと残る** |
| `--font-{名前}` の写像 | `.font-numeric { font-family: … }` が出る |
| `--font-*--font-variant-numeric` | **無視される**（出力に現れない） |
| `--font-*--font-feature-settings` | 出る。`var(--sg-*)` を渡しても解決する |

`font-variant-numeric` 修飾子が無いため、**Tailwind 経由では `font-feature-settings: "tnum"` でしか
書体と等幅数字を束ねられない。** 同じ事実に2つの符号化を持つのはこのためである
（`--sg-font-variant-tabular` と `--sg-font-feature-tabular`）。

## 実験3: preflight の既定書体

`--font-*: initial` は `--default-font-family` の定義も消す。すると preflight の `html` 規則が
Tailwind の**素のスタックへ戻る。** 本文だけがトークンの外側に残るが、
**エラーにはならず、見た目もそれらしいので気づけない。**

```css
/* リセットだけ書いた場合 */
html { font-family: var(--default-font-family, -apple-system, BlinkMacSystemFont, …); }
```

`--default-font-family` と `--default-mono-font-family` を我々のセマンティックへ差し替えると解決した。
アダプタはこの2つも写像している。

---

## 実験4: 差し込み口はどこに書けば効くのか — **設計の穴が出た**

最初、検査用フィクスチャ（`apps/docs/public/standalone.html`）で
**部分木**に差して見出しだけ書体を変えるつもりだった。

```css
.branded { --sg-font-brand-display-latin: Georgia; }
```

**結果: 効かなかった。**

```
.branded h1 の font-family → ui-sans-serif, system-ui, sans-serif
```

理由は CSS 変数の置換が起きる場所である。`--sg-font-stack-display` の `var()` は
**その変数が宣言された要素（`:root`）で解決される。** 子孫が受け取るのは置換済みの値なので、
部分木で口を定義しても届かない。

`:root` に差すと期待どおり動いた。

| 差した口 | 見出し（display） | 本文（body） | 数値（mono） |
|---|---|---|---|
| なし | `ui-sans-serif, system-ui, sans-serif` | 同左 | `ui-monospace, monospace, monospace` |
| `--sg-font-brand-display-latin: Georgia` | **`Georgia, system-ui, sans-serif`** | 変わらず | 変わらず |
| `--sg-font-brand-body-latin: Georgia` | **`Georgia, …`**（body から継ぐ） | `Georgia, …` | 変わらず |

**「本文だけ差せば見出しも継ぐ」という規則が実際に働くことも、ここで確認した。**

### 何を学んだか

**差し込み口は `:root`（または `html`）に書くもので、部分木のスコープでは使えない。**
next/font が書体ごとに CSS 変数を出す使い方（`html` に class を当てる）とは合う。
部分木ごとに書体を変えたい場合、利用側は `--sg-text-*-family` そのものを
その要素で宣言し直すことになる。

これはトークン層の実装で塞げる種類の制約ではない。CSS 変数の置換の仕様そのものである。
**フィクスチャと決定1-11 に、効く形で書いた。**
