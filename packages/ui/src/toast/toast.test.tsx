import { useState } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { Button } from '../button/button.tsx';
import { dismissAllToasts, dismissToast, showToast } from './toast-store.ts';
import { Toaster } from './toast.tsx';
import { useToast } from './use-toast.ts';
import '../../test/tokens.css';

/**
 * Toast の保証。**実ブラウザで走る。**
 *
 * 測るのは4つである。
 *
 *   **読み上げの領域が、文言より先にあること** — 後から領域ごと現れると、
 *     読み上げは中身の追加に気づかない。**見た目には何も出ない誤り**である
 *   **最前面の層に出ること** — 属性だけでは出ない。切り取られる場所に描くと、
 *     `overflow` を持つ祖先の中で消える
 *   **枠が後ろの操作を奪わないこと** — 最前面の層は画面いっぱいに広がる
 *   **止めている間は消えないこと**
 */

const onSurface = (node: React.ReactNode) => <div data-sg-surface="page">{node}</div>;

/*
  **置き場は React の外にある。** 片付けないと、
  前のテストで出したものが次のテストに残る。
*/
afterEach(() => {
  dismissAllToasts();
});

const regionIn = (container: HTMLElement) => {
  const el = container.querySelector('[data-sg-component="toast-list"]');
  if (!el) throw new Error('読み上げの領域が描画されていません');
  return el;
};

const toasterIn = (container: HTMLElement) => {
  const el = container.querySelector('[data-sg-component="toaster"]');
  if (!el) throw new Error('枠が描画されていません');
  return el as HTMLElement;
};

const toastsIn = (container: HTMLElement) =>
  [...container.querySelectorAll('[data-sg-component="toast"]')] as HTMLElement[];

/**
 * ポインタの逃げ先を持つ枠。
 *
 * **テストは1つの文書に描き続ける。** 前のテストで閉じる印を押した位置に
 * ポインタが残っており、次のテストで枠が同じ場所に出ると**乗ったまま**になる。
 * 止まったまま数えないので、消える検査が落ちる。
 *
 * 逃げ先には**実体が要る。** Toaster は最前面の層に出るので、
 * 包んでいる要素の高さは 0 になり、逃げ先にならない。
 */
const WithAway = () => (
  <div>
    <p data-testid="away" style={{ height: 80 }}>
      よそ
    </p>
    <Toaster />
  </div>
);

const moveAway = async (container: HTMLElement) => {
  const away = container.querySelector('[data-testid="away"]');
  if (!away) throw new Error('逃げ先が無い');
  await userEvent.hover(away);
};

describe('前提', () => {
  it('生成した CSS が当たっている', () => {
    expect(
      getComputedStyle(document.documentElement).getPropertyValue('--sg-space-surface').trim(),
    ).not.toBe('');
  });
});

describe('読み上げに届ける', () => {
  it('1つも出ていなくても、領域は描かれている', async () => {
    const { container } = await render(onSurface(<Toaster />));
    /*
      **後から領域ごと現れると、読み上げは中身の追加に気づかない。**
      見た目には何も出ないので、ここで測らないと分からない。
    */
    const region = regionIn(container);
    expect(region.getAttribute('aria-live')).toBe('polite');
    expect(toastsIn(container)).toHaveLength(0);
  });

  it('領域は1つで、重みで分けていない', async () => {
    const { container } = await render(onSurface(<Toaster />));
    showToast({ message: 'ふつう' });
    showToast({ message: '失敗しました', tone: 'danger' });
    await expect.poll(() => toastsIn(container)).toHaveLength(2);
    // **分けると、重い方が上・軽い方が下と並び順が重みで決まる。** 出た順に読めなくなる
    expect(container.querySelectorAll('[aria-live]')).toHaveLength(1);
    expect(toastsIn(container).map((t) => t.textContent?.slice(0, 4))).toEqual([
      'ふつう',
      '失敗しま',
    ]);
  });
});

describe('置き場', () => {
  it('React の外から出せる', async () => {
    const { container } = await render(onSurface(<Toaster />));
    // **深いところからでも、React の外からでも呼べる。** ただの関数である
    showToast({ message: '外から' });
    await expect.poll(() => toastsIn(container)).toHaveLength(1);
    expect(toastsIn(container)[0]?.textContent).toContain('外から');
  });

  it('hook からも同じものが読める', async () => {
    const Reader = () => {
      const toast = useToast();
      return (
        <div>
          <p data-testid="count">{toast.toasts.length}</p>
          <Button onClick={() => toast.show({ message: 'hook から' })}>出す</Button>
          <Toaster />
        </div>
      );
    };
    const { container } = await render(onSurface(<Reader />));
    const count = () => container.querySelector('[data-testid="count"]')?.textContent;
    expect(count()).toBe('0');
    await userEvent.click(container.querySelector('button') as Element);
    await expect.poll(count).toBe('1');
  });

  it('閉じる印で消える', async () => {
    const { container } = await render(onSurface(<Toaster />));
    showToast({ message: '消せる' });
    await expect.poll(() => toastsIn(container)).toHaveLength(1);
    await userEvent.click(container.querySelector('[aria-label="閉じる"]') as Element);
    await expect.poll(() => toastsIn(container)).toHaveLength(0);
  });
});

describe('描く場所', () => {
  it('最前面の層に出る', async () => {
    const { container } = await render(onSurface(<Toaster />));
    /*
      **属性だけでは出ない。** 出ないと切り取られる場所に描かれ、
      `overflow` を持つ祖先の中で消える。Select の一覧で踏んだ形である。
    */
    await expect.poll(() => toasterIn(container).matches(':popover-open')).toBe(true);
  });

  it('枠は後ろの操作を奪わない', async () => {
    const { container } = await render(onSurface(<Toaster />));
    showToast({ message: '出ている' });
    await expect.poll(() => toastsIn(container)).toHaveLength(1);
    // **最前面の層は画面いっぱいに広がる。** 枠が押せると後ろが押せなくなる
    expect(getComputedStyle(toasterIn(container)).pointerEvents).toBe('none');
    // 押せるのはトースト1つずつである
    expect(getComputedStyle(toastsIn(container)[0] as Element).pointerEvents).toBe('auto');
  });

  it('出るときに動きが付いている', async () => {
    const { container } = await render(onSurface(<Toaster />));
    showToast({ message: '動く' });
    await expect.poll(() => toastsIn(container)).toHaveLength(1);
    // **補間の途中の値は読まない。** 動きの根拠になっている宣言を読む
    const cs = getComputedStyle(toastsIn(container)[0] as Element);
    expect(cs.animationName).toContain('sg-appear');
    expect(Number.parseFloat(cs.animationDuration)).toBeGreaterThan(0);
  });

  it('消えるときにも動きが付いていて、終わってから外れる', async () => {
    const { container } = await render(onSurface(<Toaster />));
    const id = showToast({ message: '消える', duration: null });
    await expect.poll(() => toastsIn(container)).toHaveLength(1);

    dismissToast(id);
    /*
     * **その場では外れない。** 消えかけを経る。
     * ここが即座に 0 になるなら、出ていく動きは誰にも見えていない。
     */
    await expect.poll(() => toastsIn(container)[0]?.hasAttribute('data-sg-leaving')).toBe(true);
    const cs = getComputedStyle(toastsIn(container)[0] as Element);
    expect(cs.animationName).toContain('sg-disappear');

    // **動きが終われば外れる。** 長さは CSS の中にしかない
    await expect.poll(() => toastsIn(container), { timeout: 2000 }).toHaveLength(0);
  });
});

describe('2つ置いたとき', () => {
  it('描くのは1つだけ', async () => {
    const { container } = await render(
      onSurface(
        <div>
          <Toaster />
          <Toaster />
        </div>,
      ),
    );
    showToast({ message: '1回だけ' });
    await expect.poll(() => toastsIn(container)).toHaveLength(1);
    /*
      **重なって見えるだけの話ではない。** 領域が2つあると、
      読み上げは同じ文言を2回読む。
    */
    expect(container.querySelectorAll('[aria-live]')).toHaveLength(1);
  });

  it('先に置いたものが外れたら、次のものへ渡る', async () => {
    const Switchable = () => {
      const [first, setFirst] = useState(true);
      return (
        <div>
          {first ? <Toaster /> : null}
          <Toaster />
          <Button onClick={() => setFirst(false)}>外す</Button>
        </div>
      );
    };
    const { container } = await render(onSurface(<Switchable />));
    showToast({ message: '渡る' });
    await expect.poll(() => toastsIn(container)).toHaveLength(1);
    await userEvent.click(
      [...container.querySelectorAll('button')].find((b) => b.textContent === '外す') as Element,
    );
    /*
      **渡さないと、最初のものを外した画面で通知が出なくなる。**
      見た目には何も出ないので、そこを測らないと分からない。
    */
    await expect.poll(() => toastsIn(container)).toHaveLength(1);
    expect(container.querySelectorAll('[aria-live]')).toHaveLength(1);
  });
});

describe('自動で消す', () => {
  it('既定は滞在の段から来る', async () => {
    /*
      **段の値を差し替えて測る。** 「4秒待って消えた」では、
      部品が段を読んでいるのか数値を埋めているのか区別が付かない。

      ここで差し替えた値どおりに消えるなら、**その変数を読んでいる**と言える。
      読むのは CSS 側である——`packages/ui` は `packages/tokens` を
      import しない（原則4）。
    */
    const root = document.documentElement;
    const before = root.style.getPropertyValue('--sg-duration-notice');
    root.style.setProperty('--sg-duration-notice', '60ms');
    try {
      const { container } = await render(onSurface(<WithAway />));
      await moveAway(container);
      showToast({ message: '既定で消える' });
      await expect.poll(() => toastsIn(container)).toHaveLength(1);
      await expect.poll(() => toastsIn(container)).toHaveLength(0);
    } finally {
      if (before) root.style.setProperty('--sg-duration-notice', before);
      else root.style.removeProperty('--sg-duration-notice');
    }
  });

  it('秒で書かれた段も読める', async () => {
    /*
      **ブラウザは `4000ms` を `4s` に正規化して返す。** 数だけを読むと
      4000 のつもりで 4 を受け取り、**押した瞬間に消える。**

      実際にそうなっていた。検査では `60ms` を差し込んでおり、
      **この形を一度も通していなかった**——値の形を自分で決めていた。
    */
    const root = document.documentElement;
    const before = root.style.getPropertyValue('--sg-duration-notice');
    root.style.setProperty('--sg-duration-notice', '0.25s');
    try {
      const { container } = await render(onSurface(<WithAway />));
      await moveAway(container);
      showToast({ message: '秒で書かれている' });
      await expect.poll(() => toastsIn(container)).toHaveLength(1);
      // 250ms より短い待ちでは残っている（4ms と読んでいたら消えている）
      await new Promise((resolve) => {
        setTimeout(resolve, 120);
      });
      expect(toastsIn(container)).toHaveLength(1);
      await expect.poll(() => toastsIn(container)).toHaveLength(0);
    } finally {
      if (before) root.style.setProperty('--sg-duration-notice', before);
      else root.style.removeProperty('--sg-duration-notice');
    }
  });

  it('生成した段をそのまま読んでも、まともな長さになる', async () => {
    /*
      **差し込んだ値ではなく、実際に配られている値を読む。**
      差し込む形だけを測っていると、正規化のような
      「実際の経路でしか起きないこと」を通らない。
    */
    const raw = getComputedStyle(document.documentElement)
      .getPropertyValue('--sg-duration-notice')
      .trim();
    const m = /^(-?[\d.]+)(ms|s)$/.exec(raw);
    expect(m, `読めない形: ${raw}`).not.toBeNull();
    const ms = m![2] === 's' ? Number.parseFloat(m![1] as string) * 1000 : Number.parseFloat(m![1] as string);
    // **読み終わる長さであること。** 3秒を下回ると読み切れない
    expect(ms).toBeGreaterThanOrEqual(3000);
    expect(ms).toBeLessThanOrEqual(10000);
  });

  it('null を渡すと消えない', async () => {
    const { container } = await render(onSurface(<WithAway />));
    await moveAway(container);
    showToast({ message: '残る', duration: null });
    await expect.poll(() => toastsIn(container)).toHaveLength(1);
    await new Promise((resolve) => {
      setTimeout(resolve, 200);
    });
    // **読み終わるまで残したいものがある**
    expect(toastsIn(container)).toHaveLength(1);
  });

  it('渡すと消える', async () => {
    const { container } = await render(onSurface(<WithAway />));
    await moveAway(container);
    showToast({ message: '消える', duration: 60 });
    await expect.poll(() => toastsIn(container)).toHaveLength(1);
    await expect.poll(() => toastsIn(container)).toHaveLength(0);
  });

  it('ポインタが乗っている間は消えない', async () => {
    const { container } = await render(onSurface(<WithAway />));
    await moveAway(container);
    showToast({ message: '読んでいる', duration: 60 });
    await expect.poll(() => toastsIn(container)).toHaveLength(1);
    /*
      **本物のホバーでは測れない。** トーストは最前面の層にあり、
      ページと一緒に巻き取られないので、ポインタを運ぶ側が
      「見える位置まで巻き取る」で終わらなくなる（15秒待って落ちた）。

      ポインタが入ったことだけを起こす。React は `pointerover` から
      `onPointerEnter` を作るので、**部品側の書き方は本物と同じ経路**を通る。
    */
    (toastsIn(container)[0] as Element).dispatchEvent(
      new PointerEvent('pointerover', { bubbles: true }),
    );
    /*
      **止まっているかどうかは時間に依らない。** 止まっていなければ
      この待ちの間に消えるので、遅い側へ倒れても結果は変わらない。
    */
    await new Promise((resolve) => {
      setTimeout(resolve, 250);
    });
    expect(toastsIn(container)).toHaveLength(1);
  });
});

describe('残り時間のゲージ（決定6-46）', () => {
  const gaugesIn = (c: HTMLElement) =>
    [...c.querySelectorAll('[data-sg-component="toast-gauge"]')] as HTMLElement[];

  it('消えるものにはゲージが出て、消えないものには出ない', async () => {
    const { container } = await render(<Toaster />);
    showToast({ message: '消える' });
    showToast({ message: '消えない', duration: null });
    await expect.poll(() => container.querySelectorAll('[data-sg-component="toast"]').length).toBe(2);
    // **消えないものに残り時間は無い。** 出すと、止まった帯が嘘をつく
    expect(gaugesIn(container).length).toBe(1);
  });

  it('読み上げには出ない', async () => {
    const { container } = await render(<Toaster />);
    showToast({ message: 'あ' });
    await expect.poll(() => gaugesIn(container).length).toBe(1);
    expect(gaugesIn(container)[0]?.getAttribute('aria-hidden')).toBe('true');
  });

  it('実際に縮む', async () => {
    const { container } = await render(<Toaster />);
    showToast({ message: 'あ', duration: 800 });
    await expect.poll(() => gaugesIn(container).length).toBe(1);
    const gauge = gaugesIn(container)[0] as HTMLElement;

    /*
     * **静止した状態を見比べても、減っていることは分からない。**
     * 幅そのものではなく `transform` を見る——ゲージは `scaleX` で縮む。
     *
     * 描くたびに測って、**3種類以上の値を通る**ことを見る。
     * 瞬間で消えるなら2種類しか出ない（アコーディオンで踏んだのと同じ形）。
     */
    const seen = new Set<string>();
    const until = performance.now() + 600;
    while (performance.now() < until) {
      seen.add(getComputedStyle(gauge).transform);
      await new Promise((r) => requestAnimationFrame(() => r(undefined)));
    }
    expect(seen.size, `見えた値: ${[...seen].join(' / ')}`).toBeGreaterThan(2);
  });

  it('ポインタが乗っているあいだ止まる', async () => {
    const { container } = await render(<Toaster />);
    showToast({ message: 'あ', duration: 4000 });
    await expect.poll(() => gaugesIn(container).length).toBe(1);
    const gauge = gaugesIn(container)[0] as HTMLElement;
    const region = container.querySelector('[data-sg-component="toaster"]');
    if (!region) throw new Error('置き場が描画されていません');

    await userEvent.hover(region);
    await expect.poll(() => gauge.hasAttribute('data-sg-gauge-paused')).toBe(true);

    /*
     * **属性だけでなく、実際に止まっていることを測る。**
     * 属性が付いていても、規則が当たっていなければ動き続ける。
     *
     * **動きそのものの時刻を読む。** `currentTime` は描画とは無関係の厳密な値で、
     * フレームが飛んでも同じ数を返す。
     *
     * かつて `transform` を読んで比べていたが、**同じフレームの中では
     * 走っていても等しい**ので、フレームが飛べば「止まった」と誤判定できた。
     */
    const animation = gauge.getAnimations()[0];
    if (!animation) throw new Error('ゲージが動いていません');
    await expect.poll(() => animation.playState).toBe('paused');

    /*
     * **`playState` が変わってから、実際に止まるまで一拍ある。**
     * 読むと 16.7ms——ちょうど1フレーム——進んだ値が返った。
     *
     * `ready` は、その一拍が済むまでを持っている。**待つ側を自分で作らない。**
     */
    await animation.ready;
    const at = animation.currentTime;
    await new Promise((r) => setTimeout(r, 250));
    expect(animation.currentTime, '止まっていない').toBe(at);
  });
});
