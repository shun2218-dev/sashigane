'use client';

/*
 * ── 維持する側への覚書 ───────────────────────────────
 *
 * トーストを描く場所。**アプリに1つだけ置く。**
 *
 * ## 素の popover に乗せる
 *
 * `showPopover()` を呼ぶと**最前面の層に出る**ので、
 * `z-index` も `overflow` を持つ祖先も関係しなくなる。
 * Select の一覧は箱の中に描いていて、**枠に切り取られた**——同じ轍を踏まない。
 *
 * `manual` にしてあるのは、**`Escape` や外を押しただけで消えない**ようにするため。
 * 消し方はトースト1つずつが持つ。
 *
 * ## 読み上げの領域は、文言より先に存在している必要がある
 *
 * 空でも `aria-live` の領域を描いておく。**後から領域ごと現れると、
 * 読み上げは中身の追加に気づかない。**
 *
 * ## 急を要するものはトーストで出さない
 *
 * 領域は1つで、`polite` である。重みごとに領域を分けると、
 * **重い方が上・軽い方が下**と並び順が重みで決まってしまい、
 * 出た順に読めなくなる。
 *
 * 割り込んで伝えたいものは、**トーストではなくモーダル**で出す。
 *
 * ## 止め方は「残り時間を覚える」ではなく「入れ直す」
 *
 * ポインタが乗っている間は消さない。離れたら**もう一度はじめから**数える。
 * 残り時間を持つと、**時計が2箇所（この部品と置き場）に増える。**
 * 長く出る側へ倒れるので、読み終わる前に消えることはない。
 * ─────────────────────────────────────────────
 */
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Button } from '../button/button.tsx';
import { IconX } from '../icon/icon.tsx';
import {
  claimToaster,
  dismissToast,
  isToasterOwner,
  subscribeToasterOwner,
} from './toast-store.ts';
import { useToast } from './use-toast.ts';

/*
  既定の滞在時間。**CSS から読む。**

  この部品はトークンのパッケージを import しない——
  コンポーネントがトークンを受け取る道は CSS だけである。

  読めないとき（トークンを入れていない配布先）は**消さない側へ倒れる。**
  適当な数値を埋めると、段の外の値が1つ増える。
*/
const dwellDefault = (): number | undefined => {
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue('--sg-duration-notice')
    .trim();
  const ms = milliseconds(raw);
  return ms !== undefined && ms > 0 ? ms : undefined;
};

/*
  CSS の時間をミリ秒にする。**単位は `s` にも `ms` にもなる。**

  ブラウザは `4000ms` を `4s` に正規化して返す。数だけを読むと
  **4000 のつもりで 4 を受け取り、押した瞬間に消える。**
  実際にそうなっていた——検査では `60ms` を差し込んでいて、
  この形を一度も通していなかった。
*/
const milliseconds = (value: string): number | undefined => {
  const m = /^(-?[\d.]+)(ms|s)$/.exec(value);
  if (!m) return undefined;
  const n = Number.parseFloat(m[1] as string);
  if (!Number.isFinite(n)) return undefined;
  return m[2] === 's' ? n * 1000 : n;
};

const TONE_CLASS = {
  default: 'outline-border',
  success: 'outline-success',
  danger: 'outline-danger',
} as const;

/**
 * トーストを描く場所。**アプリに1つだけ置きます。**
 *
 * ```tsx
 * <Toaster />
 * ```
 *
 * 出すのは `showToast()` か `useToast().show()` です。
 * **置き場は React の外**にあるので、どこから呼んでも構いません。
 *
 * ## 既定は滞在の段のまん中です
 *
 * 何も渡さなければ 4000ms で消えます。読み終わるまで残したいものは
 * `duration: null` を渡してください。
 *
 * **ポインタが乗っている間は消しません。**
 *
 * ## 2つ置いても描くのは1つです
 *
 * 2つとも描くと**同じ通知が2回読まれます。** 後から置いたものは何も描きません。
 * 先に置いたものが外れたら、**次のものへ番が渡ります。**
 *
 * ## 最前面の層に出ます
 *
 * `overflow` を持つ祖先があっても切り取られません。
 */
export function Toaster() {
  const { toasts } = useToast();
  const regionRef = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);

  /*
    描く番かどうか。**2つ置かれても、描くのは先に置かれた方だけである。**
    2つとも描くと、同じ通知が2回読まれる。
  */
  const selfRef = useRef<symbol>(undefined);
  selfRef.current ??= Symbol('toaster');
  const self = selfRef.current;
  const owner = useSyncExternalStore(
    subscribeToasterOwner,
    () => isToasterOwner(self),
    // サーバ側では番を持っているものとして描く。中身はまだ1つも無い
    () => true,
  );
  useEffect(() => claimToaster(self), [self]);

  /*
   * 最前面の層へ出す。**属性だけでは出ない**——`showPopover()` を呼ぶまで
   * 表示されない。空のときも出しておく必要がある（読み上げの領域のため）。
   */
  useEffect(() => {
    const node = regionRef.current;
    if (!node) return undefined;
    if (!node.matches(':popover-open')) node.showPopover();
    return () => {
      if (node.isConnected && node.matches(':popover-open')) node.hidePopover();
    };
  }, [owner]);

  /*
   * 自動で消す。**止めている間は数えない。**
   *
   * 一覧が変わるたびに入れ直すので、新しいものが出ると
   * 前から出ているものの寿命も延びる。**長く出る側へ倒れる。**
   */
  useEffect(() => {
    if (paused) return undefined;
    /*
      **描くときではなく、ここで読む。** 描くときに読むとサーバ側でも走り、
      `getComputedStyle` が無いので落ちる。ここは画面のある側でしか走らない。
    */
    const fallback = dwellDefault();
    const timers = toasts
      // **`null` は「消さない」である。** 渡していない（undefined）とは違う
      .map((toast) => ({ toast, ms: toast.duration === undefined ? fallback : toast.duration }))
      .filter((t): t is { toast: (typeof toasts)[number]; ms: number } => typeof t.ms === 'number')
      .map(({ toast, ms }) => window.setTimeout(() => dismissToast(toast.id), ms));
    return () => {
      for (const timer of timers) window.clearTimeout(timer);
    };
  }, [toasts, paused]);

  // **番でなければ何も描かない。** 描くと領域が2つになる
  if (!owner) return null;

  return (
    <div
      ref={regionRef}
      popover="manual"
      data-sg-component="toaster"
      /*
        枠は何も塗らず、押せない。**押せると、後ろのページが押せなくなる**——
        最前面の層は画面いっぱいに広がる。押せるのはトースト1つずつである。
      */
      className="pointer-events-none inset-auto right-0 bottom-0 m-0 border-0 bg-transparent p-4"
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      {/*
        **空でも描いておく。** 後から領域ごと現れると、
        読み上げは中身の追加に気づかない。
      */}
      <ol
        aria-live="polite"
        data-sg-component="toast-list"
        className="flex flex-col items-end gap-2"
      >
        {toasts.map((toast) => (
          <li
            key={toast.id}
            data-sg-component="toast"
            data-sg-surface="overlay"
            data-sg-tone={toast.tone}
            className={
              // **1本の線で重みを表す。** 色だけで伝えないよう、文言も一緒に出る
              `pointer-events-auto flex max-w-full items-start gap-2 rounded-sm p-3 shadow-overlay ` +
              `outline-solid outline-offset-0 outline-2 ${TONE_CLASS[toast.tone]} ` +
              // 出るときだけ薄れる。**消えるときは動かない**（置き場の覚書）
              `opacity-100 transition-opacity duration-200 starting:opacity-0`
            }
          >
            <span className="text-body">{toast.message}</span>
            <Button
              variant="ghost"
              iconOnly
              aria-label="閉じる"
              onClick={() => dismissToast(toast.id)}
            >
              <IconX />
            </Button>
          </li>
        ))}
      </ol>
    </div>
  );
}
