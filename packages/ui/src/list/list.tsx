/*
 * ── 維持する側への覚書 ───────────────────────────────
 *
 * **`divide-*` の色は使えない。** 生成されない——
 * 色は `@utility` で1つずつ出しており、`divide-*` は列挙に入っていない。
 * **検査は捕まえない**（素の Tailwind でも生成されないので差に出ない）。
 * 実際に生成 CSS を grep して確かめてから、境界を項目の側に置いた。
 *
 * **境界の役割は `border-border` である。** `border-{default}` は文字色を指す。
 * 境界は色だけで測らない——幅 0 の境界にも色が付く。
 *
 * **説明でクラス名に触れるときは `{}` で囲む。**
 * ─────────────────────────────────────────────
 */
import { cva, type VariantProps } from 'class-variance-authority';
import type { HTMLAttributes, LiHTMLAttributes, Ref } from 'react';

/**
 * 並んだものの枠。
 *
 * ## 行頭の記号は既定で出さない
 *
 * 素の `ul` の点や数字は初期化で消える。**戻すのは選んだときだけ**にしてある——
 * 並べたものが文章とは限らないためである（ラベルの一覧、設定の行）。
 *
 * ## 区切り線は項目が持つ
 *
 * 枠ではなく項目が持つ。**最初の項目だけ線を持たない**ので、上端に線が残らない。
 */
const list = cva('flex flex-col', {
  variants: {
    /**
     * 行頭の記号。**既定は出さない。**
     *
     * `bullet` と `number` は文章の並びに使う。`number` は `ordered` と対で使う——
     * **見た目だけ数字にしても、読み上げは順序を知らない。**
     */
    marker: { none: 'list-none', bullet: 'list-disc ps-4', number: 'list-decimal ps-4' },
    /** 項目の間隔。**線で区切るときは詰める**——線が間隔を担うため */
    gap: { none: 'gap-0', sm: 'gap-1', md: 'gap-2' },
  },
  defaultVariants: { marker: 'none', gap: 'md' },
});

export interface ListProps
  extends Omit<HTMLAttributes<HTMLUListElement>, 'children'>,
    VariantProps<typeof list> {
  /**
   * 項目の間を線で区切るか。**設定の行や一覧で使う。**
   *
   * 線が間隔を担うので、選ぶと項目の間隔は詰まる。
   */
  separated?: boolean;
  /**
   * 順序のある並びにするか。**`ol` になる。**
   *
   * 見た目ではなく意味である——読み上げが順序を伝えられるようになる。
   */
  ordered?: boolean;
  children?: React.ReactNode;
  ref?: Ref<HTMLUListElement | HTMLOListElement>;
}

export function List({ ordered = false, marker, separated, gap, className, ...props }: ListProps) {
  // 式の中で組み立てない。cva の呼び出しを補間の中へ直接置くと、
  // 静的解析の検査が読み切れずに落ちる
  const classes = list({ marker, gap: separated ? 'none' : gap });
  const shared = {
    'data-sg-component': 'list',
    className: className ? `${classes} ${className}` : classes,
    ...props,
  };
  if (ordered) return <ol {...(shared as HTMLAttributes<HTMLOListElement>)} />;
  return <ul {...(shared as HTMLAttributes<HTMLUListElement>)} />;
}

const item = cva('marker:text-muted', {
  variants: {
    /**
     * 上辺に線を持つか。**枠が区切ると決めたときだけ。**
     *
     * 最初の項目は持たない——**上端に線が残ると、枠の枠に見える。**
     */
    separated: { true: 'border-t-1 border-border first:border-t-0 py-2', false: '' },
  },
  defaultVariants: { separated: false },
});

export interface ListItemProps extends LiHTMLAttributes<HTMLLIElement> {
  /**
   * 上辺に線を持つ。**枠の `separated` に合わせる。**
   *
   * 枠から自動では降りてこない——`li` は枠の直下とは限らず、
   * **間に何かを挟んだときに静かにずれる**ためである。
   */
  separated?: boolean;
  ref?: Ref<HTMLLIElement>;
}

export function ListItem({ separated, className, ...props }: ListItemProps) {
  const classes = item({ separated });
  return (
    <li
      data-sg-component="list-item"
      className={className ? `${classes} ${className}` : classes}
      {...props}
    />
  );
}
