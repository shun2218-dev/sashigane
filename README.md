# sashigane

トークンを唯一の正とするデザインシステム。値は規則から生成し、色は OKLCH で作る。
配布は npm ではなく **shadcn レジストリ方式**で、利用側リポジトリにコードを落とす。

> ## ⚠️ 開発中：まだインストールできません
>
> 現在 **Phase 1（トークン層）**。スケールの生成器とテストまでが動いており、
> CSS の出力・色システム・コンポーネントは未実装です。
> レジストリの配信も始まっていません。

---

## 何を解決するものか

複数のプロジェクトで同じ UI を書き直すのをやめるために作っている。

- **値を選ばない。** 唯一の根本定数は `root = 16px`。余白も文字サイズも行高も、そこから規則で導く
- **トークン層は React にも Tailwind にも依存しない。** 素の CSS でも SCSS でも使える
- **コンポーネントはセマンティックトークンしか参照できない。** lint で強制する

## 導入（予定）

3段階の深さで入れられるようにする。

| 深度 | 入るもの | 依存 |
|---|---|---|
| `@sashigane/tokens` | CSS 変数のみ | なし（React 不要） |
| `@sashigane/<component>` | コンポーネント単体 | React |
| `@sashigane/base` | 全部 | React |

**トークンだけを入れて動くこと**を要件にしている。
素の CSS で書かれたプロジェクトにも、SCSS のプロジェクトにも入る。

Tailwind を使う場合は、`--sg-*` を Tailwind の名前空間に写像するアダプタ CSS を追加で読む。
トークン層自体は Tailwind を知らない。

## 入っているもの

すべて `root = 16px` から導出される。

| | 規則 | 値 |
|---|---|---|
| spacing | `base = root ÷ 4`、`3/2` と `4/3` を交互に適用 | `0, 4, 8, 12, 16, 24, 32, 48, 64, 96` |
| font-size | アンカー `root`、下 `÷9/8` ×3、上 `×5/4` ×7 | `11.24 … 16 … 76.29`（11段） |
| line-height | `a + (root ÷ 2) / size`、`a` は display / ui / prose | サイズから自動で決まる |
| radius | spacing の 0〜16 の部分集合 | `0, 4, 8, 12, 16` + `full` |
| duration | 遷移 `200ms` / ループ `1000ms` アンカー、比率 `√2` | `100 … 400` / `707 … 1414` |
| border-width | px 固定 | `1, 2, 3` |
| elevation | 高さ `h` から影と明度差分を導出 | `h = 0〜3` |

### 色

**primary を1色選ぶと、パレット全体が生成されます。**

```ts
import { generatePalette, hexToOklch } from '@sashigane/tokens';

const palette = generatePalette(hexToOklch('#3b82f6'));
palette.warnings; // 再現できない色・見分けにくい組み合わせを教えます
```

生成されるもの: primary / 中間色 / status 4色 / 識別色 5色 の各11段。

**コントラストは構造的に保証されます。** 明色の面に対し段 500 が 4.5:1、
暗色の面に対し段 400 が 4.5:1 を、**どの色相を選んでも**満たします
（全360色相で検証済み）。暗色モードは色を反転せず、参照する段を変えるだけです。

CSS の出力とテーマビルダーは未実装。

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
