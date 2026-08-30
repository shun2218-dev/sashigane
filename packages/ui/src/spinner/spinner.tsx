/*
 * ── 維持する側への覚書 ───────────────────────────────
 *
 * **回転はトークン層が持っている。** ここは形と大きさだけを持つ。
 * `data-sg-spinner` を付けると回り、動きを減らす設定では止まる。
 * 素の CSS の利用者も同じ属性で同じものを得る。
 *
 * **止まると見た目からは進行が読み取れない。**
 * だから名前を型で必須にしてある——読み上げ側にだけは必ず届く。
 *
 * 大きさの段を1つしか持っていない。行の高さに合わせてある。
 * 増やすなら、増やす理由を先に書く。
 *
 * ## `asChild` を持たない
 *
 * **渡す中身が無い。** この器が持っているのは輪そのもの（境界で描いている）で、
 * 子へ移せる内容が存在しない。移すと輪が消える。
 *
 * 役割を変えたいだけなら props で足りる（`role="status"` など）。
 * 要素そのものを変えたい場合は、外側で包む。
 * ─────────────────────────────────────────────
 */
import type { HTMLAttributes, Ref } from 'react';

interface SpinnerBase extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  ref?: Ref<HTMLSpanElement>;
}

/**
 * 名前の与え方。**どれか1つが要る。**
 *
 * 読み上げから隠すのも選択肢である——**すでに名前を持つものの中**に置くときは、
 * 隠さないと二重に読まれる。
 */
type Named =
  | { 'aria-label': string }
  | { 'aria-labelledby': string }
  | { 'aria-hidden': true | 'true' };

export type SpinnerProps = SpinnerBase & Named;

/**
 * 待っていることを表す、回り続ける輪。
 *
 * ## 動きだけで状態を伝えない
 *
 * 動きを減らす設定では**止まる。** 止まった輪からは進行が読み取れないので、
 * 名前を型で必須にしてある。周りに文字を出せるなら、そちらも出す。
 *
 * ## 大きさは行の高さに合わせてある
 *
 * 文字やアイコンと横に並べたときに揃う。
 *
 * ## 色は継承する
 *
 * 輪の色は文字の色をそのまま使う。**塗りの上でも枠の中でも、置いた場所の前景に従う。**
 */
export function Spinner({ className, ...props }: SpinnerProps) {
  const classes =
    'inline-block size-6 shrink-0 rounded-full border-2 border-current border-t-transparent';
  return (
    <span
      data-sg-spinner
      className={className ? `${classes} ${className}` : classes}
      {...props}
    />
  );
}
