import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import { Input } from '../input/input.tsx';
import { Textarea } from './textarea.tsx';
import { lineContrast } from '../../test/contrast.ts';
import '../../test/tokens.css';

/**
 * Textarea の保証。**実ブラウザで走る。**
 *
 * 測るのは「1行の入力欄と同じ見た目であること」に尽きる——
 * **別に書くと、片方だけ直したときにずれる。**
 */

const onSurface = (node: React.ReactNode) => <div data-sg-surface="page">{node}</div>;

const look = (el: Element) => {
  const s = getComputedStyle(el);
  return {
    background: s.backgroundColor,
    color: s.color,
    // 線を描くのは枠である。**中身の側は線を持たないこと**も一緒に見る
    line: (() => {
      const f = el.closest('[data-sg-component$="-frame"]');
      if (!f) throw new Error('枠が描画されていません');
      const fs = getComputedStyle(f);
      return `${fs.outlineWidth} ${fs.outlineColor} ${fs.outlineStyle} / ${fs.borderTopWidth}`;
    })(),
    border: `${s.borderTopWidth} ${s.outlineStyle}`,
    padding: s.padding,
    radius: s.borderTopLeftRadius,
    fontSize: s.fontSize,
  };
};

describe('前提', () => {
  it('生成した CSS が当たっている', () => {
    expect(
      getComputedStyle(document.documentElement).getPropertyValue('--sg-space-surface').trim(),
    ).not.toBe('');
  });
});

describe('1行の入力欄と同じ見た目', () => {
  it('高さ以外が一致する', async () => {
    const a = await render(onSurface(<Input aria-label="x" />));
    const b = await render(onSurface(<Textarea aria-label="x" />));
    const input = a.container.querySelector('input');
    const textarea = b.container.querySelector('textarea');
    if (!input || !textarea) throw new Error('入力が描画されていません');
    // **別に書くと、片方だけ直したときにずれる**
    expect(look(textarea)).toEqual(look(input));
  });

  it('高さは1行の入力欄より大きい', async () => {
    const a = await render(onSurface(<Input aria-label="x" />));
    const b = await render(onSurface(<Textarea aria-label="x" />));
    const h = (el: Element | null) => (el ? el.getBoundingClientRect().height : 0);
    expect(h(b.container.querySelector('textarea'))).toBeGreaterThan(
      h(a.container.querySelector('input')),
    );
  });

  it('地を持たない。口を示すのは線である', async () => {
    const { container } = await render(onSurface(<Textarea aria-label="x" />));
    const el = container.querySelector('textarea');
    if (!el) throw new Error('入力が描画されていません');
    // **1行の入力欄と同じ。** 線の対比は Input の側で測っている
    expect(el.getAttribute('data-sg-surface')).toBeNull();
    expect(getComputedStyle(el).backgroundColor).toBe('rgba(0, 0, 0, 0)');
  });

  it('線が、まわりの地に対して 3:1 を満たす', async () => {
    const { container } = await render(onSurface(<Textarea aria-label="x" />));
    const page = container.querySelector('[data-sg-surface="page"]');
    const frame = container.querySelector('[data-sg-component="textarea-frame"]');
    if (!page || !frame) throw new Error('面か枠が描画されていません');
    /*
      **口は地を持たないので、示しているのは線だけである**（決定6-58）。
      `ring` は共有しているが、**共有していることは測れない。**
      どれか1つが独自の線を持ち始めても落ちるように、6つそれぞれで測る。
    */
    const ratio = lineContrast(frame, page);
    expect(ratio, `線の対比が ${ratio.toFixed(2)}:1 しかない`).toBeGreaterThanOrEqual(3);
  });

  it('無効のときだけ凹んだ面を宣言する', async () => {
    const off = await render(onSurface(<Textarea aria-label="x" disabled />));
    const el = off.container.querySelector('textarea');
    if (!el) throw new Error('描画されていません');
    /*
      **無効のとき、線は `border-subtle` まで弱まる**（実測 1.54:1）。
      線だけでは枠がほとんど見えないので、Button と同じく凹んだ面を宣言する。
    */
    expect(el.getAttribute('data-sg-surface')).toBe('inset');
    expect(getComputedStyle(el).backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
  });
});
