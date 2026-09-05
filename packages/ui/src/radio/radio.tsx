/*
 * ── 維持する側への覚書 ───────────────────────────────
 *
 * **素の `input type="radio"` に乗せる。** 見た目だけを差し替える。
 * 同じ `name` の中で1つだけ選べること、矢印キーで移れること、
 * フォームに載ることは、どれもブラウザが持っている。
 *
 * ## 印は「宣言した塗り」の点で出す
 *
 * チェックボックスと違い、**塗るのは箱全体ではなく中の点**である。
 * 外側の輪は線のままにしておかないと、選ばれていない側と形が変わって見える。
 *
 * ## 輪 16 に対して点 8
 *
 * **輪と点の比は 0.5 である。** 24 の輪に 8 の点を置いていた時期があり、
 * 比 0.33 で**輪の中が空いて見えた。**
 *
 * 中間の大きさは無い——`spacing` に 20px の段が無いので、輪は 16 か 24 しか取れない。
 * チェックボックスと揃えて 16 にしている。
 *
 * 出し入れは `peer-checked:` で、**状態を持たない**（checkbox.tsx の覚書）。
 * ─────────────────────────────────────────────
 */
import type { InputHTMLAttributes, Ref } from 'react';
import { ring, stateOf } from '../internal/ring.ts';

export interface RadioProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  /**
   * 満たしていることを示す。**誤りとは別の仕組みで受け取る。**
   *
   * 群れに対して付けるものなので、**普通は RadioGroup 側に書く。**
   */
  valid?: boolean;
  ref?: Ref<HTMLInputElement>;
}

/**
 * ラジオ。**同じ `name` を渡したものの中で1つだけ選べる。**
 *
 * ## 群れの札は RadioGroup が持つ
 *
 * 1つずつの札は Field が付け、**群れ全体の札は RadioGroup** が付ける。
 * 群れの札が無いと、読み上げは「何についての選択なのか」を言えない。
 *
 * ```tsx
 * <RadioGroup id="plan" label="プラン">
 *   <Field layout="inline" id="plan-a" label="ふつう">
 *     <Radio name="plan" value="a" />
 *   </Field>
 * </RadioGroup>
 * ```
 *
 * ## `name` は利用側が渡す
 *
 * 群れから配っていない。**配るには文脈（context）が要り、
 * この部品がクライアント側になる。** いまはどの部品もサーバ側で描ける。
 */
export function Radio({ valid, className, ...props }: RadioProps) {
  const state = stateOf(valid, props['aria-invalid']);
  // 式の中で組み立てない。cva の呼び出しを補間の中へ直接置くと、
  // 静的解析の検査が読み切れずに落ちる
  const outer = `${ring({ state })} relative inline-flex size-4 shrink-0 rounded-full`;
  const off = props.disabled;
  return (
    <span data-sg-component="radio-frame" className={className ? `${outer} ${className}` : outer}>
      <input
        type="radio"
        data-sg-component="radio"
        data-sg-surface="inset"
        className="peer size-full appearance-none rounded-full border-0 outline-none"
        {...props}
      />
      {/* 選ばれた印。**読み上げには出さない**——選ばれているかは `input` が伝える */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 hidden items-center justify-center peer-checked:flex"
      >
        <span
          data-sg-fill={off ? undefined : 'accent'}
          className={off ? 'size-2 rounded-full bg-accent-subtle' : 'size-2 rounded-full'}
        />
      </span>
    </span>
  );
}
