/*
 * ── 維持する側への覚書 ───────────────────────────────
 *
 * **凹んだ面を宣言する。** 入力欄は地であって、塗りではない。
 * 面の仕組みに乗るので、背景と文字が対で決まる。
 *
 * ## 線は入力そのものではなく、外側の枠が描く
 *
 * 面を宣言した要素の中では、役割は**その面の段**で解決される。
 * 線を `input` に置くと、線の色は**凹んだ面の段**になる——
 * 誤りの文言と `*` はページの面の段なので、**同じ役割なのに別の赤**になった。
 *
 * 利用者に指摘された。線は箱の**外**に描かれているのに、色の出どころは中のまま——
 * 塗る場所と段がねじれていた。
 *
 * 枠はページの面の上にあるので、**文言と同じ赤**になる。
 *
 * **枠を Field に描かせていない。** 描かせると、Field を使わない `Input` から
 * フォーカスリングごと消える。枠は Input が自分で持つ。
 *
 * ## 状態の線は文字の役割を使う
 *
 * mark ではない——深い面の上では mark が要件ぎりぎりまで明るい側へ寄るので、
 * **赤のように明るい側で彩度が落ちるランプは白っぽく見える。**
 *
 * **通常の線も文字の役割である**（`outline-faint`）。境界の役割はどの段も
 * 自分が乗る面に対して 3:1 に届かない（`border-strong` でも 2.67。実測）。
 * 線が無いと入力欄だと分からないので、届かないと困る。
 * ─────────────────────────────────────────────
 */
import { cva } from 'class-variance-authority';
import type { InputHTMLAttributes, Ref } from 'react';
import { type ControlState, ring, stateOf } from '../internal/ring.ts';

/**
 * 入力そのもの。**線は持たない**——枠が描く。
 *
 * 入力欄と複数行の入力で同じ見た目を使う。**ここ1箇所で組み立てる。**
 */
export const control = cva(
  'w-full rounded-sm px-3 py-2 text-body ' +
    'placeholder:text-faint ' +
    'disabled:text-faint ' +
    /*
     * **線を自分では描かない。** `input` と `textarea` はブラウザ既定で境界を持ち、
     * フォーカスで輪郭も出る。消しているのは preflight だが、
     * **preflight は配布先にあるとは限らない。** 残ると枠の線と合わせて2本出る。
     */
    'border-0 outline-none',
  {
    variants: {
      state: {
        none: '',
        error: '',
        // 印を重ねる場所を空ける。**枠ではなく中身の余白である**
        valid: 'pe-8',
      },
    },
    defaultVariants: { state: 'none' },
  },
);

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /**
   * 満たしていることを示す。**誤りとは別の仕組みで受け取る。**
   *
   * 誤りには `aria-invalid` という標準の属性があるので、そこから見た目を決める——
   * Field を使わない利用側でも同じ見た目になる。
   * **満たしていることを表す属性は無い**ので、props で受け取るしかない。
   */
  valid?: boolean;
  ref?: Ref<HTMLInputElement>;
}

/**
 * 入力を囲む枠。**線はここが描く**——入力そのものではない。
 *
 * 入力は凹んだ面を宣言しており、面を宣言した要素の中では
 * **役割がその面の段で解決される。** 線を入力に置くと、
 * 誤りの文言と同じ役割なのに別の色になる。
 *
 * 線は共有のものを使い、**箱の形だけをここで足す。**
 * 写しを作ると、片方だけ直したときにずれる。
 */
export const frameClass = (state: ControlState) => `${ring({ state })} flex w-full rounded-sm`;

/**
 * 1行の入力欄。
 *
 * ## 面を宣言する
 *
 * 入力欄は**凹んだ面**である。背景と文字が対で決まるので、
 * 塗るだけの道は無い。
 *
 * ## 線は枠が描く
 *
 * 線を入力そのものに置くと、色が**凹んだ面の段**で解決される。
 * 誤りの文言はページの面の段なので、**同じ役割なのに別の赤**になる。
 * 枠はページの面の上にあるので、文言と同じ赤になる。
 *
 * ## 誤りは自分で決めない
 *
 * `aria-invalid` が付くと線が変わる。**付けるのは Field である**——
 * ここで決めると、Field を使わない書き方だけが誤りを名乗れることになる。
 */
export function Input({ valid, className, ...props }: InputProps) {
  // 式の中で組み立てない。cva の呼び出しを補間の中へ直接置くと、
  // 静的解析の検査が読み切れずに落ちる
  const state = stateOf(valid, props['aria-invalid']);
  const outer = frameClass(state);
  return (
    <div
      data-sg-component="input-frame"
      className={className ? `${outer} ${className}` : outer}
    >
      <input
        data-sg-component="input"
        data-sg-surface="inset"
        className={control({ state })}
        {...props}
      />
    </div>
  );
}
