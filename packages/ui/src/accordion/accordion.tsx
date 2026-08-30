/*
 * ── 維持する側への覚書 ───────────────────────────────
 *
 * **素の `details` / `summary` に乗っている。** 開閉も鍵盤も読み上げも、
 * ブラウザが既に持っている。`aria-expanded` を自分で書かない——
 * 書くと、ブラウザの申告と二重になる。
 *
 * **一度に1つだけ開く形も、素の仕組みで解ける**（`details` の `name`）。
 * 状態を持たないので、hooks も文脈も要らない。
 *
 * **名前は利用側が渡す。** 器が作って配る形も試したが、
 * 安定した名前を作るには `useId` が要り、**器がクライアント側の部品になる。**
 * いまの部品はどれもサーバ側で描けるので、そこを崩さない。
 *
 * **印は `flex` が消す。** `summary` の既定の三角は `display: list-item` に付くので、
 * `flex` にすると出なくなる。`list-none` も置いてあるが、
 * **Safari は `list-style` では消えない**——効いているのは `flex` の方である。
 * `::-webkit-details-marker` を狙う道は任意値記法なので使えない。
 *
 * **境界の役割は `border-border` である。** `border-{default}` は文字色を指す。
 * ─────────────────────────────────────────────
 */
import type { HTMLAttributes, ReactNode, Ref } from 'react';
import { IconChevronDown } from '../icon/icon.tsx';

/**
 * 折りたたみの器。
 *
 * ## 状態を持たない
 *
 * 開閉はブラウザが持つ。**こちらは何も覚えない。**
 * 一度に1つだけ開く形も、`details` の `name` で解ける。
 *
 * ## 中身は開くまで描かれる
 *
 * `details` は閉じていても中身を持つ。**検索で見つかり、印刷にも出る。**
 * 描かないようにしたいなら、利用側が中身の側で決める。
 */
export interface AccordionProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
  ref?: Ref<HTMLDivElement>;
}

/**
 * 折りたたみを並べる器。**並べ方だけを持つ。**
 *
 * 一度に1つだけ開きたいときは、**升に同じ `name` を渡す**——
 * 器が作って配る形にはしていない（上の覚書）。
 */
export function Accordion({ className, ...props }: AccordionProps) {
  const classes = 'flex flex-col';
  return (
    <div
      data-sg-component="accordion"
      className={className ? `${classes} ${className}` : classes}
      {...props}
    />
  );
}

export interface AccordionItemProps extends HTMLAttributes<HTMLDetailsElement> {
  /**
   * 開いた状態で描く。**その後の開閉はブラウザが持つ。**
   */
  defaultOpen?: boolean;
  /**
   * 一度に1つだけ開く並びの名前。
   *
   * **同じ名前を持つものは、一度に1つしか開かない。** ブラウザが面倒を見るので、
   * こちらは状態を持たない。
   */
  name?: string;
  children?: ReactNode;
  ref?: Ref<HTMLDetailsElement>;
}

export function AccordionItem({ defaultOpen, className, ...props }: AccordionItemProps) {
  const classes = 'group border-b-1 border-border';
  return (
    <details
      data-sg-component="accordion-item"
      open={defaultOpen}
      className={className ? `${classes} ${className}` : classes}
      {...props}
    />
  );
}

export interface AccordionTriggerProps extends HTMLAttributes<HTMLElement> {
  children?: ReactNode;
  ref?: Ref<HTMLElement>;
}

/**
 * 開閉の取っ手。**`summary` である。**
 *
 * `aria-expanded` を書かない。ブラウザが既に申告しており、
 * **書くと二重になる。**
 */
export function AccordionTrigger({ className, children, ...props }: AccordionTriggerProps) {
  // `flex` が既定の三角を消す。`list-none` だけでは Safari で残る
  const classes =
    'flex cursor-pointer list-none items-center justify-between gap-2 py-3 text-left';
  return (
    <summary
      data-sg-component="accordion-trigger"
      className={className ? `${classes} ${className}` : classes}
      {...props}
    >
      {children}
      <IconChevronDown className="transition-transform duration-200 group-open:rotate-180" />
    </summary>
  );
}

export interface AccordionContentProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
  ref?: Ref<HTMLDivElement>;
}

/** 開いたときに見える中身。 */
export function AccordionContent({ className, ...props }: AccordionContentProps) {
  const classes = 'pb-3';
  return (
    <div
      data-sg-component="accordion-content"
      className={className ? `${classes} ${className}` : classes}
      {...props}
    />
  );
}
