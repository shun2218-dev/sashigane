'use client';

/*
 * ── 維持する側への覚書 ───────────────────────────────
 *
 * トーストの置き場。**React の外にある。**
 *
 * ## 文脈（context）を配っていない
 *
 * トーストは**深いところから出す**ものである（保存に失敗した、送信が済んだ）。
 * 文脈で配ると、出す場所すべてが提供者の下にいなければならず、
 * **React の外（fetch の失敗処理など）からは出せない。**
 *
 * ここに置くと、`showToast()` はただの関数になる。
 *
 * ## 滞在時間を持っていない
 *
 * 既定の長さは**トークンの段から来る**が、置き場からは読まない——
 * ここは DOM を知らない。読むのは描く側（`toast.tsx`）である。
 *
 * ## 消えるときの動きを持っていない
 *
 * 消すと**その場で消える。** 動かすには、消す前に「消えかけ」の状態を作り、
 * CSS の時間と同じ長さだけ待ってから外すことになる。
 * **同じ長さが2箇所（CSS と JS）に要る**ので、揃っているかを誰も見られない。
 *
 * モーダルは待つ側をブラウザが持っていた（`allow-discrete`）。ここには無い。
 * ─────────────────────────────────────────────
 */

/** トーストの重み。**急を要するものはトーストで出さない**（下の覚書） */
export type ToastTone = 'default' | 'success' | 'danger';

export interface Toast {
  id: string;
  message: string;
  tone: ToastTone;
  /**
   * 自動で消すまでの時間（ミリ秒）。
   *
   * 渡さなければ**滞在の段のまん中**（4000ms）。`null` を渡すと消えない。
   */
  duration?: number | null;
}

export interface ToastInput {
  message: string;
  tone?: ToastTone;
  /**
   * 自動で消すまでの時間（ミリ秒）。
   *
   * 渡さなければ**滞在の段のまん中**（4000ms）を使う。
   * 読み終わるまで残したいものは `null` を渡す。
   */
  duration?: number | null;
}

type Listener = () => void;

let toasts: readonly Toast[] = [];
const listeners = new Set<Listener>();
let counter = 0;

const emit = (): void => {
  for (const listener of listeners) listener();
};

/** いま出ているもの。**同じ配列を返し続ける**——毎回作ると描き直しが止まらない */
export const getToasts = (): readonly Toast[] => toasts;

export const subscribeToasts = (listener: Listener): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/**
 * トーストを出す。**React の中からでも外からでも呼べる。**
 *
 * 戻り値は消すための `id` である。
 */
export const showToast = (input: ToastInput): string => {
  counter += 1;
  const id = `sg-toast-${counter}`;
  const toast: Toast = { id, message: input.message, tone: input.tone ?? 'default' };
  toasts = [...toasts, input.duration === undefined ? toast : { ...toast, duration: input.duration }];
  emit();
  return id;
};

export const dismissToast = (id: string): void => {
  const next = toasts.filter((t) => t.id !== id);
  // **数が変わらないなら知らせない。** 知らせると、無い id を消すたびに描き直す
  if (next.length === toasts.length) return;
  toasts = next;
  emit();
};

/** 全部消す。**画面が変わるときに使う**——前の画面の知らせが残らないように */
export const dismissAllToasts = (): void => {
  if (toasts.length === 0) return;
  toasts = [];
  emit();
};
