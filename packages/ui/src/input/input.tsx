/*
 * ── 維持する側への覚書 ───────────────────────────────
 *
 * **凹んだ面を宣言する。** 入力欄は地であって、塗りではない。
 * 面の仕組みに乗るので、背景と文字が対で決まる。
 *
 * **状態の線は文字の役割（`outline-danger` / `outline-success`）を使う。**
 * mark ではない——深い面の上では mark が要件ぎりぎりまで明るい側へ寄るので、
 * **赤のように明るい側で彩度が落ちるランプは白っぽく見える。**
 * 凹んだ面・暗色で C* が 21 まで落ちていた（実測）。文字の役割なら 41 ある。
 *
 * **状態の線は太くする。** 1px では色の面積が足りず、色の違いが読み取りにくい。
 *
 * **線は輪郭1本だけである。** 境界（`border-*`）は使わない——
 * 2つの仕組みを持つと、状態とフォーカスが重なったときに線が2本出る。
 * 実際に出して指摘された。
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
 * ## 線は1本だけである
 *
 * 状態を境界で、フォーカスを輪郭で表していたため、**誤りの欄に入ると線が2本出た。**
 * 赤い境界の外側に青い輪郭が浮く。利用者から「両方は要らない」と指摘された。
 *
 * 状態もフォーカスも**同じ1本の線**で表す。分けるのは**太さ**である。
 *
 * | | 通常 | フォーカス |
 * |---|---|---|
 * | なし | 1px `border` | 2px `border-focus` |
 * | 誤り | 2px `danger` | 3px `danger` |
 * | 満たす | 2px `success` | 3px `success` |
 *
 * 状態がある側は**色を保ったまま太くなる。** 直している最中に赤が消えない。
 *
 * ## 境界ではなく輪郭で描く
 *
 * **`border` の幅を変えると箱の高さが変わり、下にあるものがずれる。**
 * フォーカスのたびに説明文が動く。輪郭は描画だけで、**寸法に関わらない。**
 *
 * 代償は、輪郭が箱の外へ出るぶん**隙間を食う**ことである。
 * 3px まで太るので、Field の間隔はそれを見込んである。
 *
 * ## 太さの順序は特定度で決めている
 *
 * `aria-invalid:focus-visible:*` は属性と擬似クラスの分だけ特定度が高く、
 * `focus-visible:*` に必ず勝つ。**同じ特定度で並べて出力順に頼っていない**——
 * Tailwind が出力の順序を決めるので、こちらからは見えない。
 * 満たしている側は cva の枝が排他なので、そもそも両方が出ない。
 */
export const control = cva(
  'w-full rounded-sm px-3 py-2 text-body ' +
    'placeholder:text-faint ' +
    'disabled:text-faint ' +
    // 輪郭は常に実線で置く。`outline-style` が none のままだと、
    // 幅と色を足しても何も描かれない
    'outline-solid outline-offset-0 ' +
    /*
     * **境界は自分で消す。** `input` と `textarea` はブラウザ既定で境界を持つ。
     * 消しているのは preflight だが、**preflight は配布先にあるとは限らない**——
     * 落ちた先で残ると、輪郭と合わせて線が2本出る。
     */
    'border-0 ' +
    'aria-invalid:outline-2 aria-invalid:outline-danger ' +
    'aria-invalid:focus-visible:outline-3 aria-invalid:focus-visible:outline-danger',
  {
    variants: {
      /**
       * 満たしていることを示す。**誤りとは別の仕組みで受け取る。**
       *
       * 誤りには `aria-invalid` という標準の属性があるので、そこから見た目を決める——
       * Field を使わない利用側でも同じ見た目になる。
       * **満たしていることを表す属性は無い**ので、props で受け取るしかない。
       */
      valid: {
        true: 'outline-2 outline-success pe-8 focus-visible:outline-3 focus-visible:outline-success',
        false: 'outline-1 outline-border focus-visible:outline-2 focus-visible:outline-border-focus',
      },
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
