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
import type { CSSProperties } from 'react';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Button } from '../button/button.tsx';
import { IconX } from '../icon/icon.tsx';
import {
  claimToaster,
  dismissToast,
  isToasterOwner,
  removeToast,
  subscribeToasterOwner,
} from './toast-store.ts';
import { useToast } from './use-toast.ts';

/*
  既定の滞在時間を JS で読むのをやめた（決定6-47）。

  以前はここで `--sg-duration-notice` を読み、ミリ秒に直して `setTimeout` に渡していた。
  **CSS の時間は `4000ms` が `4s` として返る**ので、数だけを読むと 4 になる——
  実際にそれで「押した瞬間に消える」を出したことがある。

  いまは**待つ相手が帯の動きそのもの**で、長さは CSS の中だけにある。
  **読み違える経路が無くなった。**
*/

const TONE_CLASS = {
  default: 'outline-border',
  success: 'outline-success',
  danger: 'outline-danger',
} as const;

/**
 * ゲージの色。**線と同じ重みを指す。**
 *
 * 淡い塗りを使う。**不透明な塗りは出ていない**（塗りは宣言するもの）ので、
 * ここで使えるのは色のついた地の段である。
 *
 * **クラスを組み立てない。** `bg-${tone}-subtle` のように書くと、
 * Tailwind の走査に読めず、クラスが生成されない。
 */
const GAUGE_CLASS = {
  default: 'bg-accent-subtle',
  success: 'bg-success-subtle',
  danger: 'bg-danger-subtle',
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
   * 消すのも外すのも、**動きの終わりを待つ。**
   *
   * ## 時計を1つにする
   *
   * 以前は `setTimeout` で消し、帯は CSS の動きで縮めていた。**別々の時計である。**
   * タブを裏に回すなど、片方だけが遅れる状況でずれた。
   *
   * いまは待つ相手が**帯の動きそのもの**である。止めれば動きも止まり、
   * 再開すれば続きから進む。**残り時間を JS が持たなくてよくなった。**
   *
   * ## 長さを2箇所に持たない
   *
   * 置き場の覚書は「消えるときの動きを持たない」理由を
   * 「同じ長さが CSS と JS の2箇所に要る」としていた。**要らない**——
   * `Animation` の終わりを待つので、**JS は長さを知らない。**
   *
   * ## 動きが無いときは待たない
   *
   * トークンを入れていない配布先では動きが無い。**待つと永久に消えない。**
   * 動きが1つも無ければその場で進める。
   */
  const watched = useRef(new Set<string>());

  useEffect(() => {
    /*
      **番でないあいだは領域が無い。** `owner` を見ていないと、
      番になる前に出たトーストが**一度も見張られないまま残る**——
      効果は `toasts` が変わらない限り走り直さない。
    */
    const region = regionRef.current;
    if (!region) return undefined;
    let live = true;

    const after = (el: Element | null, done: () => void) => {
      const animations = el?.getAnimations() ?? [];
      // **動きが無ければ待たない。** CSS が届いていない配布先で止まる
      if (animations.length === 0) {
        done();
        return;
      }
      void Promise.allSettled(animations.map((a) => a.finished)).then(() => {
        if (live) done();
      });
    };

    for (const toast of toasts) {
      const li = region.querySelector(`[data-sg-toast-id="${toast.id}"]`);
      if (toast.leaving) {
        // 消えかけ。**出ていく動きが終わったら外す**
        if (watched.current.has(`out:${toast.id}`)) continue;
        watched.current.add(`out:${toast.id}`);
        after(li, () => removeToast(toast.id));
        continue;
      }
      // 帯が空になったら消し始める。**帯が無いもの（消えないもの）は放っておく**
      if (watched.current.has(`in:${toast.id}`)) continue;
      const gauge = li?.querySelector('[data-sg-component="toast-gauge"]') ?? null;
      if (!gauge) continue;
      watched.current.add(`in:${toast.id}`);
      after(gauge, () => dismissToast(toast.id));
    }

    return () => {
      live = false;
    };
  }, [toasts, owner]);

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
            data-sg-toast-id={toast.id}
            data-sg-surface="overlay"
            data-sg-tone={toast.tone}
            /* 出入りの動き（決定6-47）。**消えかけは外す前の状態である** */
            data-sg-appear=""
            data-sg-leaving={toast.leaving ? '' : undefined}
            className={
              // **1本の線で重みを表す。** 色だけで伝えないよう、文言も一緒に出る
              `pointer-events-auto relative flex max-w-full items-start gap-2 overflow-hidden ` +
              `rounded-sm p-3 shadow-overlay ` +
              `outline-solid outline-offset-0 outline-2 ${TONE_CLASS[toast.tone]} ` +
              // 出入りの動きは宣言で表す（決定6-47）。クラスでは書けない
              `opacity-100`
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
            {/*
              残り時間のゲージ（決定6-46）。**消えないものには出さない。**

              **読み上げには出さない。** 時間の経過は `aria-live` で読み上げる
              ようなものではなく、読ませると文言が繰り返し流れる。

              長さは差し込み口に渡す。**既定は書かない**——書かないと
              `tokens.css` 側が通知の滞在時間へ落ちる。段の外の値を増やさない。
            */}
            {toast.duration === null ? null : (
              <span
                aria-hidden="true"
                data-sg-component="toast-gauge"
                data-sg-gauge=""
                data-sg-gauge-paused={paused ? '' : undefined}
                style={
                  typeof toast.duration === 'number'
                    ? ({ '--sg-gauge-duration': `${toast.duration}ms` } as CSSProperties)
                    : undefined
                }
                className={`absolute inset-x-0 bottom-0 h-1 ${GAUGE_CLASS[toast.tone]}`}
              />
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
