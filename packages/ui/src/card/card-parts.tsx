/*
 * ── 維持する側への覚書 ───────────────────────────────
 *
 * カードの中のセクション。**面も色も持たない。** 枠（card.tsx）が面を宣言し、
 * ここは並べ方と文字の役割だけを持つ。
 *
 * **境界の役割は `border-border` である。** `border-{default}` は文字色を指す。
 * どちらも生成されるので、検査は取り違えを捕まえない。
 *
 * **説明でクラス名に触れるときは `{}` で囲む。** 囲まないと Tailwind が候補として拾い、
 * 使っていない規則が生成 CSS に残る。
 *
 * ## 見出しの深さは決め打ちできない
 *
 * カードがページのどこに置かれるかで正しい見出しの深さは変わる。
 * 既定を1つ持ちつつ `asChild` で差し替えられる形にしてある。
 *
 * ## 本文のセクションは持たない
 *
 * 一度 `CardBody` を置いたが、**クラスを1つも持たない `div` だった。**
 * 置いた理由は「セクションを明示するため」だったが、それは検査できない——
 * 書かなくても崩れず、書いても何も起きない。
 *
 * 本文は枠の直下に置く。枠が縦に並べて間を空けるので、それで足りる。
 * ─────────────────────────────────────────────
 */
import type { HTMLAttributes, ReactNode, Ref } from 'react';
import { Slot } from '../internal/slot.tsx';

interface PartProps extends HTMLAttributes<HTMLElement> {
  /**
   * 枠を作らず、クラスと属性を子へ移す。**子は要素1つだけ。**
   *
   * 見出しの深さを変えるときや、セクションに別の要素を使いたいときに指定する。
   */
  asChild?: boolean;
  children?: ReactNode;
  ref?: Ref<HTMLElement>;
}

/**
 * セクションを1つ作る。**同じ形が4つあるので、ここ1箇所で組み立てる。**
 *
 * `name` は**自分が何であるかを名乗る**ためのもので、見た目は持たない。
 * `asChild` のときは子へ移るので、**差し替えても名乗りは残る。**
 */
const part =
  (Tag: 'div' | 'h3' | 'p', name: string, base: string) =>
  ({ asChild = false, className, ...props }: PartProps) => {
    const shared = {
      'data-sg-component': name,
      className: className ? `${base} ${className}` : base,
      ...props,
    };
    if (asChild) return <Slot {...shared} />;
    return <Tag {...(shared as HTMLAttributes<HTMLElement>)} />;
  };

/**
 * 見出しのセクション。**見出しと補足をまとめる。**
 *
 * 見出しの行に操作を並べたい場合は、この中に置く。
 */
export const CardHeader = part('div', 'card-header', 'flex flex-col gap-1');

/**
 * 見出し。**既定は `h3`。**
 *
 * カードがページのどこに置かれるかで正しい深さは変わるので、
 * `asChild` で差し替えられる。
 *
 * ```tsx
 * <CardTitle asChild>
 *   <h2>ページ直下に置くとき</h2>
 * </CardTitle>
 * ```
 */
export const CardTitle = part('h3', 'card-title', 'text-heading-3 font-heading');

/** 見出しの補足。**淡い文字で1行から数行** */
export const CardDescription = part('p', 'card-description', 'text-body text-muted');

/**
 * 操作を並べるセクション。
 *
 * **下端に寄る。** 高さの揃った並びに置いたとき、カードごとに
 * 本文の長さが違っても操作の位置が揃う。
 */
export const CardFooter = part('div', 'card-footer', 'mt-auto flex items-center gap-2');

export type { PartProps as CardPartProps };
