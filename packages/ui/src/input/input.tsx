/*
 * ── 維持する側への覚書 ───────────────────────────────
 *
 * **凹んだ面を宣言する。** 入力欄は地であって、塗りではない。
 * 面の仕組みに乗るので、背景と文字が対で決まる。
 *
 * **誤りの境界は `border-danger-mark` である。** `border-danger` は生成されない——
 * 色のユーティリティは列挙で出しており、境界に使えるランプの色は mark だけである。
 * mark は文字ではないものに要る 3:1 を満たす段なので、**役割としても合っている。**
 *
 * **`aria-invalid` は自分で書かない。** Field が配線する。
 * ここで書くと、Field を使わない書き方だけが「誤り」を名乗れる形になる。
 * ─────────────────────────────────────────────
 */
import type { InputHTMLAttributes, Ref } from 'react';

/** 入力欄と多行入力で同じ見た目を使う。**ここ1箇所で組み立てる** */
export const controlClasses =
  'w-full rounded-sm border-1 border-border px-3 py-2 text-body ' +
  'placeholder:text-faint ' +
  'aria-invalid:border-danger-mark ' +
  'disabled:text-faint ' +
  'focus-visible:outline-solid focus-visible:outline-2 ' +
  'focus-visible:outline-offset-2 focus-visible:outline-border-focus';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
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
 */
export function Input({ className, ...props }: InputProps) {
  return (
    <input
      data-sg-component="input"
      data-sg-surface="inset"
      className={className ? `${controlClasses} ${className}` : controlClasses}
      {...props}
    />
  );
}
