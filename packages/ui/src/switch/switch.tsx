/*
 * ── 維持する側への覚書 ───────────────────────────────
 *
 * **素の `input type="checkbox"` に乗せる。** `role="switch"` を足すだけで、
 * 入ったかどうかの申告も鍵盤もフォームへの載り方もブラウザが持つ。
 *
 * ## チェックボックスと何が違うか
 *
 * **その場で効くもの**がスイッチである。チェックボックスは送信して初めて効く。
 * 見た目だけの違いではないので、部品を分けている。
 *
 * ## つまみは境界で識別する
 *
 * つまみは**入っているときアクセントの塗りの上に載り、切れているとき凹んだ面の上に載る。**
 * 地の色が両極なので、塗りだけでは片方で沈む。
 *
 * **境界が識別を担う**（決定6-9 と同じ考え方）。塗りではなく線で形を保つ。
 *
 * ## 状態を持たない
 *
 * 出し入れは `peer-checked:` で行う。**サーバ側で描けるし、
 * 素のフォームでも `register()` でもそのまま載る。**
 * ─────────────────────────────────────────────
 */
import type { InputHTMLAttributes, Ref } from 'react';
import { ring, stateOf } from '../internal/ring.ts';

export interface SwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  /**
   * 満たしていることを示す。**誤りとは別の仕組みで受け取る。**
   */
  valid?: boolean;
  ref?: Ref<HTMLInputElement>;
}

/**
 * スイッチ。**その場で効く入り切り。**
 *
 * ```tsx
 * <Field layout="inline" id="dark" label="暗い配色にする">
 *   <Switch name="dark" />
 * </Field>
 * ```
 *
 * ## チェックボックスとの違い
 *
 * **押した瞬間に効くもの**に使う。送信して初めて効くものはチェックボックスである。
 *
 * ## ラベルは Field が付ける
 *
 * 何の入り切りかは、スイッチ自身からは分からない。
 */
export function Switch({ valid, className, ...props }: SwitchProps) {
  const state = stateOf(valid, props['aria-invalid']);
  // 式の中で組み立てない。cva の呼び出しを補間の中へ直接置くと、
  // 静的解析の検査が読み切れずに落ちる
  const outer = `${ring({ state })} relative inline-flex h-4 w-8 shrink-0 rounded-full`;
  const off = props.disabled;
  return (
    <span data-sg-component="switch-frame" className={className ? `${outer} ${className}` : outer}>
      <input
        type="checkbox"
        role="switch"
        data-sg-component="switch"
        data-sg-surface="inset"
        className="peer size-full appearance-none rounded-full border-0 outline-none"
        {...props}
      />
      {/*
        入っているときの地。**塗りは宣言する**ので、`bg-*` では塗らない。
        押せないときは淡い塗りに落とす——`data-sg-fill` は宣言なので
        CSS では差し替えられないが、`disabled` は描くときに分かる。
      */}
      <span
        aria-hidden="true"
        data-sg-fill={off ? undefined : 'accent'}
        className={
          off
            ? 'pointer-events-none absolute inset-0 hidden rounded-full bg-accent-subtle peer-checked:block'
            : 'pointer-events-none absolute inset-0 hidden rounded-full peer-checked:block'
        }
      />
      {/*
        つまみ。**面を宣言して地を持ち、境界で形を保つ。**

        入っているとアクセントの塗りの上、切れていると凹んだ面の上に載る。
        地の色が両極なので、**塗りだけでは片方で沈む。**
      */}
      <span
        aria-hidden="true"
        data-sg-surface="page"
        className={
          'pointer-events-none absolute start-0 size-4 rounded-full border-1 border-border ' +
          'transition-transform duration-200 peer-checked:translate-x-4'
        }
      />
    </span>
  );
}
