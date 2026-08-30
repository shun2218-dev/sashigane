import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import { Badge } from './badge.tsx';
import '../../test/tokens.css';

/**
 * Badge の保証。**実ブラウザで走る。**
 *
 * 測るのは3つである。
 *
 *   **背景と文字が対で決まること** — 片方だけ残ると読めない組み合わせができる
 *   **中立が面に乗ること** — 面の上に置いたときに段が追随する
 *   **押せる見た目を持たないこと** — hover で変わると、押せると誤解される
 */

const onSurface = (node: React.ReactNode) => <div data-sg-surface="page">{node}</div>;

const badgeIn = (container: HTMLElement) => {
  const el = container.querySelector('[data-sg-surface="page"] > *');
  if (!el) throw new Error('Badge が描画されていません');
  return el;
};

const styleOf = (el: Element) => {
  const s = getComputedStyle(el);
  return { background: s.backgroundColor, color: s.color };
};

/**
 * 境界。**幅も一緒に返す。**
 *
 * 色だけを見ると、境界が無くても通る——preflight が `border: 0 solid` を当てるので、
 * 幅 0 の境界の色は `currentColor`（＝文字色）になり、背景と違うためである。
 * **境界を外す壊し方で1件も落ちなかった**ので、幅を見る形にした。
 */
const borderOf = (el: Element) => {
  const s = getComputedStyle(el);
  return { color: s.borderTopColor, width: Number.parseFloat(s.borderTopWidth) };
};

describe('前提', () => {
  it('生成した CSS が当たっている', () => {
    expect(
      getComputedStyle(document.documentElement).getPropertyValue('--sg-space-surface').trim(),
    ).not.toBe('');
  });
});

describe('色の宣言', () => {
  it('中立は凹んだ面を宣言する', async () => {
    const { container } = await render(onSurface(<Badge>x</Badge>));
    const el = badgeIn(container);
    expect(el.getAttribute('data-sg-surface')).toBe('inset');
    // **面が塗っていること。** 透明なら宣言が効いていない
    expect(styleOf(el).background).not.toBe('rgba(0, 0, 0, 0)');
  });

  it('色付きは面を宣言しない', async () => {
    const { container } = await render(onSurface(<Badge tone="danger">x</Badge>));
    // 淡い塗りが背景と文字を対で持つ。**面の宣言と二重にしない**
    expect(badgeIn(container).getAttribute('data-sg-surface')).toBeNull();
  });

  it('5つのランプが、それぞれ違う見え方になる', async () => {
    const seen = new Set<string>();
    for (const tone of ['accent', 'danger', 'warning', 'success', 'info'] as const) {
      const { container } = await render(onSurface(<Badge tone={tone}>x</Badge>));
      const s = styleOf(badgeIn(container));
      // **背景だけでなく文字も色ごとに解かれている**
      expect(s.background).not.toBe('rgba(0, 0, 0, 0)');
      seen.add(`${s.background}|${s.color}`);
    }
    expect(seen.size).toBe(5);
  });

  it('中立と色付きは、どちらも背景と文字が対で決まる', async () => {
    const neutral = await render(onSurface(<Badge>x</Badge>));
    const toned = await render(onSurface(<Badge tone="info">x</Badge>));
    const a = styleOf(badgeIn(neutral.container));
    const b = styleOf(badgeIn(toned.container));
    // **片方だけ残らないこと。** 背景が違えば文字も違う
    expect(a.background).not.toBe(b.background);
    expect(a.color).not.toBe(b.color);
  });
});

describe('面の上での見え方', () => {
  it('ページの地の上では、背景で区別が付く', async () => {
    const { container } = await render(onSurface(<Badge>x</Badge>));
    const el = badgeIn(container);
    const page = container.querySelector('[data-sg-surface="page"]');
    if (!page) throw new Error('面が無い');
    expect(styleOf(el).background).not.toBe(styleOf(page).background);
  });

  it('凹んだ面の上では背景が同じになる。境界で区別が付く', async () => {
    /*
     * **面の段は凹んだところで底に着く。**
     * その上に凹んだ面を宣言しても深くならないので、背景が親と同じになる。
     *
     * 境界を持たせていなかったとき、**札は背景に溶けて消えていた。**
     * 仕様として測っておく——直したことを、次に境界を外す人が知る手がかりになる。
     */
    const { container } = await render(
      <div data-sg-surface="page">
        <div data-sg-surface="inset">
          <Badge>x</Badge>
        </div>
      </div>,
    );
    const parent = container.querySelector('[data-sg-surface="inset"]');
    const inner = parent?.querySelector('*');
    if (!parent || !inner) throw new Error('Badge が描画されていません');
    expect(styleOf(inner).background).toBe(styleOf(parent).background);
    // **幅を持ち、背景と違う色であること。** どちらが欠けても輪郭は読めない
    expect(borderOf(inner).width).toBeGreaterThan(0);
    expect(borderOf(inner).color).not.toBe(styleOf(inner).background);
  });
});

describe('押せる見た目を持たない', () => {
  it('大きさ2段が、それぞれ違う', async () => {
    const sm = await render(onSurface(<Badge size="sm">x</Badge>));
    const md = await render(onSurface(<Badge size="md">x</Badge>));
    const h = (el: Element) => el.getBoundingClientRect().height;
    expect(h(badgeIn(sm.container))).toBeLessThan(h(badgeIn(md.container)));
  });

  it('hover の宣言を持たない', async () => {
    const { container } = await render(onSurface(<Badge>x</Badge>));
    // **押せると誤解されない。** 押せるようにしたいなら Button を使う
    expect(badgeIn(container).hasAttribute('data-sg-interactive')).toBe(false);
  });
});

describe('asChild', () => {
  it('span を1つも作らず、子だけを描く', async () => {
    const { container } = await render(
      onSurface(
        <Badge asChild>
          <a href="#x">x</a>
        </Badge>,
      ),
    );
    expect(container.querySelector('span')).toBeNull();
    expect(container.querySelector('a')?.getAttribute('href')).toBe('#x');
  });

  it('見た目は変わらない', async () => {
    const plain = await render(onSurface(<Badge tone="info">x</Badge>));
    const link = await render(
      onSurface(
        <Badge asChild tone="info">
          <a href="#x">x</a>
        </Badge>,
      ),
    );
    const a = link.container.querySelector('a');
    if (!a) throw new Error('a が描画されていません');
    expect(styleOf(a)).toEqual(styleOf(badgeIn(plain.container)));
  });
});
