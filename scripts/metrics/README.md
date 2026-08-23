# scripts/metrics

## 設計検証（docs/verification.md の根拠）

| スクリプト | 役割 |
|---|---|
| `extract-observed-values.mjs` | 既存4プロジェクトから実値を抽出し、生成スケールの最近傍と比較する |
| `generate-scales.mjs` | decisions.md の規則からスケールを生成し、不変条件を検証する |
| `verify-coverage.mjs` | 実測値に対するスケールのカバー率を計算する |

スケールの規則を変更したら `generate-scales.mjs` → `verify-coverage.mjs` の順に再実行し、
`docs/verification.md` の数値を更新する。

**注意:** これらは実装前の設計検証用に書いた暫定スクリプトである。
Phase 1 で `packages/tokens` の生成器とテストに正式に組み込み、
生成器の出力と `docs/decisions.md` の記載値が一致することを CI で検証する
（理由は `docs/agent-failures.md` の 2026-08-23 の記録を参照）。

`extract-observed-values.mjs` は `~/ghq/github.com/shun2218-dev/` 配下に
ichirizuka / pylabo / holosphere / pdf-merge-app が存在することを前提にしている。

## 開発プロセスの計測（Phase 1 で実装）

PR メタデータから以下を収集する。

- Issue 作成からマージまでのリードタイム
- PR あたりの自己レビューイテレーション回数
- **エージェントの初回コミットが CI を通った割合**（最重要指標）
- CI 失敗の原因分類（型 / テスト / lint / トークン規約違反 / 視覚回帰）
- 人間が介入した回数と理由
