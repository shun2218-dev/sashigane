import { userEvent } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from './accordion.tsx';
import '../../test/tokens.css';

/**
 * Accordion の保証。**実ブラウザで走る。**
 *
 * 測るのは3つである。
 *
 *   **素の仕組みに乗っていること** — `details` / `summary` を使わずに組むと、
 *   鍵盤も読み上げも自分で書くことになる
 *   **申告が二重になっていないこと** — `aria-expanded` を自分で書くと、
 *   ブラウザの申告と重なる
 *   **既定の三角が出ていないこと** — 出ると矢印と二重になる
 */

const onSurface = (node: React.ReactNode) => <div data-sg-surface="page">{node}</div>;

const one = (children: React.ReactNode, props: Record<string, unknown> = {}) =>
  onSurface(
    <Accordion>
      <AccordionItem {...props}>
        <AccordionTrigger>取っ手</AccordionTrigger>
        <AccordionContent>{children}</AccordionContent>
      </AccordionItem>
    </Accordion>,
  );

const detailsIn = (container: HTMLElement) => {
  const el = container.querySelector('details');
  if (!el) throw new Error('details が描画されていません');
  return el;
};

describe('前提', () => {
  it('生成した CSS が当たっている', () => {
    expect(
      getComputedStyle(document.documentElement).getPropertyValue('--sg-space-surface').trim(),
    ).not.toBe('');
  });
});

describe('素の仕組みに乗る', () => {
  it('details と summary を使う', async () => {
    const { container } = await render(one('中身'));
    expect(detailsIn(container).tagName).toBe('DETAILS');
    expect(container.querySelector('summary')).not.toBeNull();
  });

  it('取っ手を押すと開く', async () => {
    const { container } = await render(one('中身'));
    const details = detailsIn(container);
    const summary = container.querySelector('summary');
    if (!summary) throw new Error('summary が描画されていません');

    expect(details.open).toBe(false);
    await userEvent.click(summary);
    // **状態を持っていない。** 開けるのはブラウザである
    expect(details.open).toBe(true);
  });

  it('開いた状態で描ける', async () => {
    const { container } = await render(one('中身', { defaultOpen: true }));
    expect(detailsIn(container).open).toBe(true);
  });

  it('同じ名前のものは一度に1つしか開かない', async () => {
    const { container } = await render(
      onSurface(
        <Accordion>
          <AccordionItem name="g" defaultOpen>
            <AccordionTrigger>1</AccordionTrigger>
            <AccordionContent>a</AccordionContent>
          </AccordionItem>
          <AccordionItem name="g">
            <AccordionTrigger>2</AccordionTrigger>
            <AccordionContent>b</AccordionContent>
          </AccordionItem>
        </Accordion>,
      ),
    );
    const [first, second] = [...container.querySelectorAll('details')];
    if (!first || !second) throw new Error('details が2つ描画されていません');
    expect(first.open).toBe(true);

    const summaries = container.querySelectorAll('summary');
    await userEvent.click(summaries[1] as Element);
    // **ブラウザが面倒を見る。** こちらは名前を渡すだけである
    expect(second.open).toBe(true);
    expect(first.open).toBe(false);
  });
});

describe('申告を二重にしない', () => {
  it('aria-expanded を自分で書かない', async () => {
    const { container } = await render(one('中身'));
    const summary = container.querySelector('summary');
    // **ブラウザが既に申告している。** 書くと二重になる
    expect(summary?.hasAttribute('aria-expanded')).toBe(false);
  });

  it('役割を付け替えない', async () => {
    const { container } = await render(one('中身'));
    expect(detailsIn(container).hasAttribute('role')).toBe(false);
    expect(container.querySelector('summary')?.hasAttribute('role')).toBe(false);
  });
});

describe('見た目', () => {
  it('既定の三角が出ない', async () => {
    const { container } = await render(one('中身'));
    const summary = container.querySelector('summary');
    if (!summary) throw new Error('summary が描画されていません');
    /*
     * 既定の三角は `display: list-item` に付く。**`flex` にすると出なくなる。**
     * `list-style` だけでは Safari で残るので、効いているのは `flex` の方である。
     */
    expect(getComputedStyle(summary).display).toBe('flex');
  });

  it('矢印が開閉で向きを変える', async () => {
    const { container } = await render(one('中身'));
    const arrow = container.querySelector('[data-sg-component="icon-chevron-down"]');
    if (!arrow) throw new Error('矢印が描画されていません');
    /*
     * **`transform` ではなく `rotate` を見る。**
     * 生成される規則は `rotate: 180deg` であって、`transform` は `none` のままである。
     * はじめ `transform` を見て落ちた——**測る先を間違えていた。**
     */
    const before = getComputedStyle(arrow).rotate;
    expect(before).toBe('none');

    const summary = container.querySelector('summary');
    await userEvent.click(summary as Element);
    // **開いていることが見た目から分かる**
    await expect.poll(() => getComputedStyle(arrow).rotate).toBe('180deg');
  });

  it('向きの変化が遷移の対象に入っている', async () => {
    const { container } = await render(one('中身'));
    const arrow = container.querySelector('[data-sg-component="icon-chevron-down"]');
    if (!arrow) throw new Error('矢印が描画されていません');
    /*
     * `rotate` は `transform` とは別のプロパティである。
     * **遷移の対象に入っていないと、向きが瞬間で変わる。**
     */
    expect(getComputedStyle(arrow).transitionProperty).toContain('rotate');
  });

  it('升が下辺に線を持つ', async () => {
    const { container } = await render(one('中身'));
    const s = getComputedStyle(detailsIn(container));
    // **幅を見る。** 色だけを見ると、線を消しても通る
    expect(Number.parseFloat(s.borderBottomWidth)).toBeGreaterThan(0);
    expect(s.borderBottomColor).not.toBe(s.color);
  });
});
