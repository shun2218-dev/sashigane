# ブランチ戦略とリリース

## ブランチ

| ブランチ | 役割 | 保護 |
|---|---|---|
| `main` | **リリース線。** ここにあるものが公開される | あり |
| `develop` | **統合線。** 既定ブランチ。作業ブランチはここから切る | あり |
| `<type>/<slug>` | 作業ブランチ。`develop` から切り `develop` へ PR | なし |

作業ブランチの `<type>` は Conventional Commits の型に合わせる
（`feat` / `fix` / `docs` / `chore` / `experiment` など）。

## 手順

```
Issue を立てる
  ↓
develop から作業ブランチを切る
  ↓
実装する
  ↓
develop へ PR を出す
  ↓
Strict Lead Engineer として自己レビューし、gh pr review で PR に投稿する
  ↓
指摘を修正し、対応をコメントで記録する
  ↓
develop へマージ
```

**リリースするときだけ `develop` → `main` の PR を出す。**

作業ブランチから直接 `main` へ PR を出すことは CI が拒否する。
branch protection は「PR を経由すること」しか要求せず head を制約しないため、
`branch-flow` ジョブで塞いでいる。

## 保護は二層ある

### 1. pre-push フック（手元）

`.githooks/pre-push` が `main` と `develop` への直接 push を拒否する。
`pnpm install` の `prepare` が `core.hooksPath` を設定するまで有効にならない。

**これは手元だけの防御である。** clone した別環境や GitHub の Web UI からの操作は止められない。

### 2. GitHub の branch protection（サーバ）

`main` と `develop` の両方に設定してある。

| 項目 | 設定 |
|---|---|
| PR 経由の変更のみ | 必須 |
| 必要な承認数 | 0（開発者が1人のため。自分の PR は承認できない） |
| 必要なステータスチェック | `verify`（CI）。`main` は `branch-flow` も |
| 管理者にも適用 | **する**（`enforce_admins: true`） |
| force push / 削除 | 禁止 |

**管理者にも適用している。** リポジトリ所有者であっても直接 push できない。
このプロジェクトは「規則は文書ではなく機械で強制する」という方針を取っており
（[agent-failures.md](./agent-failures.md) の教訓3）、所有者を例外にすると
その方針が成立しないため。

承認数を 0 にしているのは、GitHub が自分の PR への承認を許さないためである。
**PR を経由すること自体は強制されている。**

## 迂回する必要がある場合

手元のフックだけなら次で迂回できる。

```bash
SASHIGANE_ALLOW_PROTECTED_PUSH=1 git push
```

ただし**サーバ側の保護は迂回できない。**
どうしても必要な場合は branch protection を一時的に外すことになるが、
それは意図的な操作であり、**理由を [agent-failures.md](./agent-failures.md) に記録する。**

## バージョン管理

**決定4-6 で決めた**（[decisions.md](./decisions.md)、
[Issue #93](https://github.com/shun2218-dev/sashigane/issues/93)）。

| | |
|---|---|
| タグ形式 | `v0.1.0`。**リポジトリに1本**。パッケージごとには打たない |
| 揃えるか独立させるか | **揃える。** 依存解決の主体がいないので、組み合わせを作らせない |
| バージョンが指すもの | **配信スナップショットの識別子** |
| 出所 | `packages/tokens/package.json` の `version` **だけ**。原則4 によりトークン層の中に置く |
| 破壊的変更 | **セマンティックまたは差し込み口の名前が消えるか、意味が変わること。** 契約は名前表（`tokens.layers.json`） |

生成物のヘッダにバージョンが入り、規則の在り処はリリース済みならタグに固定される。

### タグはまだ打っていない

コンポーネントが1つも無く、レジストリ配信も未実装の状態で `v0.1.0` を切ると、
**配信していないものをリリースしたことになる。**
`version` は `0.0.0`（未リリース）のままで、**`main` へのリリースも行っていない。**

最初のタグを切る条件は、**レジストリ配信が動いていること**である。

## 経緯

このブランチ戦略は最初から存在したものではない。
エージェントが「main への直接 push は禁止」という指示をブランチ戦略の指定と誤読し、
単一トランクのまま4 PR 進めた。詳細は [agent-failures.md](./agent-failures.md) を参照。
