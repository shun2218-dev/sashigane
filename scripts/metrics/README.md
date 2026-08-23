# scripts/metrics

## 設計検証（docs/verification.md の根拠）

**スケールの正は `packages/tokens` にある。** ここのスクリプトは import する側であり、
値をリテラルで持たない（理由は `docs/agent-failures.md` の記録を参照）。

| ファイル | 役割 |
|---|---|
| `observed.mjs` | 既存4プロジェクトから実値を抽出する |
| `generate-scales.mjs` | スケールを表示する。**人が目で見るためのもので、検査ではない** |
| `verify-coverage.mjs` | 実測値に対するスケールのカバー率を計算する |

```bash
pnpm scales            # スケールを表示する
pnpm verify:coverage   # 実需要に対するカバー率を出す
```

**不変条件の検査は `packages/tokens/test/scales.test.ts` が担当する（`pnpm test`）。**
`docs/decisions.md` に記載した値との一致もそこで検証している。

スケールの規則を変更したら `pnpm verify:coverage` を再実行し、
`docs/verification.md` の数値を更新すること。**これは CI では動かない**（下記）。

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
