'use client';

/*
 * ── 維持する側への覚書 ───────────────────────────────
 *
 * **その場に残る知らせ。** 出て消えるものは Toast である。
 *
 * `'use client'` が要るのは `useId` を使うためである。
 * 見出しと本文の結びつけに安定した名前が要り、**利用側に書かせると
 * 書き忘れられる**——忘れても見た目は変わらない。
 *
 * ## 色を1つも書かない
 *
 * 中立は面を宣言し、色付きは淡い塗りの対を使う。Badge と同じ規則である。
 * **どちらも背景と前景が対で決まる**ので、片方だけ残ることがない。
 *
 * **クラス名を組み立てない。** `bg-${tone}-subtle` と書くと Tailwind が
 * 候補として読めず、CSS が1つも生成されない。エラーは出ない。
 *
 * ## ランプは意味を運ばない
 *
 * 色の違いだけで「これは失敗だ」とは伝わらない。**意味は文言が持つ。**
 * ランプごとの既定の図案を持たないのはそのためで、
 * 持つと「色と図案があるから文言は短くてよい」という方向へ倒れる。
 *
 * ## 読み上げの領域は既定で作らない
 *
 * その場に最初からあるものは文書の順に読まれる。領域にすると二重になる。
 * **後から出したときだけ `live` を渡す。**
 *
 * ## 閉じる釦に Button を使わない
 *
 * **色の保証が届かない。** 淡い塗りの上で読めることが保証されているのは
 * `on-{ランプ}-subtle` だけである。実測（暗色）はこうなっている。
 *
 * |    | on-{ランプ}-subtle | ghost の既定（accent） | ランプを揃えた場合 |
 * |---|---|---|---|
 * | 最小 | 5.78 | 4.32 | **3.95** |
 * | 最大 | 6.42 | 4.58 | 4.57 |
 *
 * Button は `ghost` でも `text-accent` を書く。**淡い塗りの上に置くと、
 * 本文より薄い字が並ぶ。** ランプを揃えても下がるだけである。
 *
 * だから**色を1つも書かない釦**を自分で持ち、枠の前景を継ぐ。
 * 線は Button と同じもので、`internal/focus.ts` に1つだけ置いてある。
 *
 * **hover で色を変えない。** 変えるとまた保証の外の段を指すことになる。
 * 押せることは形（cursor）と線で伝える。
 *
 * ## 見出しは段落であって見出しではない
 *
 * `h2` などにすると**見出しの階層に入る**が、何段目が正しいかは
 * 置かれた場所で決まる。**器はそれを知らない。**
 * 段を決め打ちすると、置いた先の階層が飛ぶ。
 *
 * 結びつけ（`aria-labelledby`）は `role` があるときにだけ効く。
 * `live` を渡さない既定では**文書の順に読まれるので、結びつけは働かない**——
 * 働かないこと自体は害にならないが、**働いていると思わない。**
 * ─────────────────────────────────────────────
 */
import { cva, type VariantProps } from 'class-variance-authority';
import { useId } from 'react';
import type { HTMLAttributes, ReactNode, Ref } from 'react';
import { FOCUS_RING } from '../internal/focus.ts';
import { IconX } from '../icon/icon.tsx';

/** 中立のときに宣言する面。**1箇所だけに書く** */
const NEUTRAL_SURFACE = 'inset';

/**
 * 閉じる釦。**色を1つも書かない。**
 *
 * 枠の前景を継ぐ。線は共有のものを使う（`internal/focus.ts`）。
 * **色を持たない釦**が Button に無いので、箱だけここで書いている。
 */
const dismiss = `shrink-0 cursor-pointer rounded-sm p-1 ${FOCUS_RING}`;

/**
 * その場に残る知らせ。
 *
 * ## 色は宣言から来る
 *
 * 中立は**凹んだ面**を宣言する。色付きは**淡い塗り**を使う。
 * **背景だけを塗る道は無い。**
 *
 * ## 境界を持つ
 *
 * 凹んだ面の上に置くと、中立の枠は背景と同化する。
 * 面の段は凹んだところで底に着くので、その上に凹んだ面を宣言しても深くならない。
 */
const alert = cva('flex w-full items-start gap-3 rounded-lg border-1 border-border p-4', {
  variants: {
    /**
     * どのランプで色を付けるか。**既定は中立。**
     *
     * **ランプは意味を運ばない。** 色の違いだけでは何が起きたか伝わらないので、
     * 文言だけで意味が通るようにする。
     */
    tone: { neutral: '', accent: '', danger: '', warning: '', success: '', info: '' },
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
  defaultVariants: { tone: 'neutral' },
});

export interface AlertProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'title' | 'role'>,
    VariantProps<typeof alert> {
  /**
   * 見出し。**渡さなければ本文だけになる。**
   *
   * 結びつけ（`aria-labelledby`）は器が作る。
   */
  title?: ReactNode;
  /**
   * 頭に置く図案。**ランプごとの既定は持たない。**
   *
   * 色と図案で伝えようとすると文言が短くなる。**意味は文言が持つ。**
   */
  icon?: ReactNode;
  /**
   * 読み上げに知らせるか。**既定は知らせない。**
   *
   * その場に最初からあるものは文書の順に読まれる。領域にすると二重になる。
   * **後から出したときだけ渡す。**
   *
   * `danger` は割り込んで読む（`role="alert"`）。それ以外は読み終わるのを待つ。
   */
  live?: boolean;
  /**
   * 閉じたとき。**渡したときだけ閉じる釦が出る。**
   *
   * 渡さなければ閉じられない。消してはいけない知らせがあるので、
   * 既定で消せる形にしていない。
   */
  onDismiss?: () => void;
  /** 閉じる釦の名前。**図案だけでは何の釦か読めない** */
  dismissLabel?: string;
  children?: ReactNode;
  ref?: Ref<HTMLDivElement>;
}

/**
 * その場に残る知らせ。**出て消えるものは Toast です。**
 *
 * ```tsx
 * <Alert tone="danger" title="保存できませんでした">
 *   接続が切れています。もう一度お試しください。
 * </Alert>
 * ```
 *
 * ## ランプは意味を運びません
 *
 * 色の違いだけでは、何が起きたのかは伝わりません。
 * **文言だけで意味が通るようにしてください。**
 *
 * ## 読み上げには既定で割り込みません
 *
 * その場に最初からあるものは文書の順に読まれます。
 * **後から出したときだけ `live` を渡してください。**
 *
 * ## 閉じられるのは渡したときだけです
 *
 * `onDismiss` を渡したときだけ閉じる釦が出ます。
 */
export function Alert({
  tone,
  title,
  icon,
  live = false,
  onDismiss,
  dismissLabel = '閉じる',
  className,
  children,
  ...props
}: AlertProps) {
  const id = useId();
  const titleId = `${id}-title`;
  const bodyId = `${id}-body`;
  const neutral = tone === undefined || tone === 'neutral';

  // 式の中で組み立てない。cva の呼び出しを補間の中へ直接置くと、
  // 静的解析の検査が読み切れずに落ちる
  const classes = alert({ tone });

  /*
    **割り込むのは danger だけである。** それ以外を割り込ませると、
    読んでいる途中の文が毎回切られる。
  */
  const role = live ? (tone === 'danger' ? 'alert' : 'status') : undefined;

  return (
    <div
      // **自分が何であるかを名乗る。** 見た目は持たない
      data-sg-component="alert"
      // **中立のときだけ面を宣言する。** 色付きは淡い塗りが背景と文字を対で持つ
      data-sg-surface={neutral ? NEUTRAL_SURFACE : undefined}
      role={role}
      // 見出しがあれば名前になり、本文は説明になる。**結びつけを利用側に書かせない**
      aria-labelledby={title ? titleId : undefined}
      aria-describedby={children ? bodyId : undefined}
      className={className ? `${classes} ${className}` : classes}
      {...props}
    >
      {icon ? (
        // **図案は読み上げに出さない。** 意味は文言が持つ
        <span data-sg-component="alert-icon" aria-hidden="true" className="shrink-0">
          {icon}
        </span>
      ) : null}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {title ? (
          <p data-sg-component="alert-title" id={titleId} className="text-label font-emphasis">
            {title}
          </p>
        ) : null}
        {children ? (
          <div data-sg-component="alert-body" id={bodyId} className="text-body">
            {children}
          </div>
        ) : null}
      </div>
      {onDismiss ? (
        <button
          type="button"
          data-sg-component="alert-dismiss"
          // **図案だけでは何の釦か読めない**
          aria-label={dismissLabel}
          onClick={onDismiss}
          /*
            **色を1つも書かない。** 枠の前景（`on-{ランプ}-subtle` か面の段）を継ぐ。
            ここで色を書くと、淡い塗りの上で読めることが保証されていない段を指す。
          */
          className={dismiss}
        >
          <IconX />
        </button>
      ) : null}
    </div>
  );
}
