'use client';

/*
 * ── 維持する側への覚書 ───────────────────────────────
 *
 * **バリデーションは持たない。** Field と同じで、走らせるのは利用側である。
 * ここが持つのは、**利用側が書き忘れる仕組み**だけである。
 *
 * ## 焦点を移すために、クライアント側の部品になっている
 *
 * 他の部品と違ってサーバ側で描けない。**送信の後に DOM を見る**ためである。
 * 親は利用側の送信処理を持つのでどのみちクライアント側であり、
 * 中身は子として渡せるので、実際に失うものは無い。
 *
 * ## 送信処理を待ってから探す
 *
 * 誤りが付くのは**利用側の検証が終わってから**である。
 * 待たずに探すと、まだ誰も誤りを名乗っていない。
 *
 * 待ち方は2段ある——**利用側の処理（約束を返すならその解決）**と、
 * **そのあとの描画**である。片方だけでは足りない。
 *
 * ## `noValidate` を既定にしている
 *
 * ブラウザ既定の吹き出しは、**Field が出す文言と二重になる。**
 * 見た目も位置も揃わず、片方は読み上げに届かない。
 *
 * 塞いではいない。`noValidate={false}` と書けば素の検証に戻る。
 * ─────────────────────────────────────────────
 */
import { useRef } from 'react';
import type { FormHTMLAttributes, HTMLAttributes, ReactNode, Ref } from 'react';

/** 誤りを名乗っている欄。**利用側が何で検証したかに依らない** */
const INVALID = '[aria-invalid="true"]';

/**
 * 焦点を持てるもの。**誤りを名乗るものが焦点を持てるとは限らない**——
 * ラジオの群れは `fieldset` が名乗るが、`fieldset` に焦点は乗らない。
 */
const FOCUSABLE = 'input, select, textarea, button, [tabindex]:not([tabindex="-1"])';

/**
 * 誤りを探す回数。**1回の描画では足りない。**
 *
 * 利用側が状態を変えても、React の更新は**次の描画より後に走ることがある。**
 * 1回だけ待つ形にしていたら、4回に1回落ちた。
 */
const FRAMES = 5;

const nextFrame = () =>
  new Promise((resolve) => {
    requestAnimationFrame(() => resolve(undefined));
  });

/** 焦点を移す先。**名乗っているものか、その中の最初の焦点を持てるもの** */
const focusTarget = (invalid: Element): HTMLElement | null => {
  if (invalid instanceof HTMLElement && invalid.tabIndex >= 0) return invalid;
  const inside = invalid.querySelector(FOCUSABLE);
  return inside instanceof HTMLElement ? inside : null;
};

export interface FormProps extends Omit<FormHTMLAttributes<HTMLFormElement>, 'children'> {
  /**
   * フォーム全体の誤り。**欄1つの誤りではないもの。**
   *
   * 送信そのものが失敗したときや、複数の欄の組み合わせが成り立たないとき。
   * **読み上げにはその場で届く**（`role="alert"`）。
   */
  error?: ReactNode;
  /**
   * 送信に失敗したとき、**最初の誤りへ焦点を移すか。**
   *
   * 既定は移す。長いフォームでは、**誤りが画面の外にあると
   * 何が起きたのか分からない。**
   */
  focusOnError?: boolean;
  children: ReactNode;
  ref?: Ref<HTMLFormElement>;
}

/**
 * フォーム本体。**欄を束ねて、送信の後始末をする。**
 *
 * ## バリデーションは持ちません
 *
 * 規則を走らせる仕組みはありません。**走らせるのは利用側**です。
 * ここが持つのは、利用側が書き忘れるものだけです。
 *
 * ## 送信に失敗したら、最初の誤りへ焦点が移ります
 *
 * 長いフォームでは、**誤りが画面の外にあると何が起きたのか分かりません。**
 * 送信ボタンを押しても何も起きていないように見えます。
 *
 * 誤りを名乗っている欄（`aria-invalid`）を探すので、
 * **どのライブラリで検証したかに依りません。**
 *
 * ## ブラウザ既定の検証は切ってあります
 *
 * 既定の吹き出しは Field が出す文言と二重になり、見た目も位置も揃いません。
 * 素の検証に戻すには `noValidate={false}` を渡してください。
 */
export function Form({
  error,
  focusOnError = true,
  noValidate = true,
  className,
  children,
  onSubmit,
  ref,
  ...props
}: FormProps) {
  const formRef = useRef<HTMLFormElement>(null);

  // 送信の型は React が持っているものを借りる。**自分で書くとずれる**
  const handleSubmit: NonNullable<FormHTMLAttributes<HTMLFormElement>['onSubmit']> = async (
    event,
  ) => {
    const result = onSubmit?.(event) as unknown;
    if (!focusOnError) return;

    /*
     * **利用側の検証が終わるまで待つ。** 終わる前に探しても、
     * まだ誰も誤りを名乗っていない。
     *
     * 約束を返す書き方（`handleSubmit()` など）はその解決を待つ。
     * そのあとも**1回の描画では足りない**——状態が変わっただけでは
     * DOM に出ておらず、React の更新は次の描画より後に走ることがある。
     * **見つかるまで数回だけ待つ。**
     */
    if (result && typeof (result as Promise<unknown>).then === 'function') {
      await result;
    }

    let first: Element | null = null;
    for (let i = 0; i < FRAMES; i += 1) {
      first = formRef.current?.querySelector(INVALID) ?? null;
      if (first) break;
      await nextFrame();
    }

    if (first) focusTarget(first)?.focus();
  };

  const classes = 'flex flex-col gap-4';
  return (
    <form
      ref={(node) => {
        formRef.current = node;
        if (typeof ref === 'function') ref(node);
        else if (ref) ref.current = node;
      }}
      data-sg-component="form"
      noValidate={noValidate}
      className={className ? `${classes} ${className}` : classes}
      {...props}
      onSubmit={handleSubmit}
    >
      {/*
        フォーム全体の誤り。**その場で読み上げに届く。**

        欄の誤りと違い、**指す先が無い**——どの欄が悪いとも言えないので、
        `aria-describedby` では結べない。
      */}
      {error ? (
        <p data-sg-component="form-error" role="alert" className="text-body text-danger">
          {error}
        </p>
      ) : null}
      {children}
    </form>
  );
}

export interface FormActionsProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  ref?: Ref<HTMLDivElement>;
}

/**
 * 操作の並び。**送信と取り消しを置く場所。**
 *
 * 折り返す。狭いところで**押せないボタンが画面の外へ出る**のを避けるため。
 */
export function FormActions({ className, children, ...props }: FormActionsProps) {
  const classes = 'flex flex-wrap items-center gap-2';
  return (
    <div
      data-sg-component="form-actions"
      className={className ? `${classes} ${className}` : classes}
      {...props}
    >
      {children}
    </div>
  );
}
