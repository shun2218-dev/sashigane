/**
 * ブランドのマーク。**形の定義は [lib/mark.ts](../lib/mark.ts) が持つ。**
 *
 * 色を持たない。`currentColor` で塗るので、置いた場所の文字色を継承する。
 * ナビに置けば `--sg-color-accent` になり、**明暗の切り替えに自動で追随する。**
 */
import { MARK_PATH, ROTATION, VIEW_BOX } from '../lib/mark';

export function Mark({ size = 24, title }: { size?: number; title?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox={VIEW_BOX}
      fill="currentColor"
      fillRule="evenodd"
      role={title ? 'img' : 'presentation'}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <path d={MARK_PATH} />
      <path d={MARK_PATH} transform={ROTATION} />
    </svg>
  );
}
