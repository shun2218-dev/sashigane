import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import { Spinner } from './spinner.tsx';
import '../../test/tokens.css';

/**
 * Spinner の保証。**実ブラウザで走る。**
 *
 * 測るのは3つである。
 *
 *   **回っていること** — 止まっていても見た目は「輪」なので、静止画では区別が付かない
 *   **色を継承すること** — 置いた場所の前景に従わないと、面が変わるたびに書き直しになる
 *   **名前が要ること** — 動きを減らす設定では止まるので、読み上げだけが頼りになる
 */

const onSurface = (node: React.ReactNode) => <div data-sg-surface="page">{node}</div>;

const spinnerIn = (container: HTMLElement) => {
  const el = container.querySelector('[data-sg-spinner]');
  if (!el) throw new Error('Spinner が描画されていません');
  return el;
};

describe('前提', () => {
  it('生成した CSS が当たっている', () => {
    expect(
      getComputedStyle(document.documentElement).getPropertyValue('--sg-space-surface').trim(),
    ).not.toBe('');
  });
});

describe('回転', () => {
  it('回り続ける指定が当たっている', async () => {
    const { container } = await render(onSurface(<Spinner aria-label="読み込み中" />));
    const s = getComputedStyle(spinnerIn(container));
    expect(s.animationName).toBe('sg-spin');
    expect(s.animationIterationCount).toBe('infinite');
    // **加減速を付けない。** 回り続けるものに始点と終点は無い
    expect(s.animationTimingFunction).toBe('linear');
  });

  /*
   * **周期がスケールから来ていることは、ここでは測らない。**
   * 測るにはループ周期のプリミティブを読む必要があり、
   * コンポーネントはセマンティックしか参照できない（原則3）。
   * **検査が実際に落とした**ので、名前もここには書かない。
   *
   * 規則を持っているのはトークン層なので、**そちらのテストで測っている**
   * （`packages/tokens/test/tokens-css.test.ts`）。
   * ここで見るのは「その規則が実際に当たっていること」だけである。
   */

  it('実際に位置が変わる', async () => {
    const { container } = await render(onSurface(<Spinner aria-label="読み込み中" />));
    const el = spinnerIn(container);
    const first = getComputedStyle(el).transform;
    // **指定が当たっているだけでは動いている証拠にならない**ので、2度測る
    await expect.poll(() => getComputedStyle(el).transform, { timeout: 2000 }).not.toBe(first);
  });
});

describe('色と大きさ', () => {
  it('輪の色は前景を継承する', async () => {
    const plain = await render(onSurface(<Spinner aria-label="x" />));
    const onFill = await render(
      <div data-sg-surface="page">
        <div data-sg-fill="accent">
          <Spinner aria-label="x" />
        </div>
      </div>,
    );
    const a = getComputedStyle(spinnerIn(plain.container));
    const b = getComputedStyle(spinnerIn(onFill.container));
    // 上端は**わざと透明**にしてあるので、見えている側で比べる
    expect(b.borderRightColor).not.toBe(a.borderRightColor);
    // 文字の色そのものであること。**輪だけ別の色を持たない**
    expect(b.borderRightColor).toBe(b.color);
    expect(a.borderRightColor).toBe(a.color);
  });

  it('大きさは行の高さと同じ', async () => {
    const { container } = await render(onSurface(<Spinner aria-label="x" />));
    const r = spinnerIn(container).getBoundingClientRect();
    expect(Math.round(r.width)).toBe(24);
    expect(Math.round(r.height)).toBe(24);
  });

  it('輪が幅を持っている', async () => {
    const { container } = await render(onSurface(<Spinner aria-label="x" />));
    const s = getComputedStyle(spinnerIn(container));
    /*
     * **色だけを見ると、輪が無くても通る。**
     * preflight が `border: 0 solid` を当てるので、幅 0 の境界にも色は付く。
     * 実際、幅を外しても1件も落ちなかった（Badge で同じ形を踏んで気づいた）。
     */
    expect(Number.parseFloat(s.borderRightWidth)).toBeGreaterThan(0);
  });

  it('輪の一部が欠けている', async () => {
    const { container } = await render(onSurface(<Spinner aria-label="x" />));
    const s = getComputedStyle(spinnerIn(container));
    // **欠けていないと、回っていることが見えない**
    expect(s.borderTopColor).not.toBe(s.borderRightColor);
  });
});
