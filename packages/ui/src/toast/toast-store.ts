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
 * ## 消えるときは「消えかけ」を経る
 *
 * `dismissToast` は**その場では外さない。** `leaving` を立てるだけで、
 * 実際に外すのは描く側が動きの終わりを見てからである（`removeToast`）。
 *
 * **長さは CSS にしか無い。** かつてこの形を退けたのは
 * 「同じ長さが2箇所（CSS と JS）に要る」ためだったが、
 * **JS は長さを知らずに済む**——動き（`Animation`）の終わりを待てばよい。
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
  /**
   * 消えかけ。**まだ描かれている。**
   *
   * 立ってから実際に外れるまでのあいだ、出ていく動きが走る。
   */
  leaving?: boolean;
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

/**
 * 消し始める。**その場では外さない**——出ていく動きが走る。
 *
 * 既に消えかけのものは何もしない。**通知ると、描き直しが止まらない。**
 */
export const dismissToast = (id: string): void => {
  if (!toasts.some((t) => t.id === id && !t.leaving)) return;
  toasts = toasts.map((t) => (t.id === id ? { ...t, leaving: true } : t));
  emit();
};

/**
 * 実際に外す。**動きの終わりを見た描く側が呼ぶ。**
 *
 * 動きが無いとき（トークンを入れていない配布先）も描く側が呼ぶ——
 * **CSS が無いと消えない**のでは、閉じるボタンが効かないことになる。
 */
export const removeToast = (id: string): void => {
  const next = toasts.filter((t) => t.id !== id);
  if (next.length === toasts.length) return;
  toasts = next;
  emit();
};

/*
 * 描く場所は1つだけにする。**2つ置くと、同じ通知が2回読まれる。**
 *
 * 重なって見えるだけなら見た目の話で済むが、読み上げの領域も2つになるので、
 * **同じ文言が2回読まれる。** 文書に「1つだけ置く」と書いても守られない（教訓3）。
 *
 * 先に置かれたものが描く。**外れたら次のものへ渡す**——
 * 渡さないと、最初のものを外した画面で通知が出なくなる。
 */
let mounted: symbol[] = [];
const ownerListeners = new Set<Listener>();

const emitOwner = (): void => {
  for (const listener of ownerListeners) listener();
};

export const subscribeToasterOwner = (listener: Listener): (() => void) => {
  ownerListeners.add(listener);
  return () => {
    ownerListeners.delete(listener);
  };
};

/** 描く番かどうか。**最初に置かれたものだけが真** */
export const isToasterOwner = (id: symbol): boolean => mounted[0] === id;

/** 置かれたことを通知る。戻り値を呼ぶと外れる */
export const claimToaster = (id: symbol): (() => void) => {
  mounted = [...mounted, id];
  emitOwner();
  return () => {
    mounted = mounted.filter((x) => x !== id);
    emitOwner();
  };
};

/**
 * 全部消す。**画面が変わるときに使う**——前の画面の通知が残らないように。
 *
 * **これだけは消えかけを経ない。** 1つずつ消すときは見えているので動きが要るが、
 * 画面ごと変わるときの目的は「残さないこと」であり、**動かす相手がもう居ない。**
 *
 * 消えかけのまま残すと、**次の画面に前の画面の通知が出たまま入る。**
 */
export const dismissAllToasts = (): void => {
  if (toasts.length === 0) return;
  toasts = [];
  emit();
};
