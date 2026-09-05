/*
 * ── 維持する側への覚書 ───────────────────────────────
 *
 * **見た目は Input と同じものを使う。** 別に書くと、片方だけ直したときにずれる。
 * 枠（`frame`）も中身（`control`）も Input から借りている。
 *
 * 高さだけが違う。**行数は利用側が決める**（`rows`）——
 * 何行が適切かは中身の事情であって、システムの事情ではない。
 * ─────────────────────────────────────────────
 */
import type { Ref, TextareaHTMLAttributes } from 'react';
import { control, frameClass } from '../input/input.tsx';
import { stateOf } from '../internal/ring.ts';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  /**
   * 満たしていることを示す。**誤りとは別の仕組みで受け取る。**
   *
   * 誤りには `aria-invalid` という標準の属性があるが、
   * **満たしていることを表す属性は無い**ので、props で受け取るしかない。
   */
  valid?: boolean;
  ref?: Ref<HTMLTextAreaElement>;
}

/**
 * 複数行の入力欄。
 *
 * ## 見た目は1行の入力欄と同じ
 *
 * 違うのは高さだけである。**行数は利用側が決める**——
 * 何行が適切かは中身の事情であって、システムの事情ではない。
 */
export function Textarea({ valid, className, ...props }: TextareaProps) {
  const state = stateOf(valid, props['aria-invalid']);
  const outer = frameClass(state);
  // 式の中で組み立てない。cva の呼び出しを補間の中へ直接置くと、
  // 静的解析の検査が読み切れずに落ちる
  const inner = `${control({ state })} min-h-24`;
  return (
    <div
      data-sg-component="textarea-frame"
      className={className ? `${outer} ${className}` : outer}
    >
      <textarea
        data-sg-component="textarea"
        data-sg-surface="inset"
        className={inner}
        {...props}
      />
    </div>
  );
}
