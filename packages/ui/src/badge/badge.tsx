/*
 * ── 維持する側への覚書 ───────────────────────────────
 *
 * **色を1つも書かない。** 中立は面を宣言し、色付きは淡い塗りの対を使う。
 * どちらも背景と前景が対で決まるので、片方だけ残ることがない。
 *
 * **クラス名を組み立てない。** `bg-${tone}-subtle` のように書くと Tailwind が
 * 候補として読めず、CSS が1つも生成されない。エラーは出ない。
 * `compoundVariants` は冗長で正しい。
 *
 * **境界の役割は `border-border` である。** `border-{default}` は文字色を指す。
 *
 * **説明でクラス名に触れるときは `{}` で囲む。** 囲まないと Tailwind が候補として拾う。
 *
 * ## 押せるものではない
 *
 * hover も focus も持たない。押せるようにしたいなら Button を使う。
 * リンクにしたいときは `asChild` で `a` を渡す——**そのときの見た目は変わらない。**
 * ─────────────────────────────────────────────
 */
import { cva, type VariantProps } from 'class-variance-authority';
import type { HTMLAttributes, ReactNode, Ref } from 'react';
import { Slot } from '../internal/slot.tsx';

/** 中立のときに宣言する面。**1箇所だけに書く** */
const NEUTRAL_SURFACE = 'inset';

/**
 * 短い語を1つ載せる札。
 *
 * ## 色は宣言から来る
 *
 * 中立は**凹んだ面**を宣言する。色付きは**淡い塗り**を使う。
 * どちらも背景と文字が対で決まっているので、**背景だけを塗る道は無い。**
 *
 * ## 境界を持つ
 *
 * **凹んだ面の上に置くと、中立の札は背景と同化する。**
 * 面の段は凹んだところで底に着くので、その上に凹んだ面を宣言しても深くならない。
 *
 * 境界があれば、背景が同じでも札の輪郭が読める。
 *
 * ## 押せるものではない
 *
 * hover も focus も持たない。押せるようにしたいなら Button を使う。
 */
const badge = cva(
  'inline-flex w-fit items-center gap-1 rounded-full whitespace-nowrap border-1 border-border',
  {
    variants: {
      /**
       * どのランプで色を付けるか。**既定は中立。**
       *
       * 中立だけは淡い塗りを持たないので、凹んだ面を宣言して表す。
       */
      tone: { neutral: '', accent: '', danger: '', warning: '', success: '', info: '' },
      /**
       * 大きさ。**2段だけ持つ。**
       *
       * 小さい方は表の行や見出しの脇に、大きい方は本文と並べて使う。
       */
      size: { sm: 'px-2 text-caption', md: 'px-3 py-1 text-label' },
    },
    compoundVariants: [
      /*
       * **中立はここに現れない。** 面を宣言する（`data-sg-surface`）ので、
       * 背景も文字も属性が与える。色クラスを1つも書かない。
       *
       * 色付きは淡い塗りの対を書き下す。組み立てると Tailwind が読めない（上記）。
       */
      { tone: 'accent', class: 'bg-accent-subtle text-on-accent-subtle' },
      { tone: 'danger', class: 'bg-danger-subtle text-on-danger-subtle' },
      { tone: 'warning', class: 'bg-warning-subtle text-on-warning-subtle' },
      { tone: 'success', class: 'bg-success-subtle text-on-success-subtle' },
      { tone: 'info', class: 'bg-info-subtle text-on-info-subtle' },
    ],
    defaultVariants: { tone: 'neutral', size: 'md' },
  },
);

export interface BadgeProps
  extends Omit<HTMLAttributes<HTMLSpanElement>, 'color'>,
    VariantProps<typeof badge> {
  /**
   * 器を作らず、クラスと属性を子へ移す。**子は要素1つだけ。**
   *
   * リンクにしたいときに使う。**見た目は変わらない。**
   */
  asChild?: boolean;
  children?: ReactNode;
  ref?: Ref<HTMLElement>;
}

export function Badge({ tone, size, asChild = false, className, ...props }: BadgeProps) {
  // 式の中で組み立てない。cva の呼び出しを補間の中へ直接置くと、
  // 静的解析の検査が読み切れずに落ちる
  const classes = badge({ tone, size });
  const neutral = tone === undefined || tone === 'neutral';
  const shared = {
    // **自分が何であるかを名乗る。** 見た目は持たない
    'data-sg-component': 'badge',
    // **中立のときだけ面を宣言する。** 色付きは淡い塗りが背景と文字を対で持つ
    'data-sg-surface': neutral ? NEUTRAL_SURFACE : undefined,
    className: className ? `${classes} ${className}` : classes,
    ...props,
  };
  if (asChild) return <Slot {...shared} />;
  return <span {...(shared as HTMLAttributes<HTMLSpanElement>)} />;
}
