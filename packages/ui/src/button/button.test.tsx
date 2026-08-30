import { page, userEvent } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import { Button } from './button.tsx';
import '../../test/tokens.css';

/**
 * Button の保証（決定6-6）。**実ブラウザで走る。**
 *
 * Card と同じ3層を測るが、Button には Card に無いものが2つある。
 *
 *   **塗り**   面ではなく塗りなので、`bg-*` を書く。塗りの上の文字は `on-*` で解く（決定5-14）
 *   **無効**   不透明度を使わずに沈める（決定1-15・6-7）
 */

const styleOf = (el: Element) => {
  const s = getComputedStyle(el);
  return {
    background: s.backgroundColor,
    color: s.color,
    borderColor: s.borderTopColor,
    boxShadow: s.boxShadow,
    opacity: s.opacity,
  };
};

const buttonIn = (container: HTMLElement) => {
  const el = container.querySelector('button');
  if (!el) throw new Error('Button が描画されていません');
  return el;
};

/** 面の文脈を作る器。塗りが面から独立していることを見るために要る */
const onSurface = (node: React.ReactNode) => <div data-sg-surface="page">{node}</div>;

describe('前提', () => {
  it('生成した CSS が当たっている', () => {
    expect(
      getComputedStyle(document.documentElement).getPropertyValue('--sg-space-surface').trim(),
    ).not.toBe('');
  });
});

describe('props の写像', () => {
  it('既定は accent の塗りで、type は button である', async () => {
    const { container } = await render(onSurface(<Button>x</Button>));
    const el = buttonIn(container);
    expect(el.type).toBe('button');
    expect(styleOf(el).background).not.toBe('rgba(0, 0, 0, 0)');
  });

  it('塗り方4種が、それぞれ違う見え方になる', async () => {
    const seen = new Set<string>();
    for (const variant of ['solid', 'subtle', 'outline', 'ghost'] as const) {
      const { container } = await render(onSurface(<Button variant={variant}>x</Button>));
      const s = styleOf(buttonIn(container));
      seen.add(`${s.background}|${s.color}|${s.borderColor}`);
    }
    // **4種が2種に潰れていないこと。** 潰れていたら variant を分けた意味が無い
    expect(seen.size).toBe(4);
  });

  it('ランプ5本が、それぞれ違う塗りになる', async () => {
    const seen = new Set<string>();
    for (const tone of ['accent', 'danger', 'warning', 'success', 'info'] as const) {
      const { container } = await render(onSurface(<Button tone={tone}>x</Button>));
      seen.add(styleOf(buttonIn(container)).background);
    }
    expect(seen.size).toBe(5);
  });

  it('塗らない variant の文字色は、ランプの色であって継承色ではない', async () => {
    /*
     * **「5色が違う」では足りない**（実測）。ghost の1つを外しても、
     * その1つが継承色になるだけで**5色のままなので通ってしまった。**
     *
     * `ghost` と `outline` はどちらも `text-<tone>` で色を担う。したがって
     * **同じランプなら同じ色になり、かつ継承色とは違う**——ここまで見る。
     */
    for (const tone of ['accent', 'danger', 'warning', 'success', 'info'] as const) {
      const ghost = await render(
        onSurface(
          <Button variant="ghost" tone={tone}>
            x
          </Button>,
        ),
      );
      const outline = await render(
        onSurface(
          <Button variant="outline" tone={tone}>
            x
          </Button>,
        ),
      );
      const ghostColor = styleOf(buttonIn(ghost.container)).color;
      const inherited = styleOf(ghost.container.querySelector('[data-sg-surface="page"]')!).color;

      expect(ghostColor, `ghost ${tone} が継承色のまま`).not.toBe(inherited);
      expect(styleOf(buttonIn(outline.container)).color, `outline ${tone} が ghost と違う`).toBe(
        ghostColor,
      );
    }
  });

  it('className は置き換えではなく追加である', async () => {
    const { container } = await render(onSurface(<Button className="sg-test-extra">x</Button>));
    const el = buttonIn(container);
    expect(el.classList.contains('sg-test-extra')).toBe(true);
    expect(el.classList.contains('px-4')).toBe(true);
  });
});

describe('設計の不変条件', () => {
  /**
   * **押下は表現しない**（決定6-7）。観測が4本とも0件だったため。
   * `:active` の規則を持っていないことを、**クラスの一覧で固定する。**
   */
  it('押下のための variant を持たない', async () => {
    const { container } = await render(onSurface(<Button>x</Button>));
    const classes = [...buttonIn(container).classList];
    expect(classes.filter((c) => c.startsWith('active'))).toEqual([]);
  });

  /**
   * **focus はトークンで描く**（決定6-7）。
   * ブラウザ既定のアウトラインに任せると、利用側が自分で focus を書くことになる。
   */
  it('focus の輪郭が役割の色で描かれる', async () => {
    const { container } = await render(onSurface(<Button>x</Button>));
    const el = buttonIn(container);
    /*
     * **キーボードで移動する。** `el.focus()` では `:focus-visible` が立たない——
     * ブラウザは「入力の様子」で判定するので、プログラムからの focus は対象外になる。
     * 最初これで測って落ち、**輪郭が付いていないと読み違えかけた**（教訓2）。
     */
    await userEvent.tab();
    await expect.poll(() => el.matches(':focus-visible')).toBe(true);

    const role = getComputedStyle(document.documentElement)
      .getPropertyValue('--sg-color-border-focus')
      .trim();
    expect(role, '--sg-color-border-focus が解決していない').not.toBe('');

    /*
     * **色は poll で待つ。** 色は遷移するので、focus 直後の計算値は遷移前の値である。
     * 一度これで落ち、**輪郭が付いていないと読み違えかけた**（教訓2）。
     * 原因は `duration-*` 単体が `transition-property: all` になっていたことで、
     * そちらはコンポーネント側を直した。
     */
    await expect.poll(() => getComputedStyle(el).outlineColor).toBe(role);
    expect(Number.parseFloat(getComputedStyle(el).outlineWidth)).toBeGreaterThan(0);
  });

  /**
   * **押せることが見た目から分かること**（決定6-7）。
   * 塗る variant は塗りを1段ずらし（決定5-15）、塗らない variant は面の hover を使う。
   * **塗る variant にだけ hover がある形にしない**（教訓7）。
   */
  it('塗らない variant も hover で変わる', async () => {
    for (const variant of ['outline', 'ghost'] as const) {
      const { container } = await render(onSurface(<Button variant={variant}>x</Button>));
      const el = buttonIn(container);
      expect(el.hasAttribute('data-sg-interactive'), `${variant} が面の hover を持たない`).toBe(
        true,
      );
      const before = styleOf(el).background;
      await page.elementLocator(el).hover();
      await expect.poll(() => styleOf(el).background, { timeout: 2000 }).not.toBe(before);
    }
  });

  it('無効のときは面の hover を付けない', async () => {
    const { container } = await render(
      onSurface(
        <Button variant="ghost" disabled>
          x
        </Button>,
      ),
    );
    expect(buttonIn(container).hasAttribute('data-sg-interactive')).toBe(false);
  });

  /** **不透明度は使わない**（決定1-15）。無効でも `opacity` は 1 のまま */
  it('無効でも不透明度を動かさない', async () => {
    const { container } = await render(onSurface(<Button disabled>x</Button>));
    expect(styleOf(buttonIn(container)).opacity).toBe('1');
  });
});

describe('トークンの保証（実ブラウザでしか測れない）', () => {
  it('塗りの上の文字は on-* から来る。地とも面とも違う色になる', async () => {
    const { container } = await render(onSurface(<Button>x</Button>));
    const s = styleOf(buttonIn(container));
    const surface = styleOf(container.querySelector('[data-sg-surface="page"]')!);
    expect(s.color).not.toBe(s.background);
    expect(s.background).not.toBe(surface.background);
  });

  it('hover すると塗りが1段ずれる（決定5-15）', async () => {
    const { container } = await render(onSurface(<Button>hover me</Button>));
    const el = buttonIn(container);
    const before = styleOf(el).background;
    await page.elementLocator(el).hover();
    await expect.poll(() => styleOf(el).background).not.toBe(before);
  });

  /**
   * **無効は面を沈めて表す**（決定6-7）。
   * 面の仕掛け（決定5-12）に乗るので、**背景と前景が同時に変わる。**
   */
  it('無効にすると、面を宣言して背景と文字色が同時に変わる', async () => {
    /*
     * **「変わったこと」だけでは足りない**（自己レビュー前の実測）。
     * 面の宣言を外しても塗りクラスが消えるので背景は変わり、テストは通ってしまった。
     * **面が実際に塗っていること**——背景が透明でないこと——まで見る。
     */
    const on = await render(onSurface(<Button>x</Button>));
    const before = styleOf(buttonIn(on.container));

    const off = await render(onSurface(<Button disabled>x</Button>));
    const el = buttonIn(off.container);
    const after = styleOf(el);

    expect(el.getAttribute('data-sg-surface')).toBe('inset');
    // **沈んだ面が塗っていること。** 透明なら、面の宣言が効いていない
    expect(after.background).not.toBe('rgba(0, 0, 0, 0)');
    expect(after.background).not.toBe(before.background);
    expect(after.color).not.toBe(before.color);
  });

  it('無効の沈み方は、どの塗り方でも同じである', async () => {
    const seen = new Set<string>();
    for (const variant of ['solid', 'subtle', 'outline', 'ghost'] as const) {
      const { container } = await render(
        onSurface(
          <Button variant={variant} disabled>
            x
          </Button>,
        ),
      );
      const el = buttonIn(container);
      const s = styleOf(el);
      // **沈んだ面が塗っていること**を各 variant で見る（上と同じ理由）
      expect(el.getAttribute('data-sg-surface')).toBe('inset');
      expect(s.background).not.toBe('rgba(0, 0, 0, 0)');
      seen.add(`${s.background}|${s.color}`);
    }
    // **1つに揃うこと。** 塗りが残ると「押せそうに見えて押せない」になる
    expect(seen.size).toBe(1);
  });
});
