'use client';

/*
 * ── 維持する側への覚書 ───────────────────────────────
 *
 * 置き場（`toast-store.ts`）を React から読む口。**状態はここに無い。**
 *
 * `useSyncExternalStore` を使うのは、**React の外に置き場がある**ためである。
 * 自前で `useEffect` と `useState` を組むと、
 * **購読する前に出たトースト**を取りこぼす。
 * ─────────────────────────────────────────────
 */
import { useSyncExternalStore } from 'react';
import {
  dismissAllToasts,
  dismissToast,
  getToasts,
  showToast,
  subscribeToasts,
  type Toast,
  type ToastInput,
} from './toast-store.ts';

export interface ToastController {
  /** いま出ているもの */
  toasts: readonly Toast[];
  /** 出す。**戻り値は消すための `id`** */
  show: (input: ToastInput) => string;
  /** 消す */
  dismiss: (id: string) => void;
  /** 全部消す */
  dismissAll: () => void;
}

/**
 * トーストを出す・読む。
 *
 * ```tsx
 * const toast = useToast();
 *
 * <Button onClick={() => toast.show({ message: '保存しました', duration: 4000 })}>
 *   保存する
 * </Button>
 * ```
 *
 * ## どこからでも出せます
 *
 * 置き場は React の外にあります。**深いところからでも、React の外
 * （読み込みの失敗処理など）からでも** `showToast()` をそのまま呼べます。
 *
 * この hook は**読む側**です。出すだけなら `showToast()` で足ります。
 */
export function useToast(): ToastController {
  const toasts = useSyncExternalStore(subscribeToasts, getToasts, getToasts);
  return {
    toasts,
    show: showToast,
    dismiss: dismissToast,
    dismissAll: dismissAllToasts,
  };
}
