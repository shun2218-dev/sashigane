import { Search } from 'lucide-react';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import { defineIcon, IconX } from './icon.tsx';
import '../../test/tokens.css';

/**
 * Icon の保証。**実ブラウザで走る。**
 *
 * 測るのは3つである。
 *
 *   **寸法がクラスから来ること** — 属性で渡すとクラスに負け、**何も起きないまま消える**
 *   **既定で読み上げから隠れること** — 文字の隣で同じことを言うので二重に読まれる
 *   **包む形が公開されていること** — ここに無い図案を利用側が同じ形で足せる
 */

const onSurface = (node: React.ReactNode) => <div data-sg-surface="page">{node}</div>;

const svgIn = (container: HTMLElement) => {
  const el = container.querySelector('svg');
  if (!el) throw new Error('アイコンが描画されていません');
  return el;
};

describe('前提', () => {
  it('生成した CSS が当たっている', () => {
    expect(
      getComputedStyle(document.documentElement).getPropertyValue('--sg-space-surface').trim(),
    ).not.toBe('');
  });
});

describe('寸法', () => {
  it('行の高さと同じ大きさになる', async () => {
    const { container } = await render(onSurface(<IconX />));
    const r = svgIn(container).getBoundingClientRect();
    expect(Math.round(r.width)).toBe(24);
    expect(Math.round(r.height)).toBe(24);
  });

  it('属性で渡した寸法は効かない', async () => {
    /*
     * lucide は `width` / `height` の**属性**で書くが、こちらはクラスで書く。
     * **CSS は属性に勝つ**ので、渡しても何も起きないまま消える。
     * だから `size` を props から外してある——**測って確かめた。**
     */
    const { container } = await render(
      // 型では塞いであるが、型を持たない側から来ることもある
      onSurface(<IconX {...({ size: 64 } as Record<string, unknown>)} />),
    );
    expect(Math.round(svgIn(container).getBoundingClientRect().width)).toBe(24);
  });

  it('大きさは段で選ぶ', async () => {
    const sm = await render(onSurface(<IconX size="sm" />));
    const md = await render(onSurface(<IconX size="md" />));
    expect(Math.round(svgIn(sm.container).getBoundingClientRect().width)).toBe(16);
    expect(Math.round(svgIn(md.container).getBoundingClientRect().width)).toBe(24);
  });

  it('className で大きさは上書きできない', async () => {
    /*
     * **このシステムは同じ次元の上書きを保証していない。**
     * 実際、`size-4` を渡しても既定の `size-6` に負ける——
     * どちらが後に出るかは Tailwind の並べ方が決めるためである。
     *
     * だから段を持たせた。**負ける形が生まれない。**
     * ここで測っているのは仕様であって、直すべき欠陥ではない。
     */
    const { container } = await render(onSurface(<IconX className="size-4" />));
    expect(Math.round(svgIn(container).getBoundingClientRect().width)).toBe(24);
  });
});

describe('読み上げ', () => {
  it('既定は隠れている', async () => {
    const { container } = await render(onSurface(<IconX />));
    // **文字の隣で同じことを言っている**ので、隠さないと二重に読まれる
    expect(svgIn(container).getAttribute('aria-hidden')).toBe('true');
    expect(svgIn(container).getAttribute('focusable')).toBe('false');
  });

  it('名前を渡すと隠れない', async () => {
    const { container } = await render(onSurface(<IconX aria-label="閉じる" />));
    expect(svgIn(container).hasAttribute('aria-hidden')).toBe(false);
    expect(svgIn(container).getAttribute('aria-label')).toBe('閉じる');
  });
});

describe('名乗りと包む形', () => {
  it('自分の名前を名乗る', async () => {
    const { container } = await render(onSurface(<IconX />));
    expect(svgIn(container).getAttribute('data-sg-component')).toBe('icon-x');
  });

  it('ここに無い図案も同じ形で包める', async () => {
    // **包む形を公開している。** 図案を全部持たない代わりに、足す道を配る
    const IconSearch = defineIcon(Search, 'icon-search');
    const { container } = await render(onSurface(<IconSearch />));
    const el = svgIn(container);
    expect(el.getAttribute('data-sg-component')).toBe('icon-search');
    expect(Math.round(el.getBoundingClientRect().width)).toBe(24);
    expect(el.getAttribute('aria-hidden')).toBe('true');
  });

  it('色は前景を継承する', async () => {
    const plain = await render(onSurface(<IconX />));
    const onFill = await render(
      <div data-sg-surface="page">
        <div data-sg-fill="accent">
          <IconX />
        </div>
      </div>,
    );
    const a = getComputedStyle(svgIn(plain.container));
    const b = getComputedStyle(svgIn(onFill.container));
    // lucide は stroke に currentColor を使う。**塗りの上では前景が変わる**
    expect(b.color).not.toBe(a.color);
  });
});
