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

**日本語の Conventional Commits。** **決定番号や教訓番号は書かない**（決定6-8）。
読むのは開発者であって、番号の定義を毎回引きに行く人ではない。理由をそのまま書く。

```
feat(tokens): スケール生成器と不変条件テストを実装する

（何をしたかではなく、なぜそうしたかを書く）

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
```

作業ブランチ名の `<type>` もコミットの型に合わせる（`feat` / `fix` / `docs` / `chore` / `experiment`）。
これは検査していない。破っても実害が出ないため。

## UI コンポーネントを触るとき

**3状態の例を必ず添える。例がない時点で自己レビュー不合格**（決定6-4）。

```
packages/ui/src/<component>/examples/
  default.tsx   通常
  empty.tsx     空
  edge.tsx      エッジケース
```

**テストも一緒に添える**（`<component>.test.tsx`。決定6-6）。**実ブラウザで走る。**
props の写像だけでなく、**面の宣言が背景と前景を同時に変えること**まで測る——
jsdom では CSS が解決されないので、塗るだけの道が残っていても通ってしまう。

**この3つは必須。** 追加の例は自由に置いてよい。素の React コンポーネントとして書く。
ドキュメントサイトの描画・配信 JSON・型表は**すべてここから出す**（唯一の正）。
**`pnpm check:component-examples` が検査する**（教訓3）。

**道具名では書かない。** 要求は3状態が見られることであって、特定の道具ではない。

## ドキュメントサイトを動かす

```bash
pnpm --filter @sashigane/docs dev
```

**プレビュー用 CSS を見張りながら動く。** このファイルは Next.js のビルドの外に
あるので、見張らないと**コンポーネントを直しても画面が古いまま**になる。
エラーは出ず、未生成のクラスが黙って落ちるだけである（教訓4）。

## 検査

```bash
pnpm test                     # スケールの不変条件（decisions.md との一致を含む）と
                              # コンポーネント（実ブラウザ。決定6-6。build:tokens が先に要る）
pnpm typecheck
pnpm check:tokens-isolation   # packages/tokens が単体で成立していること（原則4）
pnpm check:docs-scales        # decisions.md の数値表が生成器と一致すること
pnpm check:no-build-output    # 生成物がコミットされていないこと（原則1）

pnpm build:tokens             # dist/ に出力する（生成物はコミットしない）
pnpm check:tokens-standalone  # tokens.css が単体で成立すること（原則4）
pnpm check:scss               # tokens.scss が SCSS としてコンパイルできること
pnpm check:tailwind-adapter   # アダプタが期待どおりのユーティリティを出すこと
pnpm check:token-usage        # プリミティブ参照と Tailwind 任意値記法を禁止する（原則3）
pnpm check:sample-page        # サンプルページが生成した変数だけで組まれていること（Issue #61）
pnpm check:token-values       # tokens.js の値が tokens.css とずれていないこと
pnpm check:docs-refs          # 文書が挙げている名前と参照が実在すること（Issue #91）と
                              # version を持つ package.json が1つだけであること（決定4-6）
pnpm check:token-types        # 生成した tokens.d.ts が型として成立すること
pnpm check:output-header      # 生成物が配布先で意味を成すこと（原則6、決定3-4）
pnpm check:component-examples # 3状態の例・展示ページ・テストが揃っていること（決定6-4・6-6）と
                              # 展示がトークンを受け取れること（決定6-12）と
                              # asChild が共有の Slot を通っていること（決定6-14）
                              # 部品が data-sg-component で名乗っていること（決定6-23）
pnpm check:public-language    # 利用者に届く文面に内部の参照が無いこと（決定6-8・6-11）。
                              # 生成物・サイトの画面に出る文・デモページの本文・README を見る。
                              # 決定番号・教訓番号・原則番号と、開発の段取り（Phase N）を落とす
pnpm check:docs-search        # 検索が実際に引けること（決定6-13）。
                              # apps/docs のビルドが先に要る
pnpm check:docs-llms          # AI が読む形とページの絵が出ていること（決定6-24）。
                              # apps/docs のビルドが先に要る
pnpm docs:data                # 例・ソース・型表を生成する（決定6-4。typecheck より前に要る）
pnpm check:component-classes  # コンポーネントが書いたクラスを生成 CSS の側から見る（決定6-2）と
                              # 書いたのに生成されないクラスが無いこと（決定6-3）と
                              # 同名クラスが素の Tailwind と同じ値になること（決定6-5）
```

`check:tokens-standalone` `check:tailwind-adapter` `check:token-usage` `check:token-values`
`check:token-types` `check:output-header` `check:sample-page` `check:docs-refs`
`check:component-classes` `check:public-language` は `dist/` を読むので、
先に `pnpm build:tokens` が要る。
CI はその順で走らせている。

**`check:token-usage` と `check:component-classes` は同じ原則3 を別の側から見る。**
前者はソースの `class=` の位置から読み、後者は Tailwind に走査させて出力を読む。
前者は**間接（cva・オブジェクト引き・定数）を1段挟むと見えない**ので、
コンポーネントを守っているのは後者である（決定6-2）。
規則は `scripts/lib/class-rules.mjs` に1つだけ置いて共有している。

`check:token-usage` `check:sample-page` `check:docs-refs` `check:component-classes`
`check:component-examples` `check:public-language` は実行のたびに、
まず意図的な違反を含むフィクスチャへ検出器を当てる。
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

```bash
pnpm metrics
```

GitHub API だけを出典に集計する。**値はファイルに残さない**（API が履歴そのもの）。
`gh` とネットワークが要るので **CI では動かさない。**

- Issue 作成からマージまでのリードタイム
- PR あたりの自己レビューイテレーション回数
- **エージェントの初回コミットが CI を通った割合**（最重要指標）
- CI 失敗の原因分類 — **`ci.yml` の step 名をそのまま使う。** 分類表を別に持つとずれる
- 人間が介入した回数。**理由は取れない**（`Co-Authored-By: Claude` の有無しか機械では見えない）

**「落ちた」と「動かなかった」を混ぜない。** run が作られない、`queued` のまま固まる、
CI がまだ無かった——どれも失敗ではない。独立した区分として出し、**割合の母数から外す。**

**「CI 失敗 0 件」を成功として出さない**（教訓2）。履歴の落ちた run に分類器を当て、
**発火することを確かめてから**0 件と言う。

#### 最重要指標が測っていないこと

「初回コミットが CI を通った割合」が測っているのは、
**エージェントが push 前に検査を走らせているか**である。

CI が走らせるのは手元と同じ検査（`pnpm test` / `typecheck` / `check:*`）なので、
**全部緑にしてから push すれば通るのは半ば同語反復**である。
**「正しいコードを書けるか」は測っていない。**

それを測るには、**手元で検出できない失敗**を CI が持つ必要がある
（実ブラウザでの見え方、視覚回帰）。いまは持っていない。

**数の隣にこれを出す。** 出さないと、測れるもので測った数を答えとして扱うことになる（教訓2）。

#### 判定は script が下さない

自己レビューが 0 回の PR は**並べるだけ**にする。手順5 は「実装したら自己レビューする」
であり、**実装でない PR**（Issue を立てる、記録を紐づける）もある。
機械が持てない判断を持たせない。
