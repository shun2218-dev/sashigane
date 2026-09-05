'use client';

/*
 * ── 維持する側への覚書 ───────────────────────────────
 *
 * **依存は持たない。** 要るのは `nav` と `ol` と、順番を数えることだけである。
 *
 * ## `'use client'` が要る理由と、その代償
 *
 * 末尾を子へ伝えるのに文脈（`createContext`）を使っている。
 * **文脈はサーバコンポーネントでは作れない**ので、この木は client になる。
 *
 * **押すところが1つも無い部品に JS を配ることになる。** 代償は分かったうえで選んだ。
 * 逃げ道は2つあり、どちらも取らなかった。
 *
 *   `cloneElement` で末尾に属性を差し込む —— `asChild` を持つ部品が
 *   自前で要素を複製すると、移し方が2つになる。検査が塞いでいる
 *
 *   利用側に `current` を書かせる —— 道筋を組み替えたときに付け替え忘れる。
 *   見た目には出ないので、そのまま残る
 *
 * ## 区切りは器が入れる
 *
 * 利用側に `<BreadcrumbSeparator />` を書かせる形にすると、
 * **`aria-hidden` を付け忘れられる。** 忘れても見た目は変わらないので、
 * 読み上げが「スラッシュ」を項目の数だけ読む状態が黙って残る。
 *
 * **忘れられる道を作らない。** 器が `Children.toArray` で数え、あいだに入れる。
 * `ol` の子は `li` しか置けないので、**区切りも `li` で包む。**
 *
 * ## 末尾が「いま居る場所」である
 *
 * パンくずの形がそう決めているので、利用側に `current` を書かせない。
 * 器が末尾を知り、文脈で子へ渡す。
 *
 * **`cloneElement` で属性を差し込まない。** 子が `BreadcrumbItem` とは限らず
 * （包んだものが来うる）、差し込み先を器が決められない。
 *
 * ## 畳まない
 *
 * 長いときは折り返す。省略（`…`）を持つと、**どれを畳むかを器が決める**ことになり、
 * 畳んだ先を開く仕掛けまで要る。畳む必要が実際に出てから考える。
 * ─────────────────────────────────────────────
 */
import { Children, createContext, useContext } from 'react';
import type { AnchorHTMLAttributes, HTMLAttributes, ReactNode, Ref } from 'react';
import { Slot } from '../internal/slot.tsx';

/** 末尾かどうか。**器だけが知っている** */
const LastCtx = createContext(false);

export interface BreadcrumbProps extends Omit<HTMLAttributes<HTMLElement>, 'children'> {
  /**
   * この道筋の名前。**同じ画面に2つ置いたとき、読み上げが区別できるようにする。**
   *
   * 既定は「現在地」。
   */
  label?: string;
  /**
   * 項目のあいだに置く形。**読み上げには出ない。**
   *
   * 既定は `/`。
   */
  separator?: ReactNode;
  children?: ReactNode;
  ref?: Ref<HTMLElement>;
}

/**
 * パンくずリスト。**いま居る場所と、そこへ至る道を示す。**
 *
 * ```tsx
 * <Breadcrumb>
 *   <BreadcrumbItem href="/">ホーム</BreadcrumbItem>
 *   <BreadcrumbItem href="/docs">ドキュメント</BreadcrumbItem>
 *   <BreadcrumbItem>はじめに</BreadcrumbItem>
 * </Breadcrumb>
 * ```
 *
 * ## 区切りは書かない
 *
 * 器が項目のあいだに入れる。**読み上げには出ない。**
 *
 * ## 末尾がいま居る場所になる
 *
 * `aria-current="page"` は器が付ける。**書き忘れる余地を残さない。**
 *
 * ## 長いときは折り返す
 *
 * 畳まない。**どれを畳むかは、道筋を作った側にしか決められない。**
 */
export function Breadcrumb({
  label = '現在地',
  separator = '/',
  className,
  children,
  ...props
}: BreadcrumbProps) {
  // 文字列や null を落とし、**項目だけを数える**
  const items = Children.toArray(children).filter((c) => c !== null && c !== undefined);
  const last = items.length - 1;

  const classes = 'text-body';
  return (
    <nav
      // **自分が何であるかを名乗る。** 見た目は持たない
      data-sg-component="breadcrumb"
      aria-label={label}
      className={className ? `${classes} ${className}` : classes}
      {...props}
    >
      <ol className="flex flex-wrap items-center gap-2">
        {items.map((child, i) => (
          // 並びは描いた順に固定である。**入れ替わりも差し込みも起きない**
          // biome-ignore lint/suspicious/noArrayIndexKey: 並びは固定
          <LastCtx.Provider key={i} value={i === last}>
            {i > 0 ? (
              <li
                data-sg-component="breadcrumb-separator"
                // **読み上げに出さない。** 出すと項目の数だけ記号が読まれる
                aria-hidden="true"
                className="text-muted"
              >
                {separator}
              </li>
            ) : null}
            {child}
          </LastCtx.Provider>
        ))}
      </ol>
    </nav>
  );
}

export interface BreadcrumbItemProps
  extends Omit<AnchorHTMLAttributes<HTMLElement>, 'aria-current'> {
  /**
   * 行き先。**渡さなければ文字だけになる。**
   *
   * 末尾（いま居る場所）は渡さないのが普通だが、渡してもよい——
   * その場合もリンクのまま `aria-current="page"` が付く。
   */
  href?: string;
  /**
   * 枠を作らず、子をそのまま使う。
   *
   * `Link` のような**自前のリンク**に差し替えるときに使う。
   * `aria-current` と名乗りは子へ移る。
   */
  asChild?: boolean;
  children?: ReactNode;
  ref?: Ref<HTMLElement>;
}

/**
 * 道筋の1つ。
 *
 * **末尾かどうかは自分で決めない。** 器が知っていて、文脈で届く。
 *
 * `href` があればリンクになり、無ければ文字だけになる。
 */
export function BreadcrumbItem({
  href,
  asChild = false,
  className,
  children,
  ...props
}: BreadcrumbItemProps) {
  const last = useContext(LastCtx);
  /*
    **末尾だけが「いま居る場所」である。** 付けるのはここ1箇所——
    利用側に書かせると、道筋を組み替えたときに付け替え忘れる。
  */
  const current = last ? ('page' as const) : undefined;

  // 式の中で組み立てない。cva や条件を補間の中へ直接置くと、
  // 静的解析の検査が読み切れずに落ちる
  const linkClasses = 'text-muted underline-offset-2 hover:text-default hover:underline';
  const textClasses = 'text-default';
  const base = last ? textClasses : linkClasses;
  const classes = className ? `${base} ${className}` : base;

  const shared = {
    'data-sg-component': 'breadcrumb-item',
    'aria-current': current,
    className: classes,
    ...props,
  };

  /*
    **`asChild` 以外の枝だけ型を緩める。** props を分解した時点で `ref` の型が
    `Ref<HTMLElement>`（`asChild` 側で受ける型）に広がる。
    この枝は `asChild` が false なので、実際に届くのは `a` か `span` である。
  */
  const loose = shared as HTMLAttributes<HTMLElement>;
  const inner = asChild ? (
    <Slot {...shared}>{children}</Slot>
  ) : href ? (
    <a {...(loose as AnchorHTMLAttributes<HTMLAnchorElement>)} href={href}>
      {children}
    </a>
  ) : (
    <span {...(loose as HTMLAttributes<HTMLSpanElement>)}>{children}</span>
  );

  // **`li` は器が要求する。** `ol` の子は `li` しか置けない
  return <li className="flex items-center">{inner}</li>;
}
