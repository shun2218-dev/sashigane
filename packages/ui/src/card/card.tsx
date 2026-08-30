import { cva, type VariantProps } from 'class-variance-authority';
import type { HTMLAttributes } from 'react';

/**
 * 面を1つ作る器。
 *
 * ## 面は塗らずに宣言する
 *
 * 原則5 は「**面は `data-sg-surface` で宣言する。塗るだけの方法は用意しない**」と言っている。
 * 塗れてしまうと**前景がページ用のまま残り、コントラスト保証が崩れてもエラーにならない**
 * （決定5-12）。したがってこのコンポーネントは `bg-*` を1つも書かない。
 * 背景も文字色も境界色も、`data-sg-surface` が属性セレクタで与える。
 *
 * ## hover も塗らない
 *
 * `interactive` は `data-sg-interactive` を付けるだけである（決定5-13）。
 * 背景だけを1段深くすると前景が置き去りになるので、**塗る道は存在しない。**
 */
/**
 * **`border-{default}` ではない。** それは `--color-default`（文字色）を指す。
 * 境界の役割は `--color-border`（= `--sg-color-border-default`）で、
 * Tailwind のクラス名は `border-border` になる。
 *
 * 説明で名前を書くときは `{}` で囲む。囲まないと **Tailwind が候補として拾い、
 * 使っていない規則が生成 CSS に残る。**
 *
 * **どちらも生成されるので、検査は取り違えを捕まえない。**
 * 検査が見ているのは「クラスがトークンに解決すること」であって、
 * 「意図した役割を指していること」ではない（教訓4）。
 */
const card = cva('p-surface rounded-sm border-1 border-border', {
  variants: {
    /** 面の種類。`inset` は「凹んだ面」で別の役割なので持たない（決定5-13） */
    surface: {
      surface: '',
      overlay: '',
    },
    /**
     * 浮き。**既定は `none`。**
     * 観測した ichirizuka は影と角丸を使わない設計であり、
     * 「あった方が良さそう」で影を既定にしない（原則7）。
     * 暗色では影ではなく輪郭が出る（決定1-8 改訂）。
     */
    elevation: {
      none: '',
      raised: 'shadow-raised',
      overlay: 'shadow-overlay',
      front: 'shadow-front',
    },
  },
  defaultVariants: { surface: 'surface', elevation: 'none' },
});

export interface CardProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof card> {
  /**
   * hover 中だけ1段深い面の文脈にする（決定5-13）。
   * **背景だけを塗る道は用意していない。** 前景も一緒に切り替わる。
   */
  interactive?: boolean;
}

export function Card({
  surface = 'surface',
  elevation,
  interactive = false,
  className,
  ...props
}: CardProps) {
  // **式の中で組み立てない。** cva の呼び出しを補間の中に直接置くと、
  // 補間の中に入れ子の閉じ括弧が入り、check:token-usage の検出器が読み切れずに落ちる。
  // ここで受けておけば補間が単純になり、読み手にも1行が短くなる
  const classes = card({ surface, elevation });
  return (
    <div
      data-sg-surface={surface ?? 'surface'}
      data-sg-interactive={interactive ? '' : undefined}
      className={className ? `${classes} ${className}` : classes}
      {...props}
    />
  );
}
