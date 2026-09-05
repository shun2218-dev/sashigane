/*
 * ── 維持する側への覚書 ───────────────────────────────
 *
 * **素の `input type="checkbox"` に乗せる。** 見た目だけを差し替える。
 * 読み上げ・キーボード・フォームへの載り方は、どれもブラウザが持っている。
 *
 * ## 入った印は「宣言した塗り」の兄弟要素で出す
 *
 * `input` の中に要素は置けないので、印は兄弟に置いて重ねる。
 * 出し入れは `peer-checked:` である——**状態を持たない。**
 *
 * 状態を持つと、この部品がクライアント側になり、
 * **素のフォームでも `register()` でも、値の出どころが2つになる。**
 * いまは値を持つのは `input` だけである。
 *
 * **`bg-accent` は生成されていない**（決定6-9）。塗りは `data-sg-fill` で宣言する。
 * 宣言は背景と前景を対で決めるので、中の印は文字色を継いで読める側になる。
 *
 * ## 押せないときだけ、塗りの段を落とす
 *
 * `disabled` は**利用側が渡す props** なので、描くときに分かる。
 * CSS で宣言を差し替えることはできないが、ここでは分岐できる。
 * ─────────────────────────────────────────────
 */
import type { InputHTMLAttributes, Ref } from 'react';
import { IconCheck } from '../icon/icon.tsx';
import { ring, stateOf } from '../internal/ring.ts';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  /**
   * 満たしていることを示す。**誤りとは別の仕組みで受け取る。**
   *
   * 誤りには `aria-invalid` という標準の属性があるが、
   * **満たしていることを表す属性は無い**ので、props で受け取るしかない。
   */
  valid?: boolean;
  ref?: Ref<HTMLInputElement>;
}

/**
 * チェックボックス。
 *
 * ## 札は Field が付ける
 *
 * **札を自分では持たない。** 持つと結びつけの経路が2つになり、
 * 片方だけ直したときにずれる。札が右に来る配置は Field が持っている。
 *
 * ```tsx
 * <Field layout="inline" id="terms" label="利用規約に同意する">
 *   <Checkbox />
 * </Field>
 * ```
 *
 * ## 値を持つのは input だけ
 *
 * 入った印は `peer-checked:` で出している。**この部品は状態を持たない**ので、
 * サーバ側で描けるし、素のフォームでも `register()` でもそのまま載る。
 */
export function Checkbox({ valid, className, ...props }: CheckboxProps) {
  const state = stateOf(valid, props['aria-invalid']);
  // 式の中で組み立てない。cva の呼び出しを補間の中へ直接置くと、
  // 静的解析の検査が読み切れずに落ちる
  const outer = `${ring({ state })} relative inline-flex size-4 shrink-0 rounded-sm`;
  const off = props.disabled;
  return (
    <span
      data-sg-component="checkbox-frame"
      className={className ? `${outer} ${className}` : outer}
    >
      <input
        type="checkbox"
        data-sg-component="checkbox"
        data-sg-surface="inset"
        className="peer size-full appearance-none rounded-sm border-0 outline-none"
        {...props}
      />
      {/*
        入った印。**読み上げには出さない**——入ったかどうかは `input` が伝える。

        押せないときは塗りの段を落とす。`data-sg-fill` は宣言なので
        CSS では差し替えられないが、**`disabled` は描くときに分かる。**
      */}
      <span
        aria-hidden="true"
        data-sg-fill={off ? undefined : 'accent'}
        className={
          off
            ? 'pointer-events-none absolute inset-0 hidden items-center justify-center rounded-sm bg-accent-subtle text-on-accent-subtle peer-checked:flex'
            : 'pointer-events-none absolute inset-0 hidden items-center justify-center rounded-sm peer-checked:flex'
        }
      >
        {/* **`sm`（16px）は器と同じ大きさで収まらない。** 器に入る段を使う */}
        <IconCheck size="xs" />
      </span>
    </span>
  );
}
