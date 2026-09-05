import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import { Separator } from './separator.tsx';
import '../../test/tokens.css';

/**
 * Separator の保証。**実ブラウザで走る。**
 *
 * 測るのは3つである。
 *
 *   **線が幅を持つこと** — 色だけを見ると、線を消しても通る（Badge と Spinner で踏んだ形）
 *   **色が境界の役割から来ること** — 文字色を指していないこと
 *   **飾りが読み上げに出ないこと** — 出すと「区切り」が数えられるだけになる
 */

const onSurface = (node: React.ReactNode) => <div data-sg-surface="page">{node}</div>;

const sepIn = (container: HTMLElement) => {
  const el = container.querySelector('[data-sg-surface="page"] > *');
  if (!el) throw new Error('Separator が描画されていません');
  return el;
};

const edges = (el: Element) => {
  const s = getComputedStyle(el);
  return {
    top: Number.parseFloat(s.borderTopWidth),
    left: Number.parseFloat(s.borderLeftWidth),
    topColor: s.borderTopColor,
    leftColor: s.borderLeftColor,
    color: s.color,
  };
};

describe('前提', () => {
  it('生成した CSS が当たっている', () => {
    expect(
      getComputedStyle(document.documentElement).getPropertyValue('--sg-space-surface').trim(),
    ).not.toBe('');
  });
});

describe('線', () => {
  it('横向きは上辺に線を持つ', async () => {
    const { container } = await render(onSurface(<Separator />));
    const e = edges(sepIn(container));
    // **幅を見る。** 色だけを見ると、線を消しても通る
    expect(e.top).toBeGreaterThan(0);
    expect(e.left).toBe(0);
  });

  it('縦向きは左辺に線を持つ', async () => {
    const { container } = await render(onSurface(<Separator orientation="vertical" />));
    const e = edges(sepIn(container));
    expect(e.left).toBeGreaterThan(0);
    expect(e.top).toBe(0);
  });

  it('色は境界の役割から来ていて、文字色ではない', async () => {
    const { container } = await render(onSurface(<Separator />));
    const e = edges(sepIn(container));
    /*
     * **`border-{default}` は文字色を指す。** どちらも生成されるので、
     * 取り違えても検査は捕まえない。ここで測るしかない。
     */
    expect(e.topColor).not.toBe(e.color);
    expect(e.topColor).not.toBe('rgba(0, 0, 0, 0)');
  });

  it('横向きは親の幅いっぱいに伸びる', async () => {
    const { container } = await render(onSurface(<Separator />));
    const parent = container.querySelector('[data-sg-surface="page"]');
    if (!parent) throw new Error('面が無い');
    expect(sepIn(container).getBoundingClientRect().width).toBe(
      parent.getBoundingClientRect().width,
    );
  });
});

describe('読み上げへの意味', () => {
  it('既定は飾りで、読み上げに出ない', async () => {
    const { container } = await render(onSurface(<Separator />));
    expect(sepIn(container).getAttribute('role')).toBe('none');
  });

  it('意味のある区切りは読み上げに出る', async () => {
    const { container } = await render(onSurface(<Separator decorative={false} />));
    expect(sepIn(container).getAttribute('role')).toBe('separator');
  });

  it('縦向きの意味のある区切りは、向きを申告する', async () => {
    const { container } = await render(
      onSurface(<Separator decorative={false} orientation="vertical" />),
    );
    expect(sepIn(container).getAttribute('aria-orientation')).toBe('vertical');
  });

  it('飾りは向きを申告しない', async () => {
    const { container } = await render(onSurface(<Separator orientation="vertical" />));
    // **読み上げに出ないものに向きを申告しても意味が無い**
    expect(sepIn(container).hasAttribute('aria-orientation')).toBe(false);
  });

  it('見た目は飾りかどうかで変わらない', async () => {
    const a = await render(onSurface(<Separator />));
    const b = await render(onSurface(<Separator decorative={false} />));
    // **変わるのは読み上げに出るかどうかだけ**である
    expect(edges(sepIn(b.container))).toEqual(edges(sepIn(a.container)));
  });
});
