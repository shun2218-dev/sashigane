import { describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { Alert } from './alert.tsx';
import '../../test/tokens.css';

/**
 * Alert の保証。**実ブラウザで走る。**
 *
 * 測るのは5つである。
 *
 *   **既定で読み上げの領域にならないこと** — 文書の順に読まれるものを二重にしない
 *   **割り込むのは danger だけであること** — 全部割り込むと読んでいる文が毎回切れる
 *   **見出しと本文が結びつくこと** — 利用側に書かせると忘れられる
 *   **閉じる釦は渡したときだけ出ること** — 消してはいけない知らせがある
 *   **中立が面を宣言し、色付きが塗りの対を持つこと** — 塗るだけの道が残っていないこと
 */

const onSurface = (node: React.ReactNode) => <div data-sg-surface="page">{node}</div>;

const alertIn = (c: HTMLElement) => {
  const el = c.querySelector('[data-sg-component="alert"]');
  if (!el) throw new Error('Alert が描画されていません');
  return el as HTMLElement;
};

const styleOf = (el: Element) => {
  const s = getComputedStyle(el);
  return { background: s.backgroundColor, color: s.color };
};

describe('読み上げ', () => {
  it('既定では領域にならない', async () => {
    const { container } = await render(onSurface(<Alert title="t">本文</Alert>));
    // **文書の順に読まれるものを領域にすると二重になる**
    await expect.poll(() => alertIn(container).getAttribute('role')).toBe(null);
  });

  it('live を渡すと領域になる', async () => {
    const { container } = await render(onSurface(<Alert title="t" live>本文</Alert>));
    await expect.poll(() => alertIn(container).getAttribute('role')).toBe('status');
  });

  it('割り込むのは danger だけである', async () => {
    const danger = await render(onSurface(<Alert tone="danger" live>失敗</Alert>));
    await expect.poll(() => alertIn(danger.container).getAttribute('role')).toBe('alert');
    // **全部割り込ませると、読んでいる途中の文が毎回切られる**
    for (const tone of ['warning', 'success', 'info', 'accent'] as const) {
      const { container } = await render(onSurface(<Alert tone={tone} live>知らせ</Alert>));
      expect(alertIn(container).getAttribute('role')).toBe('status');
    }
  });
});

describe('結びつき', () => {
  it('見出しが名前になり、本文が説明になる', async () => {
    const { container } = await render(onSurface(<Alert title="保存できません">理由</Alert>));
    const el = alertIn(container);
    const titleId = el.getAttribute('aria-labelledby');
    const bodyId = el.getAttribute('aria-describedby');
    // **利用側に書かせない。** 忘れても見た目は変わらない
    expect(container.querySelector(`#${titleId}`)?.textContent).toBe('保存できません');
    expect(container.querySelector(`#${bodyId}`)?.textContent).toBe('理由');
  });

  it('見出しが無ければ名前も指さない', async () => {
    const { container } = await render(onSurface(<Alert>本文だけ</Alert>));
    await expect.poll(() => alertIn(container).getAttribute('aria-labelledby')).toBe(null);
    // **空の id を指さない。** 指すと読み上げが名前を見つけられない
    expect(alertIn(container).getAttribute('aria-describedby')).not.toBe(null);
  });

  it('2つ置いても id がぶつからない', async () => {
    const { container } = await render(
      onSurface(
        <>
          <Alert title="1つめ">A</Alert>
          <Alert title="2つめ">B</Alert>
        </>,
      ),
    );
    await expect
      .poll(() => container.querySelectorAll('[data-sg-component="alert"]').length)
      .toBe(2);
    const ids = [...container.querySelectorAll('[data-sg-component="alert-title"]')].map(
      (e) => e.id,
    );
    expect(new Set(ids).size).toBe(2);
  });
});

describe('閉じる', () => {
  it('渡さなければ釦が出ない', async () => {
    const { container } = await render(onSurface(<Alert title="t">本文</Alert>));
    await expect.poll(() => alertIn(container).textContent).toContain('本文');
    // **消してはいけない知らせがある。** 既定で消せる形にしない
    expect(container.querySelector('button')).toBe(null);
  });

  it('渡すと釦が出て、押すと呼ばれる', async () => {
    let closed = 0;
    const { container } = await render(
      onSurface(
        <Alert title="t" onDismiss={() => { closed += 1; }}>
          本文
        </Alert>,
      ),
    );
    await expect.poll(() => container.querySelector('button')).not.toBe(null);
    const button = container.querySelector('button') as HTMLButtonElement;
    // **図案だけでは何の釦か読めない**
    expect(button.getAttribute('aria-label')).toBe('閉じる');
    await userEvent.click(button);
    await expect.poll(() => closed).toBe(1);
  });
});

describe('色', () => {
  it('中立は凹んだ面を宣言する', async () => {
    const { container } = await render(onSurface(<Alert>本文</Alert>));
    const el = alertIn(container);
    expect(el.getAttribute('data-sg-surface')).toBe('inset');
    // **面が塗っていること。** 透明なら宣言が効いていない
    await expect.poll(() => styleOf(el).background).not.toBe('rgba(0, 0, 0, 0)');
  });

  it('色付きは面を宣言しない', async () => {
    const { container } = await render(onSurface(<Alert tone="danger">本文</Alert>));
    // 淡い塗りが背景と文字を対で持つ。**面の宣言と二重にしない**
    await expect.poll(() => alertIn(container).getAttribute('data-sg-surface')).toBe(null);
  });

  it('5つのランプが、それぞれ違う見え方になる', async () => {
    const seen = new Set<string>();
    for (const tone of ['accent', 'danger', 'warning', 'success', 'info'] as const) {
      const { container } = await render(onSurface(<Alert tone={tone}>本文</Alert>));
      const el = alertIn(container);
      await expect.poll(() => styleOf(el).background).not.toBe('rgba(0, 0, 0, 0)');
      // **背景だけでなく文字も色ごとに解かれている**
      seen.add(`${styleOf(el).background}|${styleOf(el).color}`);
    }
    expect(seen.size).toBe(5);
  });
});
