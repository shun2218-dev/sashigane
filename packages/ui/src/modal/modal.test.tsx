import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { Button } from '../button/button.tsx';
import { Modal } from './modal.tsx';
import { useModal } from './use-modal.ts';
import '../../test/tokens.css';

/**
 * Modal の保証。**実ブラウザで走る。**
 *
 * この部品は**ブラウザが持っているものに乗っている。**
 * 測るのは「乗れていること」——`showModal()` を呼び忘れても
 * **見た目は出る**ので、そこを測らないと気づけない。
 *
 *   **最前面の層に出ていること** — 属性だけで出すと層に入らず、
 *     フォーカスの閉じ込めも後ろの遮断も効かない
 *   **閉じたことが親へ返ること** — `Escape` で閉じても状態が残ると、次に開かない
 *   **見出しがこのダイアログの名前になること** — 無いと「ダイアログ」としか言わない
 */

const onSurface = (node: React.ReactNode) => <div data-sg-surface="page">{node}</div>;

const dialogIn = (container: HTMLElement) => {
  const el = container.querySelector('dialog');
  if (!el) throw new Error('ダイアログが描画されていません');
  return el;
};

/** 開け閉めを持つ枠。**利用側と同じ書き方で組む** */
const Harness = ({ backdrop = false }: { backdrop?: boolean }) => {
  const modal = useModal();
  return (
    <div>
      <Button onClick={modal.show}>開く</Button>
      <button type="button">よそ</button>
      <Modal
        open={modal.open}
        onClose={modal.hide}
        closeOnBackdrop={backdrop}
        title="確認"
        actions={<Button onClick={modal.hide}>閉じる</Button>}
      >
        本当に消しますか
      </Modal>
    </div>
  );
};

const openIt = async (container: HTMLElement) => {
  const trigger = [...container.querySelectorAll('button')].find(
    (b) => b.textContent === '開く',
  );
  await userEvent.click(trigger as Element);
  await expect.poll(() => dialogIn(container).open).toBe(true);
  return trigger as HTMLElement;
};

describe('前提', () => {
  it('生成した CSS が当たっている', () => {
    expect(
      getComputedStyle(document.documentElement).getPropertyValue('--sg-space-surface').trim(),
    ).not.toBe('');
  });
});

describe('開くとき', () => {
  it('最前面の層に出る', async () => {
    const { container } = await render(onSurface(<Harness />));
    await openIt(container);
    /*
      **属性だけで出すと、この層に入らない。** 入らないとフォーカスの閉じ込めも
      後ろの遮断も効かないが、**見た目は出る**ので気づけない。

      `:modal` は「最前面の層に出ているダイアログ」だけに当たる。
    */
    expect(dialogIn(container).matches(':modal')).toBe(true);
  });

  it('後ろが操作できなくなる', async () => {
    const { container } = await render(onSurface(<Harness />));
    await openIt(container);
    const outside = [...container.querySelectorAll('button')].find(
      (b) => b.textContent === 'よそ',
    ) as HTMLElement;
    outside.focus();
    // **後ろは触れない。** フォーカスも移らない
    expect(document.activeElement).not.toBe(outside);
  });

  it('フォーカスがダイアログの中へ入る', async () => {
    const { container } = await render(onSurface(<Harness />));
    await openIt(container);
    await expect
      .poll(() => dialogIn(container).contains(document.activeElement))
      .toBe(true);
  });

  it('後ろの巻き取りを止める', async () => {
    const { container } = await render(onSurface(<Harness />));
    await openIt(container);
    // **`showModal()` は操作は止めるが巻き取りは止めない。** 自分で止める
    expect(getComputedStyle(document.body).overflow).toBe('hidden');
  });
});

describe('出入りの動き', () => {
  it('ダイアログと覆いが一緒に動き、閉じるときも動ける', async () => {
    const { container } = await render(onSurface(<Harness />));
    await openIt(container);
    const dialog = dialogIn(container);

    /*
      **補間の途中の値を読まない**——読む時点の状態を自分で決められないので、
      速さが違えば別の値になる。このリポジトリで3度踏んでいる形である。

      代わりに**動きの根拠になっている宣言**を読む。
    */
    const cs = getComputedStyle(dialog);
    expect(cs.transitionProperty).toContain('opacity');
    expect(Number.parseFloat(cs.transitionDuration)).toBeGreaterThan(0);
    /*
      **閉じるときが本題である。** `close()` は表示を即座に消すので、
      `display` と `overlay` を遷移させないと**消えてから動く**ことになり、
      動きが見えない。
    */
    expect(cs.transitionProperty).toContain('display');
    expect(cs.transitionProperty).toContain('overlay');
    expect(cs.transitionBehavior).toContain('allow-discrete');

    // 覆いも一緒に動く。**ダイアログだけ動くと、覆いが先に消えてちらつく**
    const back = getComputedStyle(dialog, '::backdrop');
    expect(back.transitionProperty).toContain('opacity');
    expect(Number.parseFloat(back.transitionDuration)).toBeGreaterThan(0);

    /*
      **本当に動いているか**は、ブラウザが持っている遷移の一覧から見る。
      補間の途中の値そのものは読まない——読む時点を自分で決められない。

      一覧に出るかどうかは「動き終わる前に見たか」に依るが、
      **遅い側へ倒れても消えない**（遅いほど残っている）。
    */
    const running = dialog.getAnimations().map((a) => a.constructor.name);
    expect(running.length, '遷移が1つも走っていない').toBeGreaterThan(0);

    // 落ち着いた先は見えている状態である
    await expect.poll(() => getComputedStyle(dialog).opacity).toBe('1');
  });
});

describe('閉じるとき', () => {
  it('Escape で閉じ、閉じたことが親へ返る', async () => {
    const { container } = await render(onSurface(<Harness />));
    await openIt(container);
    await userEvent.keyboard('{Escape}');
    await expect.poll(() => dialogIn(container).open).toBe(false);
    /*
      **返らないと、利用側は開いていると思ったままになる。**
      そのまま「開く」を押しても、状態が変わらないので開かない。
    */
    const trigger = [...container.querySelectorAll('button')].find(
      (b) => b.textContent === '開く',
    ) as HTMLElement;
    await userEvent.click(trigger);
    await expect.poll(() => dialogIn(container).open).toBe(true);
  });

  it('閉じると、開く前の場所へフォーカスが戻る', async () => {
    const { container } = await render(onSurface(<Harness />));
    const trigger = await openIt(container);
    await userEvent.keyboard('{Escape}');
    await expect.poll(() => dialogIn(container).open).toBe(false);
    // **ブラウザが持っている。** 自前で書くと、戻し先を覚える仕組みが要る
    await expect.poll(() => document.activeElement).toBe(trigger);
  });

  it('巻き取りが戻る', async () => {
    const { container } = await render(onSurface(<Harness />));
    await openIt(container);
    await userEvent.keyboard('{Escape}');
    await expect.poll(() => getComputedStyle(document.body).overflow).not.toBe('hidden');
  });

  it('閉じる印を押しても閉じる', async () => {
    const { container } = await render(onSurface(<Harness />));
    await openIt(container);
    const close = container.querySelector('[aria-label="閉じる"]');
    // **`Escape` だけだと、触って操作している人には閉じ方が無い**
    await userEvent.click(close as Element);
    await expect.poll(() => dialogIn(container).open).toBe(false);
  });
});

describe('覆いを押したとき', () => {
  it('既定では閉じない', async () => {
    const { container } = await render(onSurface(<Harness />));
    await openIt(container);
    const dialog = dialogIn(container);
    const box = dialog.getBoundingClientRect();
    // ダイアログの外（覆いの上）を押す
    await userEvent.click(document.documentElement, {
      position: { x: Math.max(2, box.left / 2), y: Math.max(2, box.top / 2) },
    });
    // **取り違えると、中を押したのに閉じる。** 消える操作の前では代償が大きい
    expect(dialog.open).toBe(true);
  });
});

describe('読み上げに渡すもの', () => {
  it('見出しがこのダイアログの名前になる', async () => {
    const { container } = await render(onSurface(<Harness />));
    await openIt(container);
    const dialog = dialogIn(container);
    const id = dialog.getAttribute('aria-labelledby');
    expect(id).not.toBeNull();
    // **無いと「ダイアログ」としか言わない**
    expect(container.querySelector(`#${CSS.escape(id as string)}`)?.textContent).toBe('確認');
  });

  it('面を宣言する', async () => {
    const { container } = await render(onSurface(<Harness />));
    await openIt(container);
    const dialog = dialogIn(container);
    expect(dialog.getAttribute('data-sg-surface')).toBe('overlay');
    expect(getComputedStyle(dialog).backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
  });

  it('後ろが覆われ、透けている', async () => {
    const { container } = await render(onSurface(<Harness />));
    await openIt(container);
    const dialog = dialogIn(container);
    // **塗るだけの道は無い。** 宣言した要素の ::backdrop だけが塗られる
    expect(dialog.hasAttribute('data-sg-scrim')).toBe(true);
    /*
      **実際に塗られている色を読む。** 変数が定義されていることを見ても、
      規則が当たっているかは分からない——変数は宣言していない差し込み口なので、
      そもそも `:root` には無い。
    */
    const painted = getComputedStyle(dialog, '::backdrop').backgroundColor;
    expect(painted).not.toBe('rgba(0, 0, 0, 0)');
    /*
      **透けることが役目である。** 不透明だと、元の画面がまだそこにあることが伝わらない。

      色の書き方は仕組みが決める（`oklab(... / 0.5)` で返る）ので、
      **不透明度だけを取り出して見る。** 書き方に依らない形で書いてある。
    */
    const alpha = /\/\s*([\d.]+)\s*\)$/.exec(painted)?.[1];
    expect(alpha, painted).toBeDefined();
    expect(Number(alpha)).toBeGreaterThan(0);
    expect(Number(alpha)).toBeLessThan(1);
  });
});

describe('開け閉めを持つもの', () => {
  it('利用側が開いているかを読める', async () => {
    const Watcher = () => {
      const modal = useModal();
      const [seen, setSeen] = useState(0);
      return (
        <div>
          <Button onClick={modal.show}>開く</Button>
          <p data-testid="state">{modal.open ? '開いている' : '閉じている'}</p>
          <p data-testid="count">{seen}</p>
          <Modal
            open={modal.open}
            onClose={() => {
              setSeen((n) => n + 1);
              modal.hide();
            }}
            title="確認"
          >
            中身
          </Modal>
        </div>
      );
    };
    const { container } = await render(onSurface(<Watcher />));
    const state = () => container.querySelector('[data-testid="state"]')?.textContent;
    expect(state()).toBe('閉じている');
    await openIt(container);
    // **部品の中に隠すと、利用側からは開いたことしか分からない**
    await expect.poll(state).toBe('開いている');
    await userEvent.keyboard('{Escape}');
    await expect.poll(state).toBe('閉じている');
    expect(container.querySelector('[data-testid="count"]')?.textContent).toBe('1');
  });
});
