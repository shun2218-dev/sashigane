import { describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { ja } from 'react-day-picker/locale';
import { Calendar } from './calendar.tsx';
import '../../test/tokens.css';

/**
 * Calendar の保証。**実ブラウザで走る。**
 *
 * 向こう（react-day-picker）の振る舞いは向こうが測っている。
 * **ここで測るのは、この枠が足したものだけ**である。
 *
 *   **部位ごとにクラスが当たっていること** — 差し忘れた部位は素のまま出る。
 *     向こうの CSS を読み込んでいないので、当たらなければ**色も寸法も無い**
 *   **範囲の端と中で濃さが違うこと** — 同じにすると端が読めない
 *   **今日の印が見えること** — 幅だけを測ると、透明のままでも通る
 *   **月送りが名前を名乗ること** — 図案だけでは何の釦か読めない
 *   **言語が渡ったものになること** — 既定を持たない
 */

const onSurface = (node: React.ReactNode) => <div data-sg-surface="page">{node}</div>;

const SEPT = new Date(2026, 8, 15);

const root = (c: HTMLElement) => {
  const el = c.querySelector('[data-sg-component="calendar"]');
  if (!el) throw new Error('Calendar が描画されていません');
  return el as HTMLElement;
};
const dayButtons = (c: HTMLElement) =>
  [...root(c).querySelectorAll('td button')] as HTMLButtonElement[];

describe('部位ごとの見た目', () => {
  it('日の升に寸法と角がある', async () => {
    const { container } = await render(
      onSurface(<Calendar mode="single" locale={ja} defaultMonth={SEPT} />),
    );
    await expect.poll(() => dayButtons(container).length).toBeGreaterThan(27);
    const s = getComputedStyle(dayButtons(container)[0] as HTMLElement);
    /*
      **向こうの CSS を読み込んでいない。** クラスを差し忘れた部位は
      寸法も角も持たないまま出る——エラーは出ない。
    */
    expect(s.width).not.toBe('auto');
    expect(Number.parseFloat(s.width)).toBeGreaterThan(0);
    expect(Number.parseFloat(s.borderTopLeftRadius)).toBeGreaterThan(0);
  });

  it('曜日の見出しが本文より薄い', async () => {
    const { container } = await render(
      onSurface(<Calendar mode="single" locale={ja} defaultMonth={SEPT} />),
    );
    const weekday = root(container).querySelector('th[scope="col"], thead th');
    const day = dayButtons(container)[0];
    if (!weekday || !day) throw new Error('描画されていません');
    await expect
      .poll(() => getComputedStyle(weekday).color)
      .not.toBe(getComputedStyle(day).color);
  });

  it('全部の升が境界を持つ', async () => {
    const { container } = await render(
      onSurface(<Calendar mode="single" locale={ja} defaultMonth={SEPT} />),
    );
    await expect.poll(() => dayButtons(container).length).toBeGreaterThan(27);
    /*
      **今日だけが境界を持つ形にすると、そこで箱が 2px ずれる。**
      色だけで測らない——preflight が幅 0 の境界にも色を付ける。
    */
    for (const cell of root(container).querySelectorAll('td[data-day]')) {
      expect(Number.parseFloat(getComputedStyle(cell).borderTopWidth)).toBeGreaterThan(0);
    }
  });
});

describe('今日', () => {
  it('印が見える', async () => {
    const today = new Date();
    const { container } = await render(
      onSurface(<Calendar mode="single" locale={ja} defaultMonth={today} />),
    );
    await expect.poll(() => dayButtons(container).length).toBeGreaterThan(27);
    const cell = root(container).querySelector('td[data-today]');
    const plain = [...root(container).querySelectorAll('td[data-day]')].find(
      (c) => !c.hasAttribute('data-today'),
    );
    if (!cell || !plain) throw new Error('今日の升が見つかりません');
    /*
      **幅だけを測ると、透明のままでも通る。** 実際そうなっていた——
      升は全部 `border-transparent` を持つので、同じ特定度の境界色が2つ並ぶ。
    */
    await expect
      .poll(() => getComputedStyle(cell).borderTopColor)
      .not.toBe(getComputedStyle(plain).borderTopColor);
    expect(getComputedStyle(cell).borderTopColor).not.toBe('rgba(0, 0, 0, 0)');
  });
});

describe('選んだところ', () => {
  it('選んだ日が塗られる', async () => {
    const { container } = await render(
      onSurface(<Calendar mode="single" locale={ja} defaultMonth={SEPT} selected={SEPT} />),
    );
    await expect.poll(() => dayButtons(container).length).toBeGreaterThan(27);
    // **印は升（td）に付く。** 中の釦には `day_button` のクラスしか渡らない
    const selected = root(container).querySelector('td[data-selected]');
    const plain = [...root(container).querySelectorAll('td[data-day]')].find(
      (c) => !c.hasAttribute('data-selected'),
    );
    if (!selected || !plain) throw new Error('選んだ日が見つかりません');
    await expect
      .poll(() => getComputedStyle(selected).backgroundColor)
      .not.toBe(getComputedStyle(plain).backgroundColor);
  });

  it('範囲の端と中で濃さが違う', async () => {
    const { container } = await render(
      onSurface(
        <Calendar
          mode="range"
          locale={ja}
          defaultMonth={SEPT}
          selected={{ from: new Date(2026, 8, 8), to: new Date(2026, 8, 17) }}
        />,
      ),
    );
    await expect.poll(() => dayButtons(container).length).toBeGreaterThan(27);
    const inRange = [...root(container).querySelectorAll('td[data-selected]')];
    expect(inRange.length).toBe(10);
    /*
      **端と中で濃さが違うこと。** 同じにすると端がどこか読めない。
      クラス名では測らない——`!` が付くので、名前は当てにならない。
    */
    const shades = new Set(inRange.map((c) => getComputedStyle(c).backgroundColor));
    expect(shades.size).toBe(2);
    // どれも透明でない。**塗られていないと段が1つに潰れる**
    for (const shade of shades) expect(shade).not.toBe('rgba(0, 0, 0, 0)');
  });

  it('範囲が1本に繋がる', async () => {
    const { container } = await render(
      onSurface(
        <Calendar
          mode="range"
          locale={ja}
          defaultMonth={SEPT}
          selected={{ from: new Date(2026, 8, 8), to: new Date(2026, 8, 17) }}
        />,
      ),
    );
    await expect.poll(() => dayButtons(container).length).toBeGreaterThan(27);
    const cells = [...root(container).querySelectorAll('td[data-selected]')];
    const radius = (c: Element) => {
      const s = getComputedStyle(c);
      return `${s.borderTopLeftRadius}/${s.borderTopRightRadius}`;
    };
    /*
      **中は四角い。** 丸いままだと、繋がった1本ではなく粒が並んで見える——
      `rounded-sm` と `rounded-none` は同じ名前空間に出るので、
      `!` を付けないと出力順に勝敗を委ねることになる。
    */
    const first = cells[0];
    const middle = cells[1];
    if (!first || !middle) throw new Error('範囲が描画されていません');
    expect(radius(middle)).toBe('0px/0px');
    // 端は外側だけ丸い
    expect(radius(first)).toBe('4px/0px');
  });
});

describe('月送り', () => {
  it('名前を名乗り、押すと月が変わる', async () => {
    const { container } = await render(
      onSurface(<Calendar mode="single" locale={ja} defaultMonth={SEPT} />),
    );
    const caption = () => root(container).querySelector('[class*="text-label"]')?.textContent;
    await expect.poll(caption).toContain('9');
    const next = root(container).querySelector('nav button:last-of-type') as HTMLButtonElement;
    // **図案だけでは何の釦か読めない**
    expect(next.getAttribute('aria-label')).toBeTruthy();
    await userEvent.click(next);
    await expect.poll(caption).toContain('10');
  });
});

describe('言語', () => {
  it('渡した言語の曜日名が出る', async () => {
    const { container } = await render(
      onSurface(<Calendar mode="single" locale={ja} defaultMonth={SEPT} />),
    );
    // **既定を持たない。** 渡さなければ向こうの既定（英語）になる
    await expect.poll(() => root(container).textContent).toContain('日');
  });
});
