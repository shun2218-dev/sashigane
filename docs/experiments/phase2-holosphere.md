# Phase 2 の2本目: holosphere にトークンを導入する

実施日: 2026-08-25
関連: [Issue #42](https://github.com/shun2218-dev/sashigane/issues/42) /
[decisions.md](../decisions.md) / 1本目は [phase2-ichirizuka.md](./phase2-ichirizuka.md)

## なぜやったか

Phase 2 で出した穴のうち [#29](https://github.com/shun2218-dev/sashigane/issues/29)（面を重ねる方向）と
[#32](https://github.com/shun2218-dev/sashigane/issues/32)（密度の軸）は、
**観測が1件しかないことを理由に止めてある。** 原則7 に従って2件目を待っている状態だった。

holosphere は ichirizuka とほぼ正反対の性格を持つ。

| | ichirizuka | holosphere |
|---|---|---|
| モード | 明色のみ | **暗色のみ** |
| 面の作り方 | 不透明な段 | **アルファ合成**（`bg-white/[0.03]`） |
| スタイル | 素の CSS + `:root` 14変数 | **Tailwind v4 のユーティリティ直書き** |
| 依存 | 3つだけ | Next / recharts / framer-motion / Storybook |

**同梱の Tailwind アダプタ（`dist/theme.css`）を実プロジェクトへ当てるのは初めてになる。**

---

## 前提: 観測対象の現状を正解として扱わない

**この記録を書く途中で枠組みを一度組み直した。** 最初に測ったとき、
アダプタを当てると既存のユーティリティが 184 種消えることを「穴」として数えていた。

これは原則2 に反する。**過去の実装は「需要の観測」には使うが「値のソース」には使わない。**
観測対象4本はいずれもデザインシステム無しで書かれており、
一貫していない値や一般的でない組み方を含んでいる前提で読む必要がある。

実際、holosphere の文字色は次の**14段**ある。

```
text-white  text-white/90  /85  /80  /70  /60  /55  /50  /45  /40  /35  /30  /25  /10
```

これは設計ではなく、書きながら増えたものである。
sashigane が `text-default` / `text-muted` / `text-faint` の3段しか持たないことは
**縮退ではなく是正**であり、消えるのが正しい。

**参考にしたサイトに合わせてシステムを崩したら本末転倒である。**
以下、「消える」ことと「穴である」ことを厳密に分けて記録する。

---

## 測り方

対象: `tailwindcss@4.3.3` / `@tailwindcss/cli@4.3.3`（sashigane 側の devDependency）。
**holosphere が解決するのは `4.3.0` で、同一ではない。**
名前空間の意味論は両者で変わらない前提で読んでいるが、確かめてはいない。

`@source` を holosphere の `src` に向け、**素の Tailwind とアダプタの2通りで実際にコンパイルし、
生成されたユーティリティの集合を差分した**（教訓2: フィルタでなく生の出力を見る）。

```bash
# 素の Tailwind
@import "tailwindcss" source(none);
@source "<holosphere>/src";

# アダプタ
@import "<dist>/tokens.css";
@import "<dist>/theme.css";
@source "<holosphere>/src";
```

アダプタを読むと **184 種 / 1287 出現 / 124 ファイル**が消える（全 382 ファイル中）。

### その内訳

| | クラス種 | 出現数 | 判定 |
|---|---|---|---|
| 色（14段の白 + 生の色名） | 97 | 690 | **拒否が正しい**（決定3-3） |
| 文字サイズ（T シャツ語彙） | 10 | 245 | **拒否が正しい**（決定3-3） |
| 余白・位置（`gap-1.5` `p-5` など） | 25 | 95 | **拒否が正しい**（決定1-2・3-1） |
| 角丸（`rounded` = 6px） | 2 | 48 | **拒否が正しい**（決定3-3） |
| 行高（`leading-snug` など） | 2 | 8 | **拒否が正しい**（決定1-4） |
| **寸法（`w-*` `h-*` `max-h-*`）** | **40** | **135** | **穴 → G1** |
| **アニメーション（`animate-pulse`）** | **1** | **40** | **穴 → G5** |
| **字間（`tracking-*`）** | **2** | **17** | **穴 → G4** |
| 影（`shadow-lg` など） | 4 | 8 | 既知（elevation 未実装、決定1-8） |
| その他 | 1 | 1 | — |

**136 種 / 1086 出現は、システムが ad-hoc な値を正しく拒否している。**
残る 43 種 / 192 出現が、システム側に対応物が無いことによる。

---

## 導入の形

同梱アダプタは使えなかった。`--color-*: initial` 以下のリセットが**全部同時に効く**ため、
1287 箇所が一斉に無効になる。**段階的に移す道が塞がれる。**

そこで holosphere 側に**足すだけの写像**を書いた。

```css
@import "tailwindcss";
@import "./tokens.css";

@theme inline {
  --color-page: var(--sg-color-bg-page);
  --color-surface: var(--sg-color-bg-surface);
  --color-inset: var(--sg-color-bg-inset);
  --color-ink: var(--sg-color-text-default);
  --color-muted: var(--sg-color-text-muted);
  --color-faint: var(--sg-color-text-faint);
  --color-line: var(--sg-color-border-subtle);
  --color-line-strong: var(--sg-color-border-default);
  --color-accent: var(--sg-color-accent);
  --color-accent-mark: var(--sg-color-accent-mark);
  --color-focus: var(--sg-color-border-focus);
}
```

そのうえで面のプリミティブ（`Card` / `DashboardCard` / `SectionCard` / `Badge` / `Button`）だけを
セマンティックへ移した。**これは移行の途中経過であって、最終形ではない。**

> **この写像はもう書けない（2026-08-27、決定5-12 改訂・[Issue #65](https://github.com/shun2218-dev/sashigane/issues/65)）。**
> `--sg-color-bg-surface` / `-inset` を落としたためである。塗るだけの道を残すと
> 「塗ったが文脈は page のまま」を作れてしまい、実際にサンプルページが踏んでいた。
> 段階的移行はこの写像ではなく、面の要素へ `data-sg-surface` を足す形で行う。
> **ページ地（`--sg-color-bg-page`）だけは残っている。**

primary は holosphere が OG 画像で `ACCENT` として直書きしている `#e879f9` を入力にした。
パレットの警告は出ていない。

### 何を確かめて、何を確かめていないか

**1本目より確認の範囲が狭い。** ichirizuka では `npm run build` が通り実データで描画されるところまで見たが、
今回はそこまで届いていない。

| | 結果 |
|---|---|
| `npx tsc --noEmit` | ✅ 通る |
| `next build` の**コンパイル** | ✅ `Compiled successfully`（Next 16.2.7 / Turbopack / tailwindcss 4.3.0） |
| `next build` の**ページ収集** | ❌ `POSTGRES_URL is not set` で停止。**トークンとは無関係** |
| ユニットテスト | ⚠️ 初回 1227/1229。落ちた2件は下記。**PR で検査側を直して 1229/1229** |
| ストーリーのテスト | ✅ 200/200（52 ファイル） |
| 実ページの描画 | **エージェントは見ていない。** Vercel のプレビューが認証で保護されているため |
| トークンの値の描画 | ✅ 移した markup を切り出した静的ページをブラウザで確認した |

**エージェントは「アプリを起動して実データで見た」とは言えない。**
Vercel のプレビューは deployment protection の内側にあり、
認証情報を入力しない方針のため開けなかった。

> **2026-08-26 追記。** 導入は [holosphere#286](https://github.com/shun2218-dev/holosphere/pull/286)
> としてマージされた。**プレビューでの見た目は人が確認して問題なしと判断している。**
> エージェントが自分で確かめた範囲は上の表のとおりで、そこは変わらない。

#### 落ちたテスト2件 — 利用側がクラス名を検査していた

```
Card.test.tsx   expect(el).toHaveClass('rounded-2xl', 'border', 'bg-white/[0.03]')
Badge.test.tsx  expect(el).toHaveClass('rounded-full', 'bg-white/10', 'px-3', 'py-1', 'text-sm')
```

移したのはこの2つのコンポーネントで、**落ちたのもこの2つだけ**である。

利用側のテストが**生の Tailwind クラス名を直接検査している**ため、
トークンへ移すと必ず落ちる。これは holosphere 側のテストの書き方の問題であって
sashigane の穴ではないが、**レジストリ方式で配る以上、導入時に必ず通る道である。**
導入手順に「クラス名を検査しているテストは書き換えが要る」と書く材料になる。

[holosphere#286](https://github.com/shun2218-dev/holosphere/pull/286) では
検査側をセマンティックの名前に書き換えて 1229/1229 に戻した。
ストーリーの装飾も `bg-[#0b0b14]` から `bg-page` に変えている。
**ストーリーが生値のままだと、トークンが効いているかを見る場所が無くなるため。**

### 暗色の固定は効いた

holosphere は暗色専用で明色の設計を持たない。`<html data-theme="dark">` を1つ書くだけで固定できた。
静的ページに切り出して**ブラウザで暗色が当たることを確認した**（OS は明色設定）。

**決定5-10（テーマは両方向に固定できる）は ichirizuka の明色専用ケースへの対処だったが、
反対向きの暗色専用ケースでもそのまま機能した。**

---

## 写像した値の差

| 役割 | holosphere 現在 | 実効値 | sashigane 生成 | 現在の対ページ比 | 生成の対ページ比 |
|---|---|---|---|---|---|
| ページ地 | `bg-[#0b0b14]` | #0b0b14 | #100d10 | 1.00 | 1.00 |
| カード地 | `bg-white/[0.03]` | #12121b | #211e21 | 1.05 | 1.17 |
| カード hover | `bg-white/[0.06]` | #1a1a22 | #342f34（代用） | 1.13 | 1.47 |
| 境界 | `border-white/10` | #23232c | #342f34 | 1.26 | 1.47 |
| 境界（強） | `border-white/20` | #3c3c43 | #484148 | 1.79 | 1.95 |
| 本文 | `text-white/90` | #e7e7e8 | #dcd6dd | 15.85 | 13.53 |
| 補足 | `text-white/55` | #919195 | #a99caa | 6.24 | 7.38 |
| 最も弱い注記 | `text-white/40` | #6d6d72 | #8d828e | 3.81 | 5.26 |
| accent（文字） | `text-fuchsia-300` | #f0abfc | #d100ea | 11.13 | 4.51 |
| accent（塗り） | `bg-fuchsia-500` | #d946ef | #e852ff | 5.66 | 6.51 |
| focus リング | `outline-fuchsia-400` | #e879f9 | #e852ff | 7.96 | 6.51 |

アルファ合成は sRGB で `#ffffff` を `#0b0b14` に重ねて実効値を出した（ブラウザと同じ計算）。

**弱い注記が 3.81 → 5.26 に上がる。** ichirizuka でも同じことが起きた（あちらは 2.16 → 4.74）。
1本目では「意図的に弱い注記が作れない」という衝突として記録したが、
holosphere の `/40` は意図ではなく成り行きであり、**上がるのが正しい。**

**面の段差は sashigane の方が大きい。** `1.05 → 1.17`、`1.13 → 1.47`。
アルファ 3% はほぼ知覚できない差で、これは holosphere 側の弱さである。

---

## #29（面を重ねる方向）— 暗色では起きない

1本目の問題はこうだった。

```
sashigane   bg-page L=0.970 → bg-surface L=0.883   面が紙より 暗い
ichirizuka  paper   L=0.940 → card       L=0.978   カードが紙より 明るい
```

holosphere で測ると**向きは一致する。**

```
holosphere  page #0b0b14 → card #12121b   カードが地より 明るい
sashigane   bg-page #100d10 → bg-surface #211e21   面が地より 明るい
```

sashigane の暗色モデル（重ねるほど中間へ寄る＝明るくなる）と同じ向きである。

**#29 は「暗色でも起きる問題」ではなく、明色モードに限った話だった。**
そして ichirizuka の明色の組み方（地を沈めてカードを白く浮かせる）は
**設計判断ではなかった**（作者に確認。2026-08-26）。

→ **#29 は「利用側が重ね方を選べるようにする」ではなく、
「sashigane のモデルを正とし、選択肢を持たない」で閉じられる可能性が高い。**
判断材料としてこの観測を追記する。

> **2026-08-26 追記。** その方向で決定した（決定5-12 の「重ね方の向きは選べない」）。
> 退けた理由は実装コストではない。導出は向きに依存しないのでそのまま動く。
> **明色で3段積むにはページ地を段200（L=0.795）まで下げるしかなく、ほぼ白でなくなる。**
> 段50 より明るい段は存在しないためである。

## #32（密度の軸）— 2件目が取れた

holosphere の `Card` は padding をブレークポイントで変える。

```ts
const CARD_PADDING = {
  lg: 'p-4 sm:p-6 lg:p-8',   // 16 → 24 → 32px
  md: 'p-4 sm:p-6',          // 16 → 24px
  sm: 'p-6',                 // 24px 固定
} as const;
```

ichirizuka の `--gap: 28px → 22px` と**同じ軸**である。画面全体の密度が
ブレークポイントで動き、それが1箇所で決まっている。

**1本目と違い、段はすべて spacing スケールの上にある**（16 / 24 / 32px）。
1本目の 28px はスケール外だったが、それは値が ad-hoc だったからで、
**軸そのものの需要は2件で確認できた。**

→ #32 は「軸を持つ。段はスケールから取る」で進められる。

---

## 出た穴

### G1: 寸法が spacing の名前空間に巻き込まれる

決定3-1 は `--spacing: initial` を **「`p-5`(20px) を書けなくする」**ために置いた。
[実験](./tailwind-v4-spacing.md)も `p-*` しか試していない。

**v4 では `w-*` `h-*` `size-*` `max-h-*` `min-w-*` も同じ `--spacing` を食う。**

```
消える: w-96 w-80 w-72 w-64 w-56 w-52 w-50 w-44 w-40 w-32 w-28 w-20
        w-11 w-10 w-9 w-7 w-5 w-3.5 w-2.5 w-1.5（h-* も同様）max-h-64
残る:   w-1 w-2 w-3 w-4 w-6 w-8 w-12 w-16 w-24  ← spacing の10段
        w-full w-px w-max h-auto h-fit          ← spacing 由来でないもの
```

**余白のために選んだ10段で、要素の幅と高さまで縛られる。**
これは決定3-1 が主張した内容ではない。

holosphere の `w-96` が妥当な値かは別の問題である。
問題は**「要素の寸法」という次元をシステムがどう扱うか決めていない**ことで、
決めないまま副作用で10段に制限されている状態が誤りである。

決定1-10 は「container 幅 / topbar 高さなどのアプリ固有寸法は含めない。利用側の責務とする」
と書いている。**その方針なら、寸法が spacing のリセットに巻き込まれてはならない。**

### G2: アダプタが 9 つの名前空間を素通しさせている

決定3-3 の大原則は「**アダプタは所有する名前空間をすべてリセットする**」である。
実際にリセットしているのは10個で、**v4 の名前空間はそれで尽きていない。**

コンパイルして確かめたところ、次はすべて**素の Tailwind の値のまま生成される。**

| 名前空間 | 通ってしまうもの |
|---|---|
| `--container-*` | `max-w-6xl` `max-w-md` `w-2xl` `min-w-md` |
| `--font-weight-*` | `font-bold` `font-medium` `font-light` |
| `--breakpoint-*` | `sm:` `md:` `lg:` `xl:` `2xl:` |
| `--blur-*` | `blur-sm` `backdrop-blur-md` |
| `--drop-shadow-*` | `drop-shadow-lg` |
| `--text-shadow-*` | `text-shadow-lg` |
| `--inset-shadow-*` | `inset-shadow-sm` |
| `--perspective-*` | `perspective-normal` |
| `--aspect-*` | `aspect-video` `aspect-square` |

`max-w-6xl` は 72rem を素の Tailwind から取っている。**原則1 が成立していない。**

**`--breakpoint-*` が特に問題である。** 決定1-10 は
「breakpoint はトークンに含める。密度の軸と直結するため」と決めたが、
`--sg-breakpoint-*` は**1つも生成されていない。**
決定が実装されないまま、素の Tailwind の値が使われている。

これは教訓5 がそのまま当たった例である。

> 検査は「禁止するもの」ではなく「許可するもの」を列挙する。
> 禁止リスト方式は、リストに無いものを黙って通す。

アダプタのリセットは**手書きの禁止リスト**であり、
`check:tailwind-adapter` の期待値表（`bg-red-500` は出ないこと、など）も手書きである。
**列挙し忘れた名前空間があることに、検査が緑である限り気づけない。**

### G3: hover / active / overlay の面が無い

[roles.md](../roles.md) は次を観測済みとして記録している。

| 役割 | 観測 |
|---|---|
| `bg-hover` / `bg-active` | i p h |
| `bg-overlay` | h s（**不透明でなければならない**） |
| `bg-surface-subtle` | p |
| `border-strong` | p |
| `chart-gridline` | h（UI の境界よりさらに薄い） |

**どれもトークンになっていない。** 移行のとき hover の面を `bg-inset` で代用したが、
`bg-inset` は「凹んだ面」であって「hover した面」ではない。**役割が違う。**

原則3 は「セマンティックは実際に使う場所が1つ以上あるものだけ定義する」と言っており、
Phase 3（コンポーネント）まで待つ判断はありうる。
ただし **hover 状態を持たない UI は無い**ので、需要の有無が論点になるとは思えない。

**塞いだ（決定5-13）。** 5つのうち4つをトークンにし、`bg-surface-subtle` は退けた。
hover は「1段深い面の文脈」として持つ。背景だけ塗る形は全360色相で保証を割ることを
測って確かめた（最悪 `text-faint` 3.57、`accent-mark` 2.39）。
`bg-active` は保留。**2段深い面は梯子に無い。**

### G4: letter-spacing が未実装

決定1-9 は駆動要因を2つ挙げ、「具体的な係数は Phase 1 で確定する」と書いたまま
**実装されていない。** `--sg-tracking-*` は1つも無く、アダプタは `--tracking-*: initial` で
素の Tailwind を消すだけである。

holosphere の使われ方は決定1-9 のモデルと**完全に一致した。**

```tsx
<h1 className="text-3xl font-bold tracking-tight sm:text-4xl">      // サイズ駆動・負
<p className="text-xs uppercase tracking-wide text-white/50">       // 大文字駆動・正
```

`tracking-wide` は **11 箇所すべて**が `uppercase` と同時に使われている（全件を目で確認した）。
`tracking-tight` は 6 箇所のうち **5 箇所**が `text-2xl` 以上の見出しである。

**残る1件は決定1-9 のどちらの駆動要因でもなかった。**

```tsx
// components/ui/Logo.tsx — ワードマーク。サイズは呼び出し側から継承する
'inline-flex items-center gap-2 font-bold tracking-tight text-white'
```

サイズが決まっていないので `f(size)` では説明できず、`uppercase` でもない。
**ワードマークの字間はブランドの選択であって、システムの選択ではない。**
決定1-11 が書体について言ったことと同じ構造である。

### G5: skeleton のアニメーションに出口が無い

`animate-pulse` が 40 箇所ある。`loading.tsx` の骨組み表示である。

```tsx
<div className="h-10 w-40 animate-pulse rounded bg-white/10 motion-reduce:animate-none" />
```

- skeleton は [roles.md](../roles.md) が**需要として挙げている役割**である
- ループ周期のスケールは決定1-6 で**持っている**（`--sg-duration-loop-0/1/2`）
- それなのにアダプタは `--animate-*: initial` で消すだけで、写像が無い

`--ease-*` も同様にリセットするだけで、**イージングのトークンはそもそも1つも無い。**

### G6: 識別色は5色。カテゴリは10ある

holosphere は配信カテゴリごとの色を TS に直書きで持っている。

```ts
export const CATEGORY_COLORS: Record<StreamCategory, string> = {
  game: '#e879f9', singing_stream: '#38bdf8', cover: '#818cf8', original: '#a78bfa',
  dance: '#22d3ee', chatting: '#fbbf24', '3d': '#34d399', asmr: '#f472b6',
  shorts: '#fb923c', other: '#94a3b8',
};
```

決定5-5 は「**系列数は 5（holosphere が4系列**、shadcn が5系列）」を根拠にしている。

**「4系列」自体は正しい。** `GrowthChartCanvas.tsx` に該当するチャートが実在する。

```ts
const SERIES_COLOR = { views: '#38bdf8', likes: '#e879f9', comments: '#fbbf24' };
const VELOCITY_COLOR = '#34d399';   // 合わせて4系列
```

**同じリポジトリに4系列のチャートと10分類のチャートが両方ある。**
`CATEGORY_COLORS` は 2026-08-05 から存在しており、観測日（2026-08-23）より前からある。
決定5-5 は前者だけを見て 5 段と決めており、**後者は結論に反映されていない。**

ただし **「だから10色に増やす」とは限らない。** 決定5-9 は
「status は色だけで伝えてはならない」と決めており、決定5-8 は二色覚下で
5系列でも潰れることを実測している。**10 分類を色だけで区別するのは元々成立しない。**
holosphere 側も凡例とスクリーンリーダ用の表でラベルを併記している。

→ **「識別色を増やす」ではなく「何系列までを色で区別してよいと宣言するか」**の問題として記録する。

### G8: コントラスト保証が成立するのは `bg-page` の上だけ

**移行後の画面を見て、カード上の accent の文字が沈んで見えた。**
数値を出す前に目で気づいた（決定5-7 と同じ経路）。

段ごとに測り直すと、保証は面の1段目でしか成立していない。

#### 文字（目標 4.5:1）

| 役割 | 対 bg-page | 対 bg-surface | 対 bg-inset |
|---|---|---|---|
| text-default | 13.53 | 11.56 | 9.18 |
| text-muted | 7.38 | 6.31 | 5.01 |
| text-faint | 5.26 | **4.49** | **3.57** |
| accent | 4.51 | **3.85** | **3.06** |
| danger | 4.66 | **3.98** | **3.16** |
| warning | 5.10 | **4.36** | **3.46** |
| info | 5.15 | **4.40** | **3.50** |

（暗色モード。明色モードはさらに悪く、`bg-surface` で success 3.46 / warning 3.81）

#### マーク（目標 3:1、決定5-7）

明色モードの `bg-surface` 上:

| 役割 | 対 bg-page | 対 bg-surface | 対 bg-inset |
|---|---|---|---|
| accent-mark | 3.92 | 3.00 | **2.24** |
| danger-mark | 3.79 | **2.91** | **2.17** |
| warning-mark | 3.46 | **2.65** | **1.98** |
| success-mark | 3.13 | **2.40** | **1.79** |
| info-mark | 3.42 | **2.62** | **1.96** |
| border-focus | 3.92 | 3.00 | **2.24** |

**フォーカスリングが凹んだ面の上で 2.24:1 になる。**

（境界そのもの（`border-subtle` / `border-default`）は装飾なので 3:1 の対象外。除いてある）

#### 決定は矛盾していない。範囲が狭いだけ

決定5-2 の表は面を **50 / 950** と明示している。決定はそのとおりに実装され、
テスト（`test/color.test.ts`）も `neutral.byStep[lightSurfaceStep]` = 50 / 950 に対して
全360色相を検証している。**嘘はついていない。**

問題は範囲である。

- **文字が最も多く載るのは `bg-page` ではなくカード（`bg-surface`）である。**
  今回移した `Card` / `DashboardCard` / `SectionCard` はすべてそうだった
- 原則5 は「WCAG 適合を**そうなっているもの**にする」と書いている
- README も「明色の**面**に対し段 500 が 4.5:1 を、どの色相を選んでも満たす」と書いている。
  「面」がページ地だけを指すとは読めない

**`bg-surface` と `bg-inset` は一度も測られていない。**
教訓2 の「尺度を1つ選んで閾値と比べただけの結論」に近い形で、
**測っている面が実際に使う面と違う。**

#### 検討すること（G8 として Issue にする）

- 保証の対象を「面のどの段まで」とするか。全段にすると端点の解が大きく動く
- 面の段数（3段）と保証の両立が取れない場合、**どちらを削るか**
- 保証の範囲を README と原則5 に**明示する**。現在の書き方は範囲を限っていない

### G7: JS から値を読めない — 1本目と同じ穴が再現した

`src/og/icon.tsx` と `src/og/root-card.tsx` が `const ACCENT = '#e879f9'` を直書きしている。
上の `CATEGORY_COLORS` も同じである。

**OG 画像は CSS 変数が原理的に届かない場所**であり、決定2-6 の改訂（`tokens.js`）が
まさにこのために入った。**穴は塞がっているが、利用側がまだ使っていない**という状態である。

---

## まとめ

| | 扱い |
|---|---|
| 面の重なりの向き | 暗色では sashigane と一致。**#29 は明色限定の話だった** |
| 密度の軸 | **2件目の観測が取れた**（`p-4 sm:p-6 lg:p-8`）。#32 を進められる |
| 暗色の固定（決定5-10） | **反対向きのケースでも機能した** |
| 生成物のヘッダ（決定3-4） | 配布先で意味が通ることを2本目でも確認した |
| G1 寸法が spacing に巻き込まれる | Issue |
| G2 名前空間の素通し（9個） | Issue。**教訓5 がそのまま当たった** |
| G3 hover / active / overlay の面が無い | **塞がった**（決定5-13、#45）。`bg-active` だけ保留 |
| G4 letter-spacing 未実装 | Issue |
| G5 skeleton の出口が無い | Issue |
| G6 識別色の上限 | Issue（増やす方向とは限らない） |
| G7 JS から値を読めない | **塞がっている。** 利用側の適用が残っているだけ |
| G8 保証が `bg-page` の上でしか成立しない | Issue。**今回いちばん重い。目で見て気づいた** |

**穴はここで直さない。** 1本目と同じく、記録して必要なものを別 Issue に切る。
