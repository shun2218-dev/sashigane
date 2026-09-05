# sashigane

トークンを唯一の正とするデザインシステム。値は規則から生成し、色は OKLCH で作る。
配布は npm ではなく **shadcn レジストリ方式**で、利用側リポジトリにコードを落とす。

> ## まだ 0.x です
>
> **入れて動きます。** コンポーネントは 25 個、レジストリ配信も動いています。
>
> **0.x のあいだは破壊的変更でマイナーを上げます。**
> 1.0 の条件は、コンポーネントの実需要が固まっていることです。

---

## 入れる

`components.json` に配信元を1度書きます。

```json
{
  "registries": {
    "@sashigane": "https://sashigane-docs.vercel.app/r/{name}.json"
  }
}
```

```bash
npx shadcn@latest add @sashigane/tokens      # CSS 変数だけ。React は要りません
npx shadcn@latest add @sashigane/button      # コンポーネント1つ
npx shadcn@latest add @sashigane/base        # 全部
```

**詳しい手順とコンポーネントの一覧は [ドキュメント](https://sashigane-docs.vercel.app) にあります。**

## 何を解決するものか

複数のプロジェクトで同じ UI を書き直すのをやめるために作っている。

- **値を選ばない。** 唯一の根本定数は `root = 16px`。余白も文字サイズも行高も、そこから規則で導く
- **トークン層は React にも Tailwind にも依存しない。** 素の CSS でも SCSS でも使える
- **コンポーネントはセマンティックトークンしか参照できない。** lint で強制する

## 3段階の深さ

深さを選んで入れられる。

| 深度 | 入るもの | 依存 |
|---|---|---|
| `@sashigane/tokens` | CSS 変数のみ | なし（React 不要） |
| `@sashigane/<component>` | コンポーネント単体 | React |
| `@sashigane/base` | 全部 | React |

**トークンだけを入れて動くこと**を要件にしている。
素の CSS で書かれたプロジェクトにも、SCSS のプロジェクトにも入る。

Tailwind を使う場合は、`--sg-*` を Tailwind の名前空間に写像するアダプタ CSS を追加で読む。
トークン層自体は Tailwind を知らない。

アダプタは Tailwind の名前空間を全部落としてから、こちらのものだけを写像する。
**アプリ固有の寸法（チャートの高さ、サイドバーの幅など）は利用側が足す。**

```css
@import "./tokens.css";   /* レジストリ方式なので相対パスで読む */
@import "./theme.css";

@theme {
  --container-sidebar: 16rem;   /* → w-sidebar */
  --spacing-chart: 21.25rem;    /* → h-chart */
}
```

幅は `--container-*` にも書けるが、**高さは `--spacing-*` しか読まない**（Tailwind v4 に
高さ専用の名前空間が無いため）。**高さのために開けた口は余白にも開く** — `--spacing-chart`
を足すと `p-chart` も書けるようになります。こちらのスケール自体は緩みません（`p-5` は不可）。

## 入っているもの

`root = 16px` から導出される。導出できない次元だけが例外を持つ
（時間は独自のアンカー、画面幅は機器の寸法、書体は値を持たず構造だけ）。

| | 規則 | 値 |
|---|---|---|
| spacing | `base = root ÷ 4`、`3/2` と `4/3` を交互に適用 | `0, 4, 8, 12, 16, 24, 32, 48, 64, 96` |
| font-size | アンカー `root`、下 `÷9/8` ×3、上 `×5/4` ×7 | `11.24 … 16 … 76.29`（11段） |
| line-height | `a + (root ÷ 2) / size`、`a` は display / ui / prose | サイズから自動で決まる |
| letter-spacing | `0.025 × (root ÷ size − 1)` em。大文字化は `0.08em` の加算項 | サイズから自動で決まる |
| font-weight | 役割で `400 / 500 / 600 / 700`。**書体に合わせて差し替えられる** | `base` `emphasis` `heading` `strong` |
| radius | spacing の 0〜16 の部分集合 | `0, 4, 8, 12, 16` + `full` |
| duration | 遷移 `200ms` / ループ `1000ms` アンカー、比率 `√2` | `100 … 400` / `707 … 1414` |
| border-width | px 固定 | `1, 2, 3` |
| elevation | オフセットとぼかしは高さ `h` に比例。濃さは面1段分として色から解く | `h = 0〜3` |
| breakpoint | **導出できない。** 画面幅は組版ではなく機器の寸法で決まる | `40, 48, 64, 80rem` |
| 密度 | 骨格の余白だけが動く。段は spacing スケールから取る | ページ / セクション / 面の3役割 |
| font-family | **値は持たない。**欧文 → 和文 → generic の順序だけを規定する | 書体名は利用側が `--sg-font-brand-*` へ差す |
| 不透明度 | **持たない。** 薄めると保証の外へ出るため。中間の値は色で解く | `0` と `1` だけ |

### 色

**primary を1色選ぶと、パレット全体が生成されます。**

```ts
import { generatePalette, hexToOklch } from '@sashigane/tokens';

const palette = generatePalette(hexToOklch('#3b82f6'));
palette.warnings; // 再現できない色・見分けにくい組み合わせを教えます
```

生成されるもの: primary / 中間色 / status 4色 / 識別色 5色 の各11段。

連続値（ヒートマップ、値→色）には **`--sg-color-sequential-1..10`** を使います。
離散系列とは別の役割で、面に近い側から遠い側へ並びます（暗色モードでは向きが逆）。
**帯の上に置く文字のコントラストは保証の外です。**

**コントラストは構造的に保証されます。** 文字は 4.5:1、線や点などのマークは 3:1 を、
**どの色相を選んでも、どの面の上でも**満たします（全360色相 × 両モード × 面3段で検証済み）。
暗色モードは色を反転せず、参照する段を変えるだけです。

余白のうち**骨格の3箇所**（ページの左右・セクション間・面の内側）は密度で動きます。
狭い画面では自動で1段詰まり、`data-sg-density` で固定もできます。

```html
<main data-sg-density="comfortable">…</main>
```

面は**塗るのではなく宣言します。**

```html
<body data-sg-surface="page">
  <article data-sg-surface="surface">…</article>
</body>
```

`data-sg-surface` は背景と前景を同時に決めます。面が深くなると、
**役割名はそのままで**文字とアクセントが1段深い段を指します。
`bg-surface` のようなユーティリティは用意していません。塗るだけだと前景が
ページ用のまま残り、コントラストが落ちても気づけないためです。

名乗れる面は `page` / `surface` / `inset` / `overlay` の4つです。
`overlay`（ポップオーバーやツールチップ）は**どこに置いても同じ段**になります。

hover も同じ考え方で、塗るのではなく宣言します。

```html
<article data-sg-surface="surface">
  <button data-sg-interactive>…</button>
</article>
```

`data-sg-interactive` を付けた要素は、hover 中だけ1段深い面の文脈になります。
背景と前景が一緒に動くので、hover しても保証は崩れません。

**不透明度で薄めることはできません。** どの役割も、薄めると 4.5:1 を割ります
（端点を要件ちょうどまで解いているため、余裕がゼロです）。
Tailwind のアルファ修飾子（`text-accent/50`、`bg-danger/15`）も同じ理由で塞いでいます。

```css
/* 塗りの状態変化は、塗りの段を1段ずらす（accent と状態色4つに `-strong` があります） */
.btn-primary:hover { background: var(--sg-color-accent-strong); }

/* 帯やバッジには淡い地があります。文字は塗りに対して解いてあります */
.note-danger { background: var(--sg-color-danger-subtle); color: var(--sg-color-on-danger-subtle); }
```

```html
<!-- 塗りを持たない要素は面の文脈で -->
<button data-sg-interactive>やめる</button>
```

浮きは**面の宣言とは別に指定します。** 影ありを既定にはしません
（観測した4本のうち1本は影を1つも使わず、罫線だけで階層を作っていました）。

```css
.card    { box-shadow: var(--sg-elevation-raised); }   /* カード */
.popover { box-shadow: var(--sg-elevation-overlay); }  /* 重なるもの */
.modal   { box-shadow: var(--sg-elevation-front); }    /* 前面 */
```

**暗色モードでは同じ1行が影ではなく輪郭を出します。** 暗い面の上では、
影の色を純黒・不透明にしても 1.08:1〜1.73:1 にしかならず、影という手段が成立しないためです
（明色は 10.91:1〜19.27:1）。段は面の深さに合わせて動きます。


## 開発

```bash
pnpm install
pnpm test
```

手順とブランチ戦略は [docs/development-process.md](./docs/development-process.md) と
[docs/branching.md](./docs/branching.md)。

## ドキュメント

| ファイル | 内容 |
|---|---|
| [docs/principles.md](./docs/principles.md) | 動かせない設計原則 |
| [docs/decisions.md](./docs/decisions.md) | 設計決定の全文。生成規則・値・退けた案・改訂履歴 |
| [docs/verification.md](./docs/verification.md) | 生成スケールが実需要を覆えるかの検証 |
| [docs/roles.md](./docs/roles.md) | 既存プロジェクトから観測したセマンティック役割 |
| [docs/lessons.md](./docs/lessons.md) | 開発中に得た教訓 |
| [docs/agent-failures.md](./docs/agent-failures.md) | 失敗の記録。教訓の由来 |
| [docs/experiments/](./docs/experiments) | 仕様を推測せず動かして確かめた記録 |

このリポジトリは AI 駆動開発の実践例を兼ねている。
**設計判断の根拠と失敗の記録を残すことを成果物の一部**として扱っており、
上記のうち後半4つはそのための文書。

## ライセンス

[MIT](./LICENSE)
