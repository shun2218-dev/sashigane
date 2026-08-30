import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import { Table, TableCell, TableHeaderCell, TableRow } from './table.tsx';
import '../../test/tokens.css';

/**
 * Table の保証。**実ブラウザで走る。**
 *
 * 測るのは3つである。
 *
 *   **溢れたときに表の中だけが動くこと** — ページが動くと、表以外まで巻き込む
 *   **数字の桁が揃うこと** — 揃わないと上下の行を読み比べられない
 *   **見出しが申告されること** — 申告しないと、どの升がどの見出しに属するか言えない
 */

const onSurface = (node: React.ReactNode) => <div data-sg-surface="page">{node}</div>;

const wrapperIn = (container: HTMLElement) => {
  const el = container.querySelector('[data-sg-surface="page"] > div');
  if (!el) throw new Error('包む枠が描画されていません');
  return el;
};

const tableIn = (container: HTMLElement) => {
  const el = container.querySelector('table');
  if (!el) throw new Error('table が描画されていません');
  return el;
};

const sample = (
  <Table>
    <thead>
      <TableRow>
        <TableHeaderCell>名前</TableHeaderCell>
        <TableHeaderCell numeric>件数</TableHeaderCell>
      </TableRow>
    </thead>
    <tbody>
      <TableRow>
        <TableCell>x</TableCell>
        <TableCell numeric>12</TableCell>
      </TableRow>
    </tbody>
  </Table>
);

describe('前提', () => {
  it('生成した CSS が当たっている', () => {
    expect(
      getComputedStyle(document.documentElement).getPropertyValue('--sg-space-surface').trim(),
    ).not.toBe('');
  });
});

describe('横に溢れたとき', () => {
  it('包む枠を自分で描く', async () => {
    const { container } = await render(onSurface(sample));
    // **利用側に書かせない。** 忘れるとページ全体が横に動く
    expect(getComputedStyle(wrapperIn(container)).overflowX).toBe('auto');
  });

  it('溢れるのは枠の中だけで、ページは動かない', async () => {
    const { container } = await render(
      onSurface(
        <div style={{ width: 200 }}>
          <Table>
            <tbody>
              <TableRow>
                {Array.from({ length: 12 }, (_, i) => (
                  <TableCell key={i}>とても長い見出しの升</TableCell>
                ))}
              </TableRow>
            </tbody>
          </Table>
        </div>,
      ),
    );
    const wrap = container.querySelector('div[style] > div');
    if (!wrap) throw new Error('包む枠が描画されていません');
    // **枠の中が溢れていること。** 溢れていないなら、この検査は何も見ていない
    expect(wrap.scrollWidth).toBeGreaterThan(wrap.clientWidth);
    // **外側は溢れていないこと**
    const outer = wrap.parentElement;
    if (!outer) throw new Error('外側が無い');
    expect(outer.scrollWidth).toBe(outer.clientWidth);
  });
});

describe('数字の列', () => {
  it('右に寄り、等幅になる', async () => {
    const { container } = await render(onSurface(sample));
    const [name, count] = [...container.querySelectorAll('tbody td')];
    if (!name || !count) throw new Error('升が描画されていません');
    expect(getComputedStyle(name).textAlign).toBe('left');
    expect(getComputedStyle(count).textAlign).toBe('right');
    // **桁の幅を揃える指定が当たっていること**
    expect(getComputedStyle(count).fontFeatureSettings).toContain('tnum');
    expect(getComputedStyle(name).fontFamily).not.toBe(getComputedStyle(count).fontFamily);
  });

  it('見出しの升も同じ側へ寄る', async () => {
    const { container } = await render(onSurface(sample));
    const [, count] = [...container.querySelectorAll('thead th')];
    expect(getComputedStyle(count as Element).textAlign).toBe('right');
  });
});

describe('行の線', () => {
  it('行が下辺に線を持つ', async () => {
    const { container } = await render(onSurface(sample));
    const row = container.querySelector('tbody tr');
    if (!row) throw new Error('行が描画されていません');
    const s = getComputedStyle(row);
    // **幅を見る。** 色だけを見ると、線を消しても通る
    expect(Number.parseFloat(s.borderBottomWidth)).toBeGreaterThan(0);
    // **境界の役割であること。** border-default は文字色を指す
    expect(s.borderBottomColor).not.toBe(s.color);
  });

  it('升が枠に潰れない余白を持つ', async () => {
    const { container } = await render(onSurface(sample));
    const cell = container.querySelector('tbody td');
    if (!cell) throw new Error('升が描画されていません');
    const s = getComputedStyle(cell);
    expect(Number.parseFloat(s.paddingLeft)).toBeGreaterThan(0);
    expect(Number.parseFloat(s.paddingTop)).toBeGreaterThan(0);
  });
});

describe('読み上げへの申告', () => {
  it('見出しの升は既定で列の見出しになる', async () => {
    const { container } = await render(onSurface(sample));
    for (const th of container.querySelectorAll('thead th')) {
      expect(th.getAttribute('scope')).toBe('col');
    }
  });

  it('行の見出しにもできる', async () => {
    const { container } = await render(
      onSurface(
        <Table>
          <tbody>
            <TableRow>
              <TableHeaderCell scope="row">1 回目</TableHeaderCell>
              <TableCell numeric>12</TableCell>
            </TableRow>
          </tbody>
        </Table>,
      ),
    );
    expect(container.querySelector('tbody th')?.getAttribute('scope')).toBe('row');
  });

  it('表そのものは素の table である', async () => {
    const { container } = await render(onSurface(sample));
    // **役割を付け替えない。** 素の table が既に表として読まれる
    expect(tableIn(container).hasAttribute('role')).toBe(false);
    expect(getComputedStyle(tableIn(container)).borderCollapse).toBe('collapse');
  });
});
