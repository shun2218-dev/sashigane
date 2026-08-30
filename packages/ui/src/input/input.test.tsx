import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import { Input } from './input.tsx';
import '../../test/tokens.css';

/**
 * Input の保証。**実ブラウザで走る。**
 *
 * 測るのは2つである。
 *
 *   **凹んだ面を宣言すること** — 背景だけを塗ると前景が置き去りになる
 *   **誤りの境界が文字色でないこと** — mark の段を使う。取り違えは検査では捕まらない
 */

const onSurface = (node: React.ReactNode) => <div data-sg-surface="page">{node}</div>;

const inputIn = (container: HTMLElement) => {
  const el = container.querySelector('input');
  if (!el) throw new Error('入力が描画されていません');
  return el;
};

describe('前提', () => {
  it('生成した CSS が当たっている', () => {
    expect(
      getComputedStyle(document.documentElement).getPropertyValue('--sg-space-surface').trim(),
    ).not.toBe('');
  });
});

describe('面', () => {
  it('凹んだ面を宣言する', async () => {
    const { container } = await render(onSurface(<Input aria-label="x" />));
    const el = inputIn(container);
    expect(el.getAttribute('data-sg-surface')).toBe('inset');
    // **面が塗っていること。** 透明なら宣言が効いていない
    expect(getComputedStyle(el).backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
  });

  it('ページの地とは違う色になる', async () => {
    const { container } = await render(onSurface(<Input aria-label="x" />));
    const page = container.querySelector('[data-sg-surface="page"]');
    if (!page) throw new Error('面が無い');
    const bg = (el: Element) => getComputedStyle(el).backgroundColor;
    // **凹んで見えないと、入力できる場所だと分からない**
    expect(bg(inputIn(container))).not.toBe(bg(page));
  });
});

describe('境界', () => {
  it('境界が幅を持ち、文字色ではない', async () => {
    const { container } = await render(onSurface(<Input aria-label="x" />));
    const s = getComputedStyle(inputIn(container));
    // **幅を見る。** 色だけを見ると、境界を消しても通る
    expect(Number.parseFloat(s.borderTopWidth)).toBeGreaterThan(0);
    expect(s.borderTopColor).not.toBe(s.color);
  });

  it('誤りのときは境界が変わる', async () => {
    const plain = await render(onSurface(<Input aria-label="x" />));
    const bad = await render(onSurface(<Input aria-label="x" aria-invalid />));
    const border = (el: Element) => getComputedStyle(el).borderTopColor;
    expect(border(inputIn(bad.container))).not.toBe(border(inputIn(plain.container)));
    // **境界だけで伝えない。** Field が文言も一緒に出す
    expect(Number.parseFloat(getComputedStyle(inputIn(bad.container)).borderTopWidth))
      .toBeGreaterThan(0);
  });

  it('aria-invalid を自分では書かない', async () => {
    const { container } = await render(onSurface(<Input aria-label="x" />));
    // **付けるのは Field である。** ここで決めると、Field を使わない書き方だけが誤りを名乗れる
    expect(inputIn(container).hasAttribute('aria-invalid')).toBe(false);
  });
});

describe('押せないとき', () => {
  it('文字が淡くなる。不透明度では表さない', async () => {
    const plain = await render(onSurface(<Input aria-label="x" />));
    const off = await render(onSurface(<Input aria-label="x" disabled />));
    const a = getComputedStyle(inputIn(plain.container));
    const b = getComputedStyle(inputIn(off.container));
    expect(b.color).not.toBe(a.color);
    // **薄めると前景と背景が同時に下地へ寄り、読みやすさの保証が効かなくなる**
    expect(b.opacity).toBe('1');
  });
});
