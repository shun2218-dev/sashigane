/*
 * ── 維持する側への覚書 ───────────────────────────────
 *
 * **凹んだ面を宣言する。** 入力欄は地であって、塗りではない。
 * 面の仕組みに乗るので、背景と文字が対で決まる。
 *
 * **状態の境界は文字の役割（`border-danger` / `border-success`）を使う。**
 * mark ではない——深い面の上では mark が要件ぎりぎりまで明るい側へ寄るので、
 * **赤のように明るい側で彩度が落ちるランプは白っぽく見える。**
 * 凹んだ面・暗色で C* が 21 まで落ちていた（実測）。文字の役割なら 41 ある。
 *
 * **状態の境界は太くする。** 1px では色の面積が足りず、色の違いが読み取りにくい。
 *
 * **`aria-invalid` は自分で書かない。** Field が配線する。
 * ここで書くと、Field を使わない書き方だけが「誤り」を名乗れる形になる。
 * ─────────────────────────────────────────────
 */
import { cva, type VariantProps } from 'class-variance-authority';
import type { InputHTMLAttributes, Ref } from 'react';

/**
 * 入力欄と多行入力で同じ見た目を使う。**ここ1箇所で組み立てる。**
 *
 * 状態の境界は**太くする**。1px では色の面積が足りず、違いが読み取りにくい。
 */
export const control = cva(
  'w-full rounded-sm px-3 py-2 text-body ' +
    'placeholder:text-faint ' +
    'aria-invalid:border-danger aria-invalid:border-2 ' +
    'disabled:text-faint ' +
    'focus-visible:outline-solid focus-visible:outline-2 ' +
    'focus-visible:outline-offset-2 focus-visible:outline-border-focus',
  {
    variants: {
      /**
       * 満たしていることを示す。**誤りとは別の仕組みで受け取る。**
       *
       * 誤りには `aria-invalid` という標準の属性があるので、そこから見た目を決める——
       * Field を使わない利用側でも同じ見た目になる。
       * **満たしていることを表す属性は無い**ので、props で受け取るしかない。
       */
      valid: { true: 'border-2 border-success pe-8', false: 'border-1 border-border' },
    },
    defaultVariants: { valid: false },
  },
);

export interface InputProps
  extends InputHTMLAttributes<HTMLInputElement>,
    VariantProps<typeof control> {
  ref?: Ref<HTMLInputElement>;
}

/**
 * 1行の入力欄。
 *
 * ## 面を宣言する
 *
 * 入力欄は**凹んだ面**である。背景と文字が対で決まるので、
 * 塗るだけの道は無い。
 *
 * ## 誤りは自分で決めない
 *
 * `aria-invalid` が付くと境界が変わる。**付けるのは Field である**——
 * ここで決めると、Field を使わない書き方だけが誤りを名乗れることになる。
 *
 * ## 満たしていることは props で受け取る
 *
 * 誤りには標準の属性があるが、**満たしていることを表す属性は無い。**
 * そこだけ形が違うのは、そういう属性が無いからである。
 */
export function Input({ valid, className, ...props }: InputProps) {
  // 式の中で組み立てない。cva の呼び出しを補間の中へ直接置くと、
  // 静的解析の検査が読み切れずに落ちる
  const classes = control({ valid });
  return (
    <input
      data-sg-component="input"
      data-sg-surface="inset"
      className={className ? `${classes} ${className}` : classes}
      {...props}
    />
  );
}
