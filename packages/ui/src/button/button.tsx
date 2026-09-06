/*
 * ── 維持する側への覚書 ───────────────────────────────
 *
 * このブロックは JSDoc ではないので、型表には出ない。
 * **利用者に届く文面（JSDoc・例・展示ページ）には内部の参照を書かない。**
 * 番号だけ書かれても、読む側には辿る先が無い。
 *
 * 設計の経緯・退けた案・測定は、**sashigane 本体のリポジトリの設計記録**にある
 * （押している最中の見た目は持たない／無効は面を沈めて表す、あたり）。
 *
 * **パスでは書かない。** このファイルはレジストリ配信で利用側リポジトリへ落ちるので、
 * リポジトリ相対のパスは落ちた先で必ず壊れる。書くなら絶対 URL にする。
 *
 * ## 踏みやすい罠が3つある
 *
 * **クラス名を組み立てない。** `bg-${tone}` のように書くと Tailwind が候補として読めず、
 * CSS が1つも生成されない。**エラーは出ない**ので、色の付いていないボタンが
 * それらしく表示される。実際に一度そう書いて全滅した。`compoundVariants` は冗長で正しい。
 *
 * **`solid` は塗りを宣言する**ので、色クラスを1つも書かない。
 * 塗りの段は面にもテーマにも依存せず、文字は白、境界が識別を担う。
 * 暗色で「明るい塗り＋黒文字」になっていたのを直した経緯は設計記録にある。
 *
 * **`outline-none` を base に置かない。** `outline-style: none` が残り、
 * 幅と色を足しても輪郭が描かれない。`focus-visible:outline-solid` で立てる。
 *
 * **`duration-*` 単体は `transition-property: all` になる。** outline-color まで遷移し、
 * focus 直後の計算値が遷移前の値になる。`transition-colors` で対象を絞る。
 *
 * **読み込み中は沈めない。** 無効は「できない」で、読み込み中は「いま起きている」である。
 * 面を沈めると2つが同じ見た目になり、区別が付かなくなる。
 * 押せなくはするが、見た目は自分の塗りのまま残す。
 *
 * **Spinner に依存している。** レジストリ配信では Button を入れると Spinner も要る。
 *
 * **`type` と `disabled` は自分で button を描くときだけ渡す。**
 * `asChild` のときの子は a かもしれず、どちらも意味を持たない属性である。
 * 渡しても**エラーにはならない**ので、付いているつもりのまま何も起きない。
 * ─────────────────────────────────────────────
 */
import { cva, type VariantProps } from 'class-variance-authority';
import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react';
import { FOCUS_RING } from '../internal/focus.ts';
import { Slot } from '../internal/slot.tsx';
import { Spinner } from '../spinner/spinner.tsx';

/**
 * 押せるもの。
 *
 * ## 押している最中の見た目は持たない
 *
 * 押している最中だけ見た目を変える仕組みは入れていない。
 * hover と focus で足りると判断している。
 *
 * ## 無効は面を沈めて表す
 *
 * 不透明度は使わない。薄めると前景と背景が同時に下地へ寄り、
 * 読みやすさの保証が効かなくなるためである。
 *
 * 代わりに、無効のときだけ**凹んだ面**を宣言して文字を淡くする。
 * 面の仕組みに乗るので、**塗り・淡い塗り・枠・文字だけのどれでも同じ形で沈む**——
 * 塗りが残って「押せそうに見えて押せない」状態にならない。
 *
 * ## focus の輪郭は自前で描く
 *
 * ブラウザ既定のアウトラインに任せると、色がこのシステムの外から来る。
 *
 * ## `className` は連結するだけ
 *
 * 渡したクラスは消えないが、同じ次元（余白など）を上書きした場合に
 * どちらが効くかは保証していない。
 *
 * ## アイコンだけのボタンには名前が要る
 *
 * 目に見える文字が無いので、読み上げに渡すものが何も無い。
 * **`aria-label` か `aria-labelledby` を型で必須にしてある**——
 * 書き忘れても**エラーは出ず、見た目も正常**なので、測らないと気づけない。
 *
 * ## 読み込み中は沈めない
 *
 * 無効は「できない」で、読み込み中は「いま起きている」である。
 * **同じ見た目にすると区別が付かない**ので、読み込み中は塗りをそのまま残す。
 *
 * 押せなくはする。輪が回っているだけで押せてしまうと、二重に送れてしまう。
 *
 * **両方渡したときは読み込み中が勝つ。** 沈んだ上で輪が回ると
 * 「できないのに待っている」になり、意味が通らない。
 *
 * ## 枠は輪のぶんだけ横に伸びる
 *
 * 文字は残すので、輪が増えたぶん幅が変わる。**押した瞬間に隣が動く。**
 * ずれてほしくない場所では、枠の幅を先に決めておく。
 *
 * アイコンだけのボタンでは輪が置き換えるので伸びない。
 *
 * ## 押せるものが button 要素とは限らない
 *
 * 見た目はボタンで中身はリンク、という形は普通にある。
 * `asChild` を付けると**この枠は要素を1つも作らず**、
 * クラスと属性を子へ移して**子だけを描く。**
 *
 * `<Button asChild><a href="/x">…</a></Button>` の結果は `<a>` 1つである。
 * **button の中に a が入る形にはならない。**
 */
const button = cva(
  'inline-flex items-center justify-center gap-2 rounded-sm py-2 ' +
    // **何を動かすかを決める。** `duration-*` だけだと transition-property が既定の
    // `all` になり、**outline-color まで遷移する。** focus の輪郭が一瞬遅れて付き、
    // 計算値も遷移前の値になる（実ブラウザのテストが捕まえた）。
    // このシステムは動きをほとんど持たない方針なので、全部を動かすのは行き過ぎである
    'transition-colors duration-200 ' +
    // 線は1箇所に置いてある。**写しを作ると、片方だけ直したときにずれる**
    FOCUS_RING,
  {
    variants: {
      /**
       * 塗り方。**段はすべて既存の決定から来る。**
       * 塗りの色も、その上に載る文字の色も、hover でずらす先も、
       * **すべてトークンが持っている。ここで新しい色は1つも決めていない。**
       */
      /*
       * `outline` の境界は**中立色である。** ランプの色にしない——
       * **色はランプに、境界は面の骨格に属する。** 揃え忘れではない。
       *
       * **4種すべてが境界を持つ。** 塗りと枠だけが持っていたとき、
       * 境界の 2px ぶんだけ高さが 42 と 40 に割れ、
       * **同じ列に並べたときに揃っていなかった。**
       * 淡い塗りと文字だけは見えない境界を置いて幅だけ合わせている——
       * 薄めているのではなく、**幅を占めるためだけ**の境界である。
       */
      variant: {
        solid: 'border-1',
        // 見えない境界を持つ。**幅を占めるためだけ**に置いてある（下記）
        subtle: 'border-1 border-transparent',
        outline: 'border-1 border-border',
        ghost: 'border-1 border-transparent',
      },
      /** どのランプで塗るか。**塗りを持つランプすべて** */
      tone: { accent: '', danger: '', warning: '', success: '', info: '' },
      /**
       * 無効。**不透明度は使わない**。
       * `inset` の面を宣言して沈め、文字を `text-faint` にする。
       */
      disabled: { true: 'text-faint', false: '' },
      /**
       * アイコンだけのボタン。**左右の余白を詰める。**
       *
       * 上下の余白は変えないので、**文字のボタンと高さが揃う。**
       * 幅はアイコンに従う——行の高さと同じ大きさのアイコンなら正方形になる。
       *
       * 正方形に固定していないのは、**固定できる寸法がスケールに無い**ためである。
       * 文字のボタンの高さは段の上に乗っていないので、
       * 縦横を段で指定すると横に並べたとき揃わなくなる。
       */
      iconOnly: { true: 'px-2', false: 'px-4' },
    },
    compoundVariants: [
      /*
       * `solid` はここに現れない。**塗りは宣言する**（`data-sg-fill`）ので、
       * 背景も境界も文字も属性が与える。**色クラスを1つも書かない。**
       *
       * variant × tone を**書き下す。** 組み立てると Tailwind が読めない（上記）。
       * 無効のときは塗りを載せない——**沈んだうえに塗りが残ると
       * 「押せそうに見えて押せない」になる。**
       */

      { variant: 'subtle', tone: 'accent', disabled: false, class: 'bg-accent-subtle text-on-accent-subtle hover:bg-accent-subtle!' },
      { variant: 'subtle', tone: 'danger', disabled: false, class: 'bg-danger-subtle text-on-danger-subtle hover:bg-danger-subtle!' },
      { variant: 'subtle', tone: 'warning', disabled: false, class: 'bg-warning-subtle text-on-warning-subtle hover:bg-warning-subtle!' },
      { variant: 'subtle', tone: 'success', disabled: false, class: 'bg-success-subtle text-on-success-subtle hover:bg-success-subtle!' },
      { variant: 'subtle', tone: 'info', disabled: false, class: 'bg-info-subtle text-on-info-subtle hover:bg-info-subtle!' },

      { variant: 'outline', tone: 'accent', disabled: false, class: 'text-accent' },
      { variant: 'outline', tone: 'danger', disabled: false, class: 'text-danger' },
      { variant: 'outline', tone: 'warning', disabled: false, class: 'text-warning' },
      { variant: 'outline', tone: 'success', disabled: false, class: 'text-success' },
      { variant: 'outline', tone: 'info', disabled: false, class: 'text-info' },

      { variant: 'ghost', tone: 'accent', disabled: false, class: 'text-accent' },
      { variant: 'ghost', tone: 'danger', disabled: false, class: 'text-danger' },
      { variant: 'ghost', tone: 'warning', disabled: false, class: 'text-warning' },
      { variant: 'ghost', tone: 'success', disabled: false, class: 'text-success' },
      { variant: 'ghost', tone: 'info', disabled: false, class: 'text-info' },
    ],
    defaultVariants: { variant: 'solid', tone: 'accent', disabled: false, iconOnly: false },
  },
);

interface ButtonBase
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'disabled'>,
    Omit<VariantProps<typeof button>, 'disabled' | 'iconOnly'> {}

/**
 * 目に見える文字を持たないものに、名前を与える形。**どちらか一方が要る。**
 *
 * 書き忘れても**エラーは出ず、見た目も正常**である。
 * 読み上げだけが「ボタン」としか言わなくなるので、**型で塞ぐしかない。**
 */
type NamedByAria = { 'aria-label': string } | { 'aria-labelledby': string };

/** アイコンだけかどうか。**アイコンだけなら名前が要る** */
type IconOnly = { iconOnly?: false } | ({ iconOnly: true } & NamedByAria);

/**
 * `asChild` と `disabled` は同時に使えない。**型で塞いである。**
 *
 * 押せない状態は button 要素の機能である。リンクには無い——
 * `disabled` を a に付けても**エラーは出ず、何も起きない。**
 * 沈んだ見た目のまま押せてしまうので、
 * **「押せそうに見えて押せない」の逆**という、より悪い状態になる。
 *
 * 押せない状態が要るなら button のままにする。
 * リンクを押せなくしたいなら、リンクを出さないのが正しい。
 */
export type ButtonProps = IconOnly &
  (
    | (ButtonBase & {
      asChild?: false;
      /** 描いた `button` を受け取る */
      ref?: Ref<HTMLButtonElement>;
      /**
       * 押せない状態。**不透明度では表さない**。
       * 面を `inset` に宣言して沈め、文字を `text-faint` にする。
       */
      disabled?: boolean;
      /**
       * 読み込み中。**輪を出し、押せなくする。**
       *
       * **沈めない。** 無効は「できない」で、読み込み中は「いま起きている」である。
       * 同じ見た目にすると区別が付かない。
       *
       * 文字はそのまま残す。輪だけにすると、何を待っているのか分からなくなる——
       * ただし**アイコンだけのボタンでは輪が置き換える。**
       */
      loading?: boolean;
    })
  | (ButtonBase & {
      /**
       * 枠を作らず、クラスと属性を子へ移す。**子は押せる要素1つだけ。**
       *
       * 複数の中身をまとめるときは、その要素の**内側**に入れる。
       * 外側を `div` で包むと、押せない `div` がボタンの見た目になる。
       */
      asChild: true;
      children: ReactNode;
      /** `asChild` のときは使えない。上の説明を参照 */
      disabled?: never;
      /** `asChild` のときは使えない。押せなくする手段が無いのと同じ理由である */
      loading?: never;
      /**
       * **子の要素**を受け取る。枠を作らないので、届くのは子である。
       * 子の側にも `ref` があれば**両方に配られる。**
       */
      ref?: Ref<HTMLElement>;
      })
  );

export function Button({
  variant,
  tone,
  disabled = false,
  asChild = false,
  iconOnly = false,
  loading = false,
  className,
  children,
  ...props
}: ButtonProps) {
  if (
    iconOnly &&
    !('aria-label' in props && props['aria-label']) &&
    !('aria-labelledby' in props && props['aria-labelledby'])
  ) {
    // 型で塞いであるが、型を持たない側から来ることもある。**黙って通さない**
    throw new Error(
      'アイコンだけの Button には aria-label か aria-labelledby が要ります。' +
        '目に見える文字が無いので、読み上げに渡すものがありません——' +
        '書き忘れても見た目は正常なので、気づけません。',
    );
  }
  if (asChild && (disabled || loading)) {
    // 型で塞いであるが、型を持たない側から来ることもある。**黙って通さない**
    throw new Error(
      'Button に asChild と disabled / loading を同時に渡せません。' +
        'どちらも button 要素の機能で、リンクには効きません——' +
        '付けても何も起きないまま、押せない見た目のリンクが押せてしまいます。',
    );
  }
  /*
   * **両方来たときは読み込み中が勝つ。**
   *
   * 型はどちらも許している。`disabled={!valid || submitting}` と
   * `loading={submitting}` を並べて書く形が普通にあるためで、
   * 塞ぐと**その書き方ができなくなる。**
   *
   * 沈んだ上で輪が回ると「できないのに待っている」になり、意味が通らない。
   * 沈めるだけにすると、**何かが起きていることが消える。**
   * 読み込み中の方が短く、いま起きていることなので、そちらを見せる。
   */
  const sinks = disabled && !loading;
  const classes = button({ variant, tone, disabled: sinks, iconOnly });
  /*
   * 面の hover を使うもの。**`solid` 以外はすべて使う。**
   *
   * `solid` は塗りを1段ずらす（`hover:bg-*-strong`）ので要らない。
   * `outline` と `ghost` は塗りが無いので、面の hover が背景を出す。
   * `subtle` は自前で塗っているため、面の hover の中立色に上書きされてしまう——
   * そこで hover のときだけ自分の塗りを `!` で再主張する。
   * 面の hover は色の変数も1段ずらすので、**再主張すると色付きのまま1段深くなる。**
   */
  const shiftsOwnFill = variant === undefined || variant === 'solid';
  /**
   * **塗りは宣言する。** 面（`data-sg-surface`）と同じ形で、
   * 宣言が背景・境界・文字を同時に与える。
   * 塗るだけの道は用意しない——`bg-*` を書いても前景は付いてこない。
   */
  const declaresFill = (variant === undefined || variant === 'solid') && !sinks;
  const shared = {
    // **自分が何であるかを名乗る。** 見た目は持たない
    'data-sg-component': 'button',
    // **無効のときだけ面を宣言する。** 面の仕掛けが背景と前景を同時に沈める。
    // **読み込み中は沈めない**——「できない」と「いま起きている」は別である
    'data-sg-surface': sinks ? 'inset' : undefined,
    'data-sg-fill': declaresFill ? (tone ?? 'accent') : undefined,
    'data-sg-interactive': !disabled && !loading && !shiftsOwnFill ? '' : undefined,
    className: className ? `${classes} ${className}` : classes,
    ...props,
  };

  /*
   * 読み込み中の中身。**輪は読み上げから隠す**——
   * ボタンは文字か `aria-label` で既に名前を持っており、
   * 隠さないと「読み込み中 読み込み中」と二重に読まれる。
   *
   * **アイコンだけのボタンでは輪が置き換える。** 並べると枠が横に伸びて、
   * 正方形でなくなる。文字のボタンでは残す——
   * 輪だけにすると、何を待っているのか分からなくなる。
   */
  const inside = loading ? (
    <>
      <Spinner aria-hidden="true" />
      {iconOnly ? null : children}
    </>
  ) : (
    children
  );

  // `type` と `disabled` は**自分で button を描くときだけ**渡す。
  // 子が a のとき、どちらも意味を持たないまま黙って付く
  if (asChild) return <Slot {...shared}>{children}</Slot>;
  /*
   * **ここだけ型を緩める。** props を分解した時点で ButtonProps の直和が潰れ、
   * `ref` が `Ref<HTMLElement>`（`asChild` 側の型）でも通ってしまう形になる。
   * この枝は `asChild` が false なので、実際に届くのは `button` である。
   */
  const own = shared as ButtonHTMLAttributes<HTMLButtonElement>;
  return (
    <button
      type="button"
      // **押せなくする。** 輪が回っているだけで押せると、二重に送れてしまう
      disabled={disabled || loading}
      aria-busy={loading ? true : undefined}
      {...own}
    >
      {inside}
    </button>
  );
}
