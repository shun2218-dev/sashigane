/*
 * ── 維持する側への覚書 ───────────────────────────────
 *
 * 入力の線。**コンポーネントではないので例も展示ページも持たない。**
 * 検査はコンポーネントを `<name>/<name>.tsx` で数えているため、ここは対象外である。
 *
 * ## 器の側に置く（決定6-34）
 *
 * **面を宣言した要素の中では、役割はその面の段で解決される。**
 * 線を入力そのものに置くと、色が凹んだ面の段になり、
 * **誤りの文言と同じ役割なのに別の赤**になる。
 *
 * 線を描くのは入力を囲む器で、器はページの面の上にある。
 *
 * ## 1箇所に置いている理由
 *
 * 入力・多行入力・チェックボックス・ラジオが同じ線を描く。
 * **写しを作ると、片方だけ直したときにずれる。**
 * ここにあるのは線だけで、箱の形（大きさ・角）は呼ぶ側が足す。
 * ─────────────────────────────────────────────
 */
import { cva } from 'class-variance-authority';

/** 線が表すもの。**誤りと満たしているは同時に成り立たない** */
export type ControlState = 'none' | 'error' | 'valid';

/**
 * 属性と props から線の状態を決める。**部品ごとに書かない。**
 *
 * `aria-invalid` は文字列で来ることがある（`aria-invalid="true"`）。
 * **真偽値だけを見ると、文字列で渡した利用側が黙って通常の見た目になる。**
 */
export const stateOf = (valid: boolean | undefined, invalid: unknown): ControlState => {
  if (invalid === true || invalid === 'true') return 'error';
  return valid ? 'valid' : 'none';
};

/**
 * 線。**状態もフォーカスも同じ1本で表し、分けるのは太さである。**
 *
 * | | 通常 | フォーカス |
 * |---|---|---|
 * | なし | 1px `faint` | 2px `border-focus` |
 * | 誤り | 2px `danger` | **3px `danger`** |
 * | 満たす | 2px `success` | **3px `success`** |
 *
 * 状態がある側は**色を保ったまま太くなる。** 直している最中に赤が消えない。
 *
 * **輪郭で描く。** 境界の幅を変えると箱の寸法が変わり、
 * フォーカスのたびに下にあるものがずれる。輪郭は描画だけで寸法に関わらない。
 *
 * **通常の線も文字の役割である**（`outline-faint`）。境界の役割はどの段も
 * 自分が乗る面に対して 3:1 に届かない（`border-strong` でも 2.67。実測）。
 * 線が無いと部品だと分からないので、届かないと困る。
 *
 * 枝が排他なので、**1つの状態の分しかクラスが出ない**——
 * 同じ特定度のクラスが並んで出力順に勝敗を委ねることが起きない。
 *
 * ## 押せないときは線を落とす
 *
 * **入っていない `disabled` は、押せるものと見た目が同じだった。**
 * 中の印は押せないときに段が落ちるが、入っていなければ印そのものが無い。
 *
 * `has-disabled:` は特定度が高く、状態の色にも勝つ——
 * **押せないものの誤りを赤で見せても、直す手段が無い。**
 */
export const ring = cva('outline-solid outline-offset-0 has-disabled:outline-border-subtle', {
  variants: {
    state: {
      none: 'outline-1 outline-faint has-focus-visible:outline-2 has-focus-visible:outline-border-focus',
      error: 'outline-2 outline-danger has-focus-visible:outline-3',
      valid: 'outline-2 outline-success has-focus-visible:outline-3',
    },
  },
  defaultVariants: { state: 'none' },
});
