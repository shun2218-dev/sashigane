# sashigane

自分の開発を楽にするための、自分好みのデザインシステム。

トークンを単一の正とし、値は規則から生成する。色は OKLCH で生成し、
配布は npm パッケージではなく shadcn レジストリ方式で行う。

> **現在の状態: 設計確定（実装前）**
> スケールの基準・セマンティック役割・検証結果を [docs/](./docs) に確定させた段階。
> コードはまだ無い。

---

## 設計の要点

### 値は導出する。選ばない

唯一の根本定数は `root = 16px`。ここから spacing / typography を機械的に生成する。
`tokens.json` が持つ生の数字は最小限で、それ以外はすべて規則の出力である。

```
spacing.base = root ÷ 4 = 4px
type.base    = root     = 16px
line-height  = a + (root ÷ 2) / size
radius       = spacing スケールの 0〜16 の部分集合
```

時間（duration）だけは `root` から導けないため独自のアンカーを持つ。これは例外として明示している。

### 覆えるかを先に検証した

既存4プロジェクト（ichirizuka / pylabo / holosphere / pdf-merge-app）から
実値を全抽出し、生成スケールが実需要を表現できるかを機械的に照合した。

| 項目 | 結果 |
|---|---|
| spacing（4px 以上） | ✅ 33/34（97%）を ±20% 以内で覆う |
| radius | ✅ 完全に覆う。外れは全て過去の実装の自己矛盾 |
| duration（遷移） | ✅ 覆う |
| font-size | ⚠️ 上限不足 → 上方向を3段延長し ±8% カバー率 44% → **78%** |
| line-height | ⚠️ 単一式では 1.0 未満を生成できず、大型数値の詰めた行送りを表現できなかった → 漸近線を3系統に分割 |
| border-width | ⚠️ 未定義だった → 新規に定義 |
| ループアニメーション周期 | ⚠️ 遷移とは知覚上の制約が違う → 別スケールとして新規に定義 |

**検証によって設計を4箇所修正した。** 覆えなかった箇所と、それが
「役割の定義不足」なのか「過去の実装が不統一だっただけ」なのかの切り分けは
[docs/verification.md](./docs/verification.md) に全て残してある。

主な「不統一だっただけ」の例:

- `padding: 18px 20px` — 同一宣言内に 18 と 20 が混在。選ばれた値ではない
- pylabo は自前で radius トークンを定義しながら、別の場所で `5px` `10px` を直書きしていた
- ichirizuka の accent 色が、アクセント / リンク / フォーカスリング / 増加方向 / データ塗りの
  **5つの役割を1つの値で兼ねていた**（値の不統一ではなく、役割の定義が存在しなかった）

### 層を分ける。そして分離を機械的に証明する

```
プリミティブ   --sg-blue-500        生成物。全段用意してよい
セマンティック --sg-color-danger    実際に使う場所が1つ以上あるものだけ定義
```

コンポーネントはセマンティックしか参照できない。名前が数字で終わるか単語で終わるかで
層が判別できるため、lint は1つの正規表現で強制できる。

`packages/tokens` は React も `packages/ui` も import しない。これを CI で検査する。

- `packages/tokens/package.json` の `dependencies` が空であること
- 素の HTML に `tokens.css` だけを読み込み、CSS 変数が解決すること

**トークン層が単体で成立することが、この設計の証明になる。**

### 3段階の導入深度

| 導入深度 | 内容 |
|---|---|
| `@sashigane/tokens` | CSS 変数のみ。React 非依存 |
| `@sashigane/<component>` | コンポーネント単体 |
| `@sashigane/base` | 全部（`registry:base`） |

---

## ドキュメント

| ファイル | 内容 |
|---|---|
| [CLAUDE.md](./CLAUDE.md) | エージェント向けの規則。**作業前に必ず読む** |
| [docs/decisions.md](./docs/decisions.md) | 設計決定。生成規則・値・退けた案・改訂履歴 |
| [docs/roles.md](./docs/roles.md) | 既存4本から観測したセマンティック役割 |
| [docs/verification.md](./docs/verification.md) | 生成スケールが実需要を覆えるかの検証 |
| [docs/agent-failures.md](./docs/agent-failures.md) | ガードレール追加の理由 |
| [docs/experiments/](./docs/experiments) | 仕様を推測せず実際に動かして確かめた記録 |

---

## 進め方

| Phase | 内容 | 状態 |
|---|---|---|
| 0 | 設計確定 | ✅ |
| 1 | トークン層（生成スクリプト、lint、CI 検査） | 進行中 |
| 2 | **コンポーネントを1つも書かずに ichirizuka へトークンのみ導入** | |
| 3 | コンポーネント3〜5個 | |
| 4 | `registry:base`、エージェント向け Skill | |

Phase 2 を Phase 3 より前に置いているのは、層分離をコンポーネント実装前に実証するため。
ここで必ず設計の穴が出る。

ichirizuka は `dependencies` が `next` / `react` / `react-dom` のみという規約を持つ。
**これを破らずに導入できることが要件**であり、そのままトークン層の React 非依存性の検定になる。

---

## セットアップ

```bash
pnpm install
```

`prepare` スクリプトが `core.hooksPath` を `.githooks` に向ける。
**これを実行するまで pre-push フックは有効にならない。**
`core.hooksPath` は `.git/config` に保存され追跡対象外のため、
clone しただけではフックが存在しないのと同じになる。

```bash
pnpm scales            # スケールを表示し、不変条件を検査する
pnpm verify:coverage   # 実需要に対するカバー率を出す（観測対象4本がローカルに必要）
```

---

## 開発プロセス

人間・AI エージェント共通。速度を理由に飛ばさない。

- Issue を立ててから branch を切る。main への直接 push は pre-push フックで防ぐ
- PR を出したら Strict Lead Engineer として自己レビューし、**結果を `gh pr review` で PR に投稿する**
- 同じ問題を3イテレーション修正して直らない場合は続行せず判断を仰ぐ
- UI コンポーネントの追加・変更にはストーリー3状態（通常 / 空 / エッジケース）を必ず添える
- コミットメッセージは日本語、Conventional Commits 形式

ガードレールを追加するときは、必ず [docs/agent-failures.md](./docs/agent-failures.md) に
理由を書いてから追加する。**ルールが先にあってはならない。**

---

## ライセンス

[MIT](./LICENSE)
