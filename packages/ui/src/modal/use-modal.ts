'use client';

/*
 * ── 維持する側への覚書 ───────────────────────────────
 *
 * 開いているかどうかだけを持つ。**DOM は触らない。**
 *
 * 触るのは Modal の側である（`showModal()` と `close()`）。
 * ここが DOM を触ると、**状態と DOM の2箇所が開閉を持つ**ことになり、
 * 片方だけ動いたときに食い違う。
 *
 * ## コンポーネントと分けている理由
 *
 * 開いているかどうかは、**利用側が知りたい値**である——
 * 開いている間だけ読み込む、閉じたら次の案内を出す、など。
 *
 * コンポーネントの中に隠すと、利用側からは「開いた」ことしか分からない。
 * ─────────────────────────────────────────────
 */
import { useCallback, useMemo, useState } from 'react';

export interface ModalController {
  /** 開いているか */
  open: boolean;
  /** 開ける */
  show: () => void;
  /** 閉じる */
  hide: () => void;
}

/**
 * モーダルを開いているかどうか。**状態だけを持ちます。**
 *
 * ```tsx
 * const modal = useModal();
 *
 * <Button onClick={modal.show}>開く</Button>
 * <Modal open={modal.open} onClose={modal.hide} title="確認">
 *   本当に消しますか
 * </Modal>
 * ```
 *
 * 開いているかどうかは**利用側が知りたい値**なので、コンポーネントの中に隠していません。
 */
export function useModal(initial = false): ModalController {
  const [open, setOpen] = useState(initial);
  const show = useCallback(() => setOpen(true), []);
  const hide = useCallback(() => setOpen(false), []);
  // **同じものを返し続ける。** 毎回作ると、受け取った側の再描画が増える
  return useMemo(() => ({ open, show, hide }), [open, show, hide]);
}
