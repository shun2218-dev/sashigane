/*
 * ── 維持する側への覚書 ───────────────────────────────
 *
 * **境界の役割は `border-border` である。** `border-{default}` は文字色を指す。
 * どちらも生成されるので、検査は取り違えを捕まえない。
 *
 * **境界は色だけで測らない。** preflight が `border: 0 solid` を当てるので、
 * 幅 0 の境界にも色が付く。色だけを見るテストは、線を消しても通る。
 *
 * ## `hr` を使わない
 *
 * 縦の区切りに `hr` は意味が合わない。**向きで要素が変わる形にしない。**
 * 読み上げへの意味は `role` で与える。
 * ─────────────────────────────────────────────
 */
import { cva, type VariantProps } from 'class-variance-authority';
import type { HTMLAttributes, Ref } from 'react';

/**
 * 区切りの線。
 *
 * ## 飾りが既定である
 *
 * 多くの区切りは**見た目のためだけ**にある。
 * 読み上げに出すと「区切り 区切り」と数えられるだけで、意味が増えない。
 *
 * 意味のある区切り（話題が変わる、群が変わる）のときだけ `decorative={false}` にする。
 *
 * ## 太さは1段だけ
 *
 * 罫線の太さは1つしか持たない。**太い区切りは面の切り替えで表す。**
 */
const separator = cva('shrink-0 border-border', {
  variants: {
    /**
     * 向き。**横向きが既定。**
     *
     * 縦向きは親の高さに広がる。**親が高さを持たないと見えない。**
     */
    orientation: {
      horizontal: 'w-full border-t-1',
      vertical: 'self-stretch border-l-1',
    },
  },
  defaultVariants: { orientation: 'horizontal' },
});

export interface SeparatorProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'role'>,
    VariantProps<typeof separator> {
  /**
   * 見た目のためだけの区切りかどうか。**既定は飾り。**
   *
   * 飾りは読み上げに出さない。意味のある区切りのときだけ `false` にする。
   */
  decorative?: boolean;
  ref?: Ref<HTMLDivElement>;
}

export function Separator({
  orientation,
  decorative = true,
  className,
  ...props
}: SeparatorProps) {
  // 式の中で組み立てない。cva の呼び出しを補間の中へ直接置くと、
  // 静的解析の検査が読み切れずに落ちる
  const classes = separator({ orientation });
  return (
    <div
      // **飾りは読み上げに出さない。** 出すと「区切り」が数えられるだけで意味が増えない
      role={decorative ? 'none' : 'separator'}
      // 横向きは既定なので書かない。**縦向きだけが申告に値する**
      aria-orientation={!decorative && orientation === 'vertical' ? 'vertical' : undefined}
      className={className ? `${classes} ${className}` : classes}
      {...props}
    />
  );
}
