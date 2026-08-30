import { cva, type VariantProps } from 'class-variance-authority';
import type { ButtonHTMLAttributes } from 'react';

/**
 * 押せるもの。
 *
 * ## 押下（`:active`）は表現しない
 *
 * 決定5-13 は押下の表現を Phase 3 送りにした。**Phase 3 で観測を測ったら、
 * `:active` を使っている自作コードは4本とも0件だった。**
 * `roles.md` の `bg-active`（i p h）は**選択状態**の誤記録で、
 * pylabo は `bg-inset`、holosphere は淡い塗りで書いている——**どちらも既存の役割**である。
 *
 * **原則7 に従い持たない**（決定6-7）。
 *
 * ## 無効は面を沈めて表す
 *
 * 不透明度は持たない（決定1-15）。無効のときだけ **`inset` の面を宣言し、
 * 文字を `text-faint` にする。** 新しい役割を足していない。
 * 面の仕掛け（決定5-12）に乗るので、**どの variant でも同じ形で沈む。**
 *
 * ## クラス名は書き下す。組み立てない
 *
 * `bg-${tone}` のように**組み立てると Tailwind が候補として読めず、CSS が生成されない。**
 * しかも**エラーにならない**ので、色の付いていないボタンがそれらしく表示される（教訓4）。
 * 実際に一度そう書いて、`bg-accent` から `text-warning` まで1つも生成されなかった。
 *
 * **DRY より静的に読めることを優先する。** ここは冗長で正しい。
 *
 * ## className は連結するだけ
 *
 * `tailwind-merge` は入れていない（決定6-7）。**渡した class が消えないことは
 * テストで固定してある**が、同じ次元を上書きしたときにどちらが勝つかは
 * 生成 CSS の順序で決まる。**実需要が出てから決める**（原則7）。
 */
const button = cva(
  'inline-flex items-center justify-center gap-2 rounded-sm px-4 py-2 duration-200',
  {
    variants: {
      /**
       * 塗り方。**段はすべて既存の決定から来る。**
       * 塗りと `on-*` は決定5-14、hover の1段ずらしは決定5-15、淡い塗りは決定5-16。
       * **ここで新しい色は1つも決めていない。**
       */
      variant: { solid: '', subtle: '', outline: 'border-1 border-border', ghost: '' },
      /** どのランプで塗るか。**塗りを持つランプすべて**（決定5-15 改訂） */
      tone: { accent: '', danger: '', warning: '', success: '', info: '' },
      /**
       * 無効。**不透明度は使わない**（決定1-15）。
       * `inset` の面を宣言して沈め、文字を `text-faint` にする。
       */
      disabled: { true: 'text-faint', false: '' },
    },
    compoundVariants: [
      /*
       * variant × tone を**書き下す。** 組み立てると Tailwind が読めない（上記）。
       * 無効のときは塗りを載せない——**沈んだうえに塗りが残ると
       * 「押せそうに見えて押せない」になる。**
       */
      { variant: 'solid', tone: 'accent', disabled: false, class: 'bg-accent text-on-accent hover:bg-accent-strong' },
      { variant: 'solid', tone: 'danger', disabled: false, class: 'bg-danger text-on-danger hover:bg-danger-strong' },
      { variant: 'solid', tone: 'warning', disabled: false, class: 'bg-warning text-on-warning hover:bg-warning-strong' },
      { variant: 'solid', tone: 'success', disabled: false, class: 'bg-success text-on-success hover:bg-success-strong' },
      { variant: 'solid', tone: 'info', disabled: false, class: 'bg-info text-on-info hover:bg-info-strong' },

      { variant: 'subtle', tone: 'accent', disabled: false, class: 'bg-accent-subtle text-on-accent-subtle' },
      { variant: 'subtle', tone: 'danger', disabled: false, class: 'bg-danger-subtle text-on-danger-subtle' },
      { variant: 'subtle', tone: 'warning', disabled: false, class: 'bg-warning-subtle text-on-warning-subtle' },
      { variant: 'subtle', tone: 'success', disabled: false, class: 'bg-success-subtle text-on-success-subtle' },
      { variant: 'subtle', tone: 'info', disabled: false, class: 'bg-info-subtle text-on-info-subtle' },

      { variant: 'outline', tone: 'accent', disabled: false, class: 'text-accent' },
      { variant: 'outline', tone: 'danger', disabled: false, class: 'text-danger' },
      { variant: 'outline', tone: 'warning', disabled: false, class: 'text-warning' },
      { variant: 'outline', tone: 'success', disabled: false, class: 'text-success' },
      { variant: 'outline', tone: 'info', disabled: false, class: 'text-info' },

      { variant: 'ghost', tone: 'accent', disabled: false, class: 'text-accent' },
      { variant: 'ghost', tone: 'danger', disabled: false, class: 'text-danger' },
      { variant: 'ghost', tone: 'warning', disabled: false, class: 'text-warning' },
      { variant: 'ghost', tone: 'success', disabled: false, class: 'text-success' },
      { variant: 'ghost', tone: 'info', disabled: false, class: 'text-info' },
    ],
    defaultVariants: { variant: 'solid', tone: 'accent', disabled: false },
  },
);

export interface ButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'disabled'>,
    Omit<VariantProps<typeof button>, 'disabled'> {
  /**
   * 押せない状態。**不透明度では表さない**（決定1-15）。
   * 面を `inset` に宣言して沈め、文字を `text-faint` にする。
   */
  disabled?: boolean;
}

export function Button({ variant, tone, disabled = false, className, ...props }: ButtonProps) {
  const classes = button({ variant, tone, disabled });
  return (
    <button
      type="button"
      // **無効のときだけ面を宣言する。** 面の仕掛けが背景と前景を同時に沈める（決定5-12）
      data-sg-surface={disabled ? 'inset' : undefined}
      disabled={disabled}
      className={className ? `${classes} ${className}` : classes}
      {...props}
    />
  );
}
