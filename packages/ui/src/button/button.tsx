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
 * **`outline-none` を base に置かない。** `outline-style: none` が残り、
 * 幅と色を足しても輪郭が描かれない。`focus-visible:outline-solid` で立てる。
 *
 * **`duration-*` 単体は `transition-property: all` になる。** outline-color まで遷移し、
 * focus 直後の計算値が遷移前の値になる。`transition-colors` で対象を絞る。
 * ─────────────────────────────────────────────
 */
import { cva, type VariantProps } from 'class-variance-authority';
import type { ButtonHTMLAttributes } from 'react';

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
      variant: { solid: '', subtle: '', outline: 'border-1 border-border', ghost: '' },
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
       * variant × tone を**書き下す。** 組み立てると Tailwind が読めない（上記）。
       * 無効のときは塗りを載せない——**沈んだうえに塗りが残ると
       * 「押せそうに見えて押せない」になる。**
       */
      { variant: 'solid', tone: 'accent', disabled: false, class: 'bg-accent text-on-accent hover:bg-accent-strong' },
      { variant: 'solid', tone: 'danger', disabled: false, class: 'bg-danger text-on-danger hover:bg-danger-strong' },
      { variant: 'solid', tone: 'warning', disabled: false, class: 'bg-warning text-on-warning hover:bg-warning-strong' },
      { variant: 'solid', tone: 'success', disabled: false, class: 'bg-success text-on-success hover:bg-success-strong' },
      { variant: 'solid', tone: 'info', disabled: false, class: 'bg-info text-on-info hover:bg-info-strong' },

      { variant: 'subtle', tone: 'accent', disabled: false, class: 'bg-accent-subtle text-on-accent-subtle' },
      { variant: 'subtle', tone: 'danger', disabled: false, class: 'bg-danger-subtle text-on-danger-subtle' },
      { variant: 'subtle', tone: 'warning', disabled: false, class: 'bg-warning-subtle text-on-warning-subtle' },
      { variant: 'subtle', tone: 'success', disabled: false, class: 'bg-success-subtle text-on-success-subtle' },
      { variant: 'subtle', tone: 'info', disabled: false, class: 'bg-info-subtle text-on-info-subtle' },

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

export interface ButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'disabled'>,
    Omit<VariantProps<typeof button>, 'disabled'> {
  /**
   * 押せない状態。**不透明度では表さない**。
   * 面を `inset` に宣言して沈め、文字を `text-faint` にする。
   */
  disabled?: boolean;
}

export function Button({ variant, tone, disabled = false, className, ...props }: ButtonProps) {
  const classes = button({ variant, tone, disabled });
  // 塗らない variant は面の hover で押せることを示す。無効のときは付けない
  const paints = variant === undefined || variant === 'solid' || variant === 'subtle';
  return (
    <button
      type="button"
      // **無効のときだけ面を宣言する。** 面の仕掛けが背景と前景を同時に沈める
      data-sg-surface={disabled ? 'inset' : undefined}
      data-sg-interactive={!disabled && !paints ? '' : undefined}
      disabled={disabled}
      className={className ? `${classes} ${className}` : classes}
      {...props}
    />
  );
}
