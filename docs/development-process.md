# 開発プロセス

人間・AI エージェント共通。**速度を理由に飛ばさない。**

## 作業を始める前に

```bash
pnpm install
```

`prepare` が `core.hooksPath` を `.githooks` に向ける。
**これを実行するまで pre-push フックは有効にならない。**
`core.hooksPath` は `.git/config` に保存され追跡対象外のため、clone しただけでは存在しない。

## 手順

1. **Issue を立てる**
2. **`develop` から作業ブランチを切る**（ブランチ構成は [branching.md](./branching.md)）
3. 実装する
4. **`develop` へ PR を出す**
5. **Strict Lead Engineer として自己レビューし、結果を `gh pr review` で PR に投稿する**
6. 指摘を修正し、対応をコメントで記録する

**チャット内だけのレビューはレビューとみなさない。** 後から誰も検証できないため。

リリースするときだけ `develop` → `main` の PR を出す。

## 詰まったとき

**同じ問題を3イテレーション修正して直らない場合、続行せず人間に判断を仰ぐ。**

## コミット

**日本語の Conventional Commits。**

```
feat(tokens): スケール生成器と不変条件テストを実装する

（何をしたかではなく、なぜそうしたかを書く）

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
```

作業ブランチ名の `<type>` もコミットの型に合わせる（`feat` / `fix` / `docs` / `chore` / `experiment`）。
これは検査していない。破っても実害が出ないため。

## UI コンポーネントを触るとき

Storybook のストーリー3状態（**通常 / 空 / エッジケース**）を必ず添える。
**ストーリーがない時点で自己レビュー不合格。**

## 検査

```bash
pnpm test                     # スケールの不変条件（decisions.md との一致を含む）
pnpm typecheck
pnpm check:tokens-isolation   # packages/tokens が単体で成立していること（原則4）
pnpm check:docs-scales        # decisions.md の数値表が生成器と一致すること
pnpm check:no-build-output    # 生成物がコミットされていないこと（原則1）

pnpm build:tokens             # dist/ に4形式を出力する（生成物はコミットしない）
pnpm check:tokens-standalone  # tokens.css が単体で成立すること（原則4）
pnpm check:scss               # tokens.scss が SCSS としてコンパイルできること
pnpm check:tailwind-adapter   # アダプタが期待どおりのユーティリティを出すこと
pnpm check:token-usage        # プリミティブ参照と Tailwind 任意値記法を禁止する（原則3）
```

`check:tokens-standalone` `check:tailwind-adapter` `check:token-usage` は `dist/` を読むので、
先に `pnpm build:tokens` が要る。CI はその順で走らせている。

`check:token-usage` は実行のたびに、まず意図的な違反を含むフィクスチャへ検出器を当てる。
**発火しなければ検査自体が落ちる。** 0 件という結果を、検査が壊れている状態と
区別できるようにするため（教訓2）。

CI はこれら全部と、`main` への PR が `develop` からのみであることを検査する。

```bash
pnpm scales                   # スケールを表示する（人が目で見るもの。検査ではない）
pnpm verify:coverage          # 実需要に対するカバー率
```

`verify:coverage` は観測対象4本のローカル clone を前提とするため **CI では動かない。**
スケールを変更したら手元で実行し、[verification.md](./verification.md) の数値を更新する。

## 計測

`scripts/metrics/` に集計スクリプトを置き、PR メタデータから収集する。**（未実装）**

- Issue 作成からマージまでのリードタイム
- PR あたりの自己レビューイテレーション回数
- **エージェントの初回コミットが CI を通った割合**（最重要指標）
- CI 失敗の原因分類（型 / テスト / lint / トークン規約違反 / 視覚回帰）
- 人間が介入した回数と理由
