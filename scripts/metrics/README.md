# scripts/metrics

## 設計検証（docs/verification.md の根拠）

| ファイル | 役割 |
|---|---|
| `scales.mjs` | **スケールの単一の正。** 生成規則と、それが期待値を生成することの自己検査 |
| `observed.mjs` | 既存4プロジェクトから実値を抽出する |
| `generate-scales.mjs` | スケールを表示する（`scales.mjs` の整形出力） |
| `verify-coverage.mjs` | 実測値に対するスケールのカバー率を計算する |

```bash
pnpm scales            # スケールを表示し、不変条件を検査する
pnpm verify:coverage   # 実需要に対するカバー率を出す
```

`scales.mjs` は import された時点で不変条件を検査し、
規則が `docs/decisions.md` の値を生成しない場合は例外を投げる。
**したがってスクリプトが正常終了すること自体が検査の合格を意味する。**

検査している不変条件:

- `spacing` / `radius` / `duration` が期待どおりの値の並びになること
- `font-size` の隣接比がアンカーを境に厳密に 1.125 / 1.25 であること
- `radius` が減算について閉じていること（`内側 = 外側 − padding` が成立する）
- `spacing` の隣接比が 3/2 と 4/3 を交互に取ること
- `line-height` が全段で単調減少すること

スケールの規則を変更したら `pnpm verify:coverage` を再実行し、
`docs/verification.md` の数値を更新すること。

**他のスクリプトはスケールをリテラルで持たない。** 必ず `scales.mjs` から import する。
（理由は `docs/agent-failures.md` の 2026-08-23 の記録を参照）

### 前提

`observed.mjs` は `~/ghq/github.com/shun2218-dev/` 配下に
ichirizuka / pylabo / holosphere / pdf-merge-app が存在することを前提としている。
**CI では動かない。** 見つからない場合は該当パスを報告して終了する。

## 開発プロセスの計測（Phase 1 で実装）

PR メタデータから以下を収集する。

- Issue 作成からマージまでのリードタイム
- PR あたりの自己レビューイテレーション回数
- **エージェントの初回コミットが CI を通った割合**（最重要指標）
- CI 失敗の原因分類（型 / テスト / lint / トークン規約違反 / 視覚回帰）
- 人間が介入した回数と理由
