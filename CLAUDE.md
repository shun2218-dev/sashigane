# sashigane

デザインシステム。**トークンが唯一の正**であり、値は規則から生成する。

このリポジトリは AI 駆動開発の実践例を兼ねている。
**設計判断の根拠と、失敗の記録が成果物の一部である。**
動くコードだけを残して経緯を捨てると、このリポジトリの価値は半分になる。

**現在 Phase 1（トークン層）。** `packages/ui` `apps/docs` はまだ存在しない。

---

@docs/principles.md

@docs/development-process.md

@docs/branching.md

@docs/lessons.md

---

## 必要になったら読む（自動では読み込まれない）

| ファイル | 内容 |
|---|---|
| [docs/decisions.md](docs/decisions.md) | 設計決定の全文。生成規則・値・退けた案・改訂履歴 |
| [docs/agent-failures.md](docs/agent-failures.md) | 失敗の記録。`lessons.md` の各規則の由来 |
| [docs/roles.md](docs/roles.md) | 既存4本から観測したセマンティック役割 |
| [docs/verification.md](docs/verification.md) | 生成スケールが実需要を覆えるかの検証 |
| [docs/experiments/](docs/experiments) | 仕様を推測せず動かして確かめた記録 |

**`decisions.md` を読まずにトークンの値や規則を変更しない。**
