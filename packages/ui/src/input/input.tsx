/*
 * ── 維持する側への覚書 ───────────────────────────────
 *
 * **凹んだ面を宣言する。** 入力欄は地であって、塗りではない。
 * 面の仕組みに乗るので、背景と文字が対で決まる。
 *
 * ## 線は入力そのものではなく、外側の器が描く
 *
 * 面を宣言した要素の中では、役割は**その面の段**で解決される。
 * 線を `input` に置くと、線の色は**凹んだ面の段**になる——
 * 誤りの文言と `*` はページの面の段なので、**同じ役割なのに別の赤**になった。
 *
 * 利用者に指摘された。線は箱の**外**に描かれているのに、色の出どころは中のまま——
 * 塗る場所と段がねじれていた。
 *
 * 器はページの面の上にあるので、**文言と同じ赤**になる。
 *
 * **器を Field に描かせていない。** 描かせると、Field を使わない `Input` から
 * フォーカスリングごと消える。器は Input が自分で持つ。
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

/** 線が表すもの。**誤りと満たしているは同時に成り立たない** */
type State = 'none' | 'error' | 'valid';

/**
 * 属性と props から線の状態を決める。**Input と Textarea で同じものを使う。**
 *
 * `aria-invalid` は文字列で来ることがある（`aria-invalid="true"`）。
 * **真偽値だけを見ると、文字列で渡した利用側が黙って通常の見た目になる。**
 */
export const stateOf = (valid: boolean | undefined, invalid: unknown): State => {
  if (invalid === true || invalid === 'true') return 'error';
  return valid ? 'valid' : 'none';
};

/**
 * 入力欄を囲む器。**線はここだけが描く。**
 *
 * ## 線は1本だけである
 *
 * 状態を境界で、フォーカスを輪郭で表していたため、**誤りの欄に入ると線が2本出た。**
 * 状態もフォーカスも**同じ1本の線**で表す。分けるのは**太さ**である。
 *
 * | | 通常 | フォーカス |
 * |---|---|---|
 * | なし | 1px `faint` | 2px `border-focus` |
 * | 誤り | 2px `danger` | **3px `danger`** |
 * | 満たす | 2px `success` | **3px `success`** |
 *
 * 状態がある側は**色を保ったまま太くなる。** 直している最中に赤が消えない。
 *
 * ## 境界ではなく輪郭で描く
 *
 * **`border` の幅を変えると箱の高さが変わり、下にあるものがずれる。**
 * フォーカスのたびに説明文が動く。輪郭は描画だけで、**寸法に関わらない。**
 *
 * ## 枝が排他なので、順序を気にしなくてよい
 *
 * 状態は cva の枝で分けてある。**1つの状態の分しかクラスが出ない**ので、
 * 同じ特定度のクラスが並んで出力順に勝敗を委ねることが起きない。
 */
export const frame = cva('flex w-full rounded-sm outline-solid outline-offset-0', {
  variants: {
    state: {
      none: 'outline-1 outline-faint has-focus-visible:outline-2 has-focus-visible:outline-border-focus',
      error: 'outline-2 outline-danger has-focus-visible:outline-3',
      valid: 'outline-2 outline-success has-focus-visible:outline-3',
    },
  },
  defaultVariants: { state: 'none' },
});

/**
 * 入力そのもの。**線は持たない**——器が描く。
 *
 * 入力欄と多行入力で同じ見た目を使う。**ここ1箇所で組み立てる。**
 */
export const control = cva(
  'w-full rounded-sm px-3 py-2 text-body ' +
    'placeholder:text-faint ' +
    'disabled:text-faint ' +
    /*
     * **線を自分では描かない。** `input` と `textarea` はブラウザ既定で境界を持ち、
     * フォーカスで輪郭も出る。消しているのは preflight だが、
     * **preflight は配布先にあるとは限らない。** 残ると器の線と合わせて2本出る。
     */
    'border-0 outline-none',
  {
    variants: {
      state: {
        none: '',
        error: '',
        // 印を重ねる場所を空ける。**器ではなく中身の余白である**
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
 * 1行の入力欄。
 *
 * ## 面を宣言する
 *
 * 入力欄は**凹んだ面**である。背景と文字が対で決まるので、
 * 塗るだけの道は無い。
 *
 * ## 線は器が描く
 *
 * 線を入力そのものに置くと、色が**凹んだ面の段**で解決される。
 * 誤りの文言はページの面の段なので、**同じ役割なのに別の赤**になる。
 * 器はページの面の上にあるので、文言と同じ赤になる。
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
  const outer = frame({ state });
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
