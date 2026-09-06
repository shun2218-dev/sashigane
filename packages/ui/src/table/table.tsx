/*
 * ── 維持する側への覚書 ───────────────────────────────
 *
 * **横スクロールする枠を、利用側に書かせない。** 表は列が増えると必ず横にはみ出す。
 * `Table` がその枠を持つので、**利用側が書き忘れることが起きない。**
 *
 * **境界の役割は `border-border` である。** `border-{default}` は文字色を指す。
 * 境界は色だけで測らない——幅 0 の境界にも色が付く。
 *
 * **`thead` と `tbody` は包まない。** 当てるものが無いので、
 * 枠だけのコンポーネントになる。中身の無いコンポーネントは置かない。
 *
 * **説明でクラス名に触れるときは `{}` で囲む。**
 * ─────────────────────────────────────────────
 */
import type { HTMLAttributes, ReactNode, Ref, TdHTMLAttributes, ThHTMLAttributes } from 'react';

/**
 * 表。**横にはみ出したときは、表の中だけがスクロールする。**
 *
 * 横スクロールする枠は `Table` が持つ。列が増えると表は必ずはみ出すので、
 * **利用側に書かせると、書き忘れたときにページ全体がスクロールする。**
 *
 * ## `thead` と `tbody` は素のまま書く
 *
 * どちらにも当てるものが無い。**中身の無いコンポーネントは置かない。**
 */
export interface TableProps extends HTMLAttributes<HTMLTableElement> {
  /** 外側の枠ではなく、表そのものに付く */
  className?: string;
  children?: ReactNode;
  ref?: Ref<HTMLTableElement>;
}

export function Table({ className, children, ...props }: TableProps) {
  const classes = 'w-full border-collapse text-body';
  return (
    // **ここが横に動く。** 表そのものではなく枠が動くので、ページは動かない
    <div className="w-full overflow-x-auto">
      <table
        // **自分が何であるかを示す。** 見た目は持たない
        data-sg-component="table"
        className={className ? `${classes} ${className}` : classes}
        {...props}
      >
        {children}
      </table>
    </div>
  );
}

/** 行。**下辺に線を持つ。** 行の区切りは線で表す */
export interface TableRowProps extends HTMLAttributes<HTMLTableRowElement> {
  ref?: Ref<HTMLTableRowElement>;
}

export function TableRow({ className, ...props }: TableRowProps) {
  const classes = 'border-b-1 border-border';
  return (
    <tr
      data-sg-component="table-row"
      className={className ? `${classes} ${className}` : classes}
      {...props}
    />
  );
}

/** 数字の列かどうか。**桁を揃えるので、右に寄せて等幅にする** */
const cellClasses = (numeric: boolean) =>
  `px-3 py-2 ${numeric ? 'text-right font-numeric' : 'text-left'}`;

export interface TableCellProps extends TdHTMLAttributes<HTMLTableCellElement> {
  /**
   * 数字の列。**右に寄せ、桁の幅を揃える。**
   *
   * 揃えないと、上下の行で桁の位置がずれて読み比べられない。
   */
  numeric?: boolean;
  ref?: Ref<HTMLTableCellElement>;
}

export function TableCell({ numeric = false, className, ...props }: TableCellProps) {
  const classes = cellClasses(numeric);
  return (
    <td
      data-sg-component="table-cell"
      className={className ? `${classes} ${className}` : classes}
      {...props}
    />
  );
}

export interface TableHeaderCellProps extends ThHTMLAttributes<HTMLTableCellElement> {
  /** 数字の列。中身の見出しも同じ側へ寄せる */
  numeric?: boolean;
  ref?: Ref<HTMLTableCellElement>;
}

/**
 * 見出しの項目。**既定で列の見出しとして申告する。**
 *
 * 行の見出しにするときは `scope="row"` を渡す。
 * 申告しないと、読み上げが**どの項目がどの見出しに属するかを言えない。**
 */
export function TableHeaderCell({
  numeric = false,
  scope = 'col',
  className,
  ...props
}: TableHeaderCellProps) {
  const classes = `${cellClasses(numeric)} text-label font-heading`;
  return (
    <th
      data-sg-component="table-header-cell"
      scope={scope}
      className={className ? `${classes} ${className}` : classes}
      {...props}
    />
  );
}
