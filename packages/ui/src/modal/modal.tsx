'use client';

/*
 * ── 維持する側への覚書 ───────────────────────────────
 *
 * **素の `dialog` に乗せる。** `showModal()` を呼ぶと、ブラウザが
 * 次の全部を持ってくれる。
 *
 *   - 最前面の層に出る（`z-index` も `overflow` も関係しない）
 *   - **焦点が中に閉じ込められる**
 *   - 後ろが操作できなくなる（`inert` と同じ扱い）
 *   - `Escape` で閉じる
 *   - **閉じたとき、開く前に焦点があった場所へ戻る**
 *
 * 自前で書くと、この5つを全部持ち直すことになる。Accordion を素の `details` に、
 * Checkbox を素の `input` に乗せたのと同じ判断である。
 *
 * ## 開閉は props で受け取り、DOM へ写す
 *
 * 開いているかどうかを持つのは利用側（`useModal`）で、ここは**写すだけ**である。
 * `dialog` は自分でも閉じる（`Escape`）ので、**閉じたことを親へ返す**必要がある。
 * 返さないと、利用側は「開いている」と思ったままになる。
 *
 * ## 後ろの巻き取りは自分で止める
 *
 * `showModal()` は後ろの**操作**は止めるが、**巻き取り（スクロール）は止めない。**
 * 止めないと、中を読んでいるつもりで後ろが動く。
 *
 * ## 背景を押して閉じるのは既定にしていない
 *
 * `dialog` は覆いの部分も自分の領域なので、**押した場所が中か外かを
 * 座標で見分けることになる。** 取り違えると、中を押したのに閉じる。
 * 消える操作の前では代償が大きいので、**指定したときだけ**にしてある。
 * ─────────────────────────────────────────────
 */
import { useEffect, useId, useRef } from 'react';
import type { DialogHTMLAttributes, ReactNode, Ref } from 'react';
import { Button } from '../button/button.tsx';
import { IconX } from '../icon/icon.tsx';

export interface ModalProps
  extends Omit<DialogHTMLAttributes<HTMLDialogElement>, 'open' | 'title' | 'children'> {
  /** 開いているか。**持つのは利用側**（`useModal`） */
  open: boolean;
  /**
   * 閉じるとき。**`Escape` でも呼ばれる。**
   *
   * `dialog` は自分でも閉じるので、返さないと
   * 利用側は「開いている」と思ったままになる。
   */
  onClose: () => void;
  /** 見出し。**読み上げはこれを名前として読む** */
  title: ReactNode;
  /** 中身 */
  children: ReactNode;
  /** 下端に置く操作。**無ければ置かない** */
  actions?: ReactNode;
  /**
   * 覆いを押したら閉じるか。**既定は閉じない。**
   *
   * 押した場所が中か外かは**座標で見分ける**ことになり、取り違えると
   * 中を押したのに閉じる。消える操作の前では代償が大きい。
   */
  closeOnBackdrop?: boolean;
  ref?: Ref<HTMLDialogElement>;
}

/**
 * モーダル。**素の `dialog` に乗っています。**
 *
 * 焦点の閉じ込め・後ろを触れなくすること・`Escape` で閉じること・
 * **閉じたときに元の場所へ焦点が戻ること**は、すべてブラウザが持っています。
 *
 * ## 開閉は利用側が持ちます
 *
 * ```tsx
 * const modal = useModal();
 *
 * <Button onClick={modal.show}>消す</Button>
 * <Modal open={modal.open} onClose={modal.hide} title="確認">
 *   本当に消しますか
 * </Modal>
 * ```
 *
 * ## 幅は決めていません
 *
 * 素の `dialog` は**中身に合わせて広がり、画面幅で止まります。**
 * 幅を決めたいときは `className` か `style` で渡してください。
 *
 * ## 見出しは必須です
 *
 * 読み上げは見出しを**この窓の名前**として読みます。
 * 無いと「ダイアログ」としか言いません。
 */
export function Modal({
  open,
  onClose,
  title,
  children,
  actions,
  closeOnBackdrop = false,
  className,
  ref,
  ...props
}: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  /*
   * 見出しの `id`。**乱数では作れない**——サーバ側と手元で値が食い違い、
   * 描き直しになる。この部品はクライアント側なので `useId` を使える。
   */
  const titleId = useId();

  /*
   * props を DOM へ写す。**`open` 属性では出さない**——
   * 属性だけで出すと最前面の層に入らず、焦点の閉じ込めも後ろの遮断も効かない。
   * **見た目は出るので、壊れていることに気づけない。**
   */
  useEffect(() => {
    const node = dialogRef.current;
    if (!node) return;
    if (open && !node.open) node.showModal();
    if (!open && node.open) node.close();
  }, [open]);

  /*
   * 後ろの巻き取りを止める。**`showModal()` は操作は止めるが巻き取りは止めない。**
   * 止めないと、中を読んでいるつもりで後ろが動く。
   */
  useEffect(() => {
    if (!open) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  /*
   * **幅を決めていない。** このシステムには幅の段が無い——
   * コンテナの写像を持っていないので、`max-w-*` はどれも生成されない。
   *
   * 素の `dialog` は中身に合わせて広がり、画面幅で止まる。
   * **決め打ちの数値をここに書くと、段の外の値が1つ増える**ので書いていない。
   * 幅を決めたい利用側は `className` か `style` で渡す。
   */
  const classes =
    'm-auto rounded-lg p-6 shadow-overlay ' +
    // `dialog` の既定の境界を消す。**preflight は配布先にあるとは限らない**
    'border-0';

  return (
    <dialog
      ref={(node) => {
        dialogRef.current = node;
        if (typeof ref === 'function') ref(node);
        else if (ref) ref.current = node;
      }}
      data-sg-component="modal"
      data-sg-surface="overlay"
      data-sg-scrim
      aria-labelledby={titleId}
      className={className ? `${classes} ${className}` : classes}
      /*
        `dialog` は自分でも閉じる（`Escape`・`form method="dialog"`）。
        **閉じたことを返さないと、利用側は開いていると思ったままになる。**
      */
      onClose={onClose}
      onClick={(event) => {
        if (!closeOnBackdrop) return;
        // **押した場所が中かどうかを座標で見る。** `dialog` は覆いも自分の領域である
        const box = event.currentTarget.getBoundingClientRect();
        const inside =
          event.clientX >= box.left &&
          event.clientX <= box.right &&
          event.clientY >= box.top &&
          event.clientY <= box.bottom;
        if (!inside) onClose();
      }}
      {...props}
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <h2 id={titleId} data-sg-component="modal-title" className="text-heading-3 font-heading">
            {title}
          </h2>
          {/* **閉じる道を目に見える形でも置く。** `Escape` だけだと、
              触って操作している人には閉じ方が無い */}
          <Button variant="ghost" iconOnly aria-label="閉じる" onClick={onClose}>
            <IconX />
          </Button>
        </div>
        <div data-sg-component="modal-body">{children}</div>
        {actions ? (
          <div data-sg-component="modal-actions" className="flex flex-wrap items-center gap-2">
            {actions}
          </div>
        ) : null}
      </div>
    </dialog>
  );
}
