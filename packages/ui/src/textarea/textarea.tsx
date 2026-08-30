/*
 * ── 維持する側への覚書 ───────────────────────────────
 *
 * **見た目は Input と同じものを使う。** 別に書くと、片方だけ直したときにずれる。
 *
 * 高さだけが違う。**行数は利用側が決める**（`rows`）——
 * 何行が適切かは中身の事情であって、システムの事情ではない。
 * ─────────────────────────────────────────────
 */
import type { Ref, TextareaHTMLAttributes } from 'react';
import { controlClasses } from '../input/input.tsx';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  ref?: Ref<HTMLTextAreaElement>;
}

/**
 * 多行の入力欄。
 *
 * ## 見た目は1行の入力欄と同じ
 *
 * 違うのは高さだけである。**行数は利用側が決める**——
 * 何行が適切かは中身の事情であって、システムの事情ではない。
 */
export function Textarea({ className, ...props }: TextareaProps) {
  const classes = `${controlClasses} min-h-24`;
  return (
    <textarea
      data-sg-component="textarea"
      data-sg-surface="inset"
      className={className ? `${classes} ${className}` : classes}
      {...props}
    />
  );
}
