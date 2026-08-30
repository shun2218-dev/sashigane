/*
 * ── 維持する側への覚書 ───────────────────────────────
 *
 * このブロックは JSDoc ではないので、型表には出ない。
 * **利用者に届く文面（JSDoc・例・展示ページ）には内部の参照を書かない。**
 * 番号だけ書かれても、読む側には辿る先が無い。
 *
 * 設計の経緯・退けた案・測定は、**sashigane 本体のリポジトリの設計記録**にある
 * （押下は表現しない／無効は面を沈めて表す、あたり）。
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
 * **`type` と `disabled` は自分で button を描くときだけ渡す。**
 * `asChild` のときの子は a かもしれず、どちらも意味を持たない属性である。
 * 渡しても**エラーにはならない**ので、付いているつもりのまま何も起きない。
 * ─────────────────────────────────────────────
 */
import { cva, type VariantProps } from 'class-variance-authority';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Slot } from '../internal/slot.tsx';

/**
 * 押せるもの。
 *
 * ## 押下の見た目は持たない
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
 * ## 押せるものが button 要素とは限らない
 *
 * 見た目はボタンで中身はリンク、という形は普通にある。
 * `asChild` を付けると**この器は要素を1つも作らず**、
 * クラスと属性を子へ移して**子だけを描く。**
 *
 * `<Button asChild><a href="/x">…</a></Button>` の結果は `<a>` 1つである。
 * **button の中に a が入る形にはならない。**
 */
const button = cva(
  'inline-flex items-center justify-center gap-2 rounded-sm px-4 py-2 ' +
    // **何を動かすかを決める。** `duration-*` だけだと transition-property が既定の
    // `all` になり、**outline-color まで遷移する。** focus の輪郭が一瞬遅れて付き、
    // 計算値も遷移前の値になる（実ブラウザのテストが捕まえた）。
    // このシステムは動きをほとんど持たない方針なので、全部を動かすのは行き過ぎである
    'transition-colors duration-200 ' +
    'focus-visible:outline-solid focus-visible:outline-2 ' +
    'focus-visible:outline-offset-2 focus-visible:outline-border-focus',
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
       */
      variant: { solid: 'border-1', subtle: '', outline: 'border-1 border-border', ghost: '' },
      /** どのランプで塗るか。**塗りを持つランプすべて** */
      tone: { accent: '', danger: '', warning: '', success: '', info: '' },
      /**
       * 無効。**不透明度は使わない**。
       * `inset` の面を宣言して沈め、文字を `text-faint` にする。
       */
      disabled: { true: 'text-faint', false: '' },
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
    defaultVariants: { variant: 'solid', tone: 'accent', disabled: false },
  },
);

interface ButtonBase
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'disabled'>,
    Omit<VariantProps<typeof button>, 'disabled'> {}

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
export type ButtonProps =
  | (ButtonBase & {
      asChild?: false;
      /**
       * 押せない状態。**不透明度では表さない**。
       * 面を `inset` に宣言して沈め、文字を `text-faint` にする。
       */
      disabled?: boolean;
    })
  | (ButtonBase & {
      /**
       * 器を作らず、クラスと属性を子へ移す。**子は押せる要素1つだけ。**
       *
       * 複数の中身をまとめるときは、その要素の**内側**に入れる。
       * 外側を `div` で包むと、押せない `div` がボタンの見た目になる。
       */
      asChild: true;
      children: ReactNode;
      /** `asChild` のときは使えない。上の説明を参照 */
      disabled?: never;
    });

export function Button({
  variant,
  tone,
  disabled = false,
  asChild = false,
  className,
  ...props
}: ButtonProps) {
  if (asChild && disabled) {
    // 型で塞いであるが、型を持たない側から来ることもある。**黙って通さない**
    throw new Error(
      'Button に asChild と disabled を同時に渡せません。' +
        'disabled は button 要素の機能で、リンクには効きません——' +
        '付けても何も起きないまま、沈んだ見た目のリンクが押せてしまいます。',
    );
  }
  const classes = button({ variant, tone, disabled });
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
  const declaresFill = (variant === undefined || variant === 'solid') && !disabled;
  const shared = {
    // **無効のときだけ面を宣言する。** 面の仕掛けが背景と前景を同時に沈める
    'data-sg-surface': disabled ? 'inset' : undefined,
    'data-sg-fill': declaresFill ? (tone ?? 'accent') : undefined,
    'data-sg-interactive': !disabled && !shiftsOwnFill ? '' : undefined,
    className: className ? `${classes} ${className}` : classes,
    ...props,
  };

  // `type` と `disabled` は**自分で button を描くときだけ**渡す。
  // 子が a のとき、どちらも意味を持たないまま黙って付く
  return asChild ? <Slot {...shared} /> : <button type="button" disabled={disabled} {...shared} />;
}
