import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import { List, ListItem } from './list.tsx';
import '../../test/tokens.css';

/**
 * List の保証。**実ブラウザで走る。**
 *
 * 測るのは3つである。
 *
 *   **順序が意味として出ること** — 見た目だけ数字にしても読み上げは順序を知らない
 *   **線が幅を持つこと** — 色だけを見ると、線を消しても通る（Badge と Spinner で踏んだ形）
 *   **最初の升に線が無いこと** — 上端に線が残ると器の枠に見える
 */

const onSurface = (node: React.ReactNode) => <div data-sg-surface="page">{node}</div>;

const listIn = (container: HTMLElement) => {
  const el = container.querySelector('[data-sg-component="list"]');
  if (!el) throw new Error('List が描画されていません');
  return el;
};

const edges = (el: Element) => {
  const s = getComputedStyle(el);
  return {
    top: Number.parseFloat(s.borderTopWidth),
    topColor: s.borderTopColor,
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

describe('意味', () => {
  it('既定は順序の無い並びになる', async () => {
    const { container } = await render(
      onSurface(
        <List>
          <ListItem>x</ListItem>
        </List>,
      ),
    );
    expect(listIn(container).tagName).toBe('UL');
  });

  it('順序のある並びは ol になる', async () => {
    const { container } = await render(
      onSurface(
        <List ordered marker="number">
          <ListItem>x</ListItem>
        </List>,
      ),
    );
    // **見た目ではなく意味である。** 数字に見えるだけでは読み上げが順序を知らない
    expect(listIn(container).tagName).toBe('OL');
  });

  it('升は li である', async () => {
    const { container } = await render(
      onSurface(
        <List>
          <ListItem>x</ListItem>
        </List>,
      ),
    );
    expect(container.querySelector('[data-sg-component="list-item"]')?.tagName).toBe('LI');
  });
});

describe('印', () => {
  it('既定は出さない', async () => {
    const { container } = await render(
      onSurface(
        <List>
          <ListItem>x</ListItem>
        </List>,
      ),
    );
    expect(getComputedStyle(listIn(container)).listStyleType).toBe('none');
  });

  it('3種がそれぞれ違う', async () => {
    const seen = new Set<string>();
    for (const marker of ['none', 'bullet', 'number'] as const) {
      const { container } = await render(
        onSurface(
          <List marker={marker}>
            <ListItem>x</ListItem>
          </List>,
        ),
      );
      seen.add(getComputedStyle(listIn(container)).listStyleType);
    }
    expect(seen.size).toBe(3);
  });

  it('印を出すと字下げが付く', async () => {
    const none = await render(
      onSurface(
        <List>
          <ListItem>x</ListItem>
        </List>,
      ),
    );
    const bullet = await render(
      onSurface(
        <List marker="bullet">
          <ListItem>x</ListItem>
        </List>,
      ),
    );
    const pad = (el: Element) => Number.parseFloat(getComputedStyle(el).paddingInlineStart);
    // **付けないと印が器の外へ出る**
    expect(pad(listIn(bullet.container))).toBeGreaterThan(pad(listIn(none.container)));
  });
});

describe('区切り線', () => {
  it('線は升が持ち、最初の升は持たない', async () => {
    const { container } = await render(
      onSurface(
        <List separated>
          <ListItem separated>1</ListItem>
          <ListItem separated>2</ListItem>
        </List>,
      ),
    );
    const [first, second] = [...container.querySelectorAll('[data-sg-component="list-item"]')];
    if (!first || !second) throw new Error('升が2つ描画されていません');
    // **上端に線が残ると器の枠に見える**
    expect(edges(first).top).toBe(0);
    // **幅を見る。** 色だけを見ると、線を消しても通る
    expect(edges(second).top).toBeGreaterThan(0);
    // **境界の役割であること。** border-default は文字色を指す
    expect(edges(second).topColor).not.toBe(edges(second).color);
  });

  it('線を選ぶと升の間隔は詰まる', async () => {
    const plain = await render(
      onSurface(
        <List>
          <ListItem>1</ListItem>
        </List>,
      ),
    );
    const separated = await render(
      onSurface(
        <List separated>
          <ListItem separated>1</ListItem>
        </List>,
      ),
    );
    const gap = (el: Element) => Number.parseFloat(getComputedStyle(el).rowGap);
    // **線が間隔を担う**ので、二重に空けない
    expect(gap(listIn(separated.container))).toBe(0);
    expect(gap(listIn(plain.container))).toBeGreaterThan(0);
  });

  it('升が線を持つかは、器から自動では降りない', async () => {
    const { container } = await render(
      onSurface(
        <List separated>
          <ListItem>1</ListItem>
          <ListItem>2</ListItem>
        </List>,
      ),
    );
    const items = [...container.querySelectorAll('[data-sg-component="list-item"]')];
    /*
     * **仕様として測っておく。** `li` は器の直下とは限らず、
     * 間に何かを挟んだときに静かにずれる。
     * 降ろす形にするなら、この検査が落ちる。
     */
    for (const item of items) expect(edges(item).top).toBe(0);
  });
});
