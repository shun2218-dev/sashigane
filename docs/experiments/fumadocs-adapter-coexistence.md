# 実験: ドキュメントサイトと Tailwind アダプタは同居できるか

実施日: 2026-08-30
関連: [decisions.md 決定6-4](../decisions.md) / [Issue #101](https://github.com/shun2218-dev/sashigane/issues/101) /
[Issue #102](https://github.com/shun2218-dev/sashigane/issues/102)

## なぜ実験したか

決定6-4 は Fumadocs を採る決め手を**「サイト自体を sashigane のトークンで組める」**と書いた。
**測っていなかった。**

`theme.css` は `--*: initial` で Tailwind の名前空間を全部落としてから、
我々の写像だけを載せる（決定3-1・3-3）。
**これを他人のビルドに持ち込んだらどうなるかを、誰も確かめていない。**

## 方法

`fumadocs-ui` を導入し、その `css/style.css` を入口にして Tailwind をビルドする。
そこへ我々の生成物を重ねて、通るか・何が変わるかを見る。

```
@import 'fumadocs-ui/css/style.css';
@import '<repo>/packages/tokens/dist/tokens.css';   ← CSS 変数
@import '<repo>/packages/tokens/dist/theme.css';    ← Tailwind アダプタ
```

## 結果1: アダプタを重ねるとビルドが落ちる

```
Error: Cannot apply unknown utility class `sm:ps-7`
```

出どころは `fumadocs-ui/css/lib/base.css:246`。

```css
@apply ps-6 ms-2 border-s sm:ms-4 sm:ps-7;
```

**`--*: initial` が spacing を落とすので、`@apply` が解決できない。**
警告ではなく**ビルドの失敗**である。

**決定6-4 の決め手は成立しない。** サイトの chrome をアダプタで組むことはできない。

## 結果2: CSS 変数だけなら通る

`tokens.css`（`--sg-*` の宣言だけ）を重ねた場合はビルドが通り、
202KB の出力に `--sg-*` が 73 箇所解決した。

**壊すのはアダプタであって、トークンそのものではない。**

## 結果3: 出力に実行時のリセットは残らない

`--*: initial` が**ビルド時の指示なのか、出力に残る宣言なのか**を確かめた。

| | |
|---|---|
| 出力中の `--*` の出現数 | **0** |
| 出力の `:root` が定義する変数 | **372 件、すべて `--sg-*`** |
| Tailwind 側の変数を消す宣言 | **無い** |

**別々にビルドした CSS を同じページに載せても、相手のテーマ変数は消えない。**

これは重要な結論である。**iframe による隔離は要らない。**

## 結果4: 同名クラスの衝突は起きるが、値は一致する

我々のアダプタで小さなコンポーネントをビルドし、Fumadocs 側の出力と突き合わせた。

| | |
|---|---|
| Fumadocs 側の単純クラス規則 | 433 件 |
| 我々の側 | 12 件 |
| 同名のもの | **6 件** |
| うち宣言の**書き方**が違う | 6 件 |
| うち**値**が違う | **0 件** |

| クラス | Fumadocs | 我々 | 値 |
|---|---|---|---|
| `.gap-2` | `calc(var(--spacing) * 2)` | `var(--sg-space-2)` | どちらも 0.5rem |
| `.p-4` `.px-4` | `calc(var(--spacing) * 4)` | `var(--sg-space-4)` | どちらも 1rem |
| `.py-2` | `calc(var(--spacing) * 2)` | `var(--sg-space-2)` | どちらも 0.5rem |
| `.rounded-sm` | `var(--radius-sm)` | `var(--sg-radius-1)` | どちらも 0.25rem |
| `.duration-200` | `200ms` | `var(--sg-duration-2)` | どちらも 200ms |

**偶然ではない。** 決定3-3 が「**値が一致する Tailwind 名だけに写像する**」と決めている。

さらに、ドキュメントサイト側の Tailwind に `packages/ui` を**走査させなければ**、
同名のクラスを生成するのは我々のアセットだけになり、**衝突自体が起きない。**

### ただし規約であって検査ではない

写像を増やすときに**値のずれた名前を足すと、読み込み順で勝った方が効く。**
chrome かプレビューのどちらかが黙って変わり、エラーは出ない（教訓4）。

**[Issue #102](https://github.com/shun2218-dev/sashigane/issues/102) として立てた。**
`check:component-classes` が既に両方のビルドを走らせているので、同じ機構で見られる。

## 結論

| 問い | 答え |
|---|---|
| chrome をアダプタで組めるか | **組めない。** ビルドが落ちる |
| トークン（CSS 変数）を chrome で使えるか | **使える** |
| プレビューに iframe が要るか | **要らない。** 別ビルドの CSS を同じページに載せられる |
| 同居させて安全か | **いまは安全。** ただし規約に依存しているので検査にする（Issue #102） |

## この実験が示していないこと

- **Docusaurus で同じことが起きるか。** Infima は Tailwind ではないので `--*: initial` とは
  衝突しないはずだが、**preflight が Infima の土台を崩すかは測っていない。**
  Fumadocs を採ると決めたので測っていない
- **実ブラウザでの見え方。** 測ったのは生成された CSS の中身だけである
- **Fumadocs のバージョンを上げたときに同じか。** `lib/base.css` の `@apply` は
  実装の詳細であり、**向こうの都合で変わる**

## 経緯

**決め手を測らずに書いた。** 利用者から「iframe にこだわりすぎでは」「サンプルページは
独立した URL にして色をパラメータで渡せばよいのでは」と指摘され、測って初めて分かった。

**iframe を前提に置いて、そこからフレームワークの選択肢を狭めていた。**
教訓8 を足した直後に、同じ形を踏んでいる。
