import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import { Card } from './card.tsx';
import '../../test/tokens.css';

/**
 * Card の保証（決定6-6）。**実ブラウザで走る。**
 *
 * 測るものは3層ある。
 *
 *   1. props → 出力の写像       cva が意図どおりのクラスを出すこと
 *   2. 設計の不変条件           `bg-*` を1つも出さないこと（原則5）
 *   3. **トークンの保証**       面の宣言が背景と前景を同時に変えること（決定5-12）
 *
 * **3 が本命である。** 決定5-12 は「面を塗ったのに前景が浅いまま」という穴への対処で、
 * 塞ぎたいのは**塗るだけの道**だった。jsdom は CSS を解決しないので、
 * 「クラスが付いている」ことしか言えず、「色が変わった」ことは言えない。
 */

/** 面の文脈を作る器。**テストの中で `data-sg-surface` を宣言する** */
const onSurface = (node: React.ReactNode, surface = 'page') => (
  <div data-sg-surface={surface}>{node}</div>
);

/** 計算値を読む。**クラスではなく、実際に効いている値を見る** */
const styleOf = (el: Element) => {
  const s = getComputedStyle(el);
  return {
    background: s.backgroundColor,
    color: s.color,
    borderColor: s.borderTopColor,
    padding: s.paddingTop,
    boxShadow: s.boxShadow,
  };
};

const cardIn = (container: HTMLElement) => {
  const el = container.querySelector('[data-sg-surface="surface"], [data-sg-surface="overlay"]');
  if (!el) throw new Error('Card が描画されていません');
  return el;
};

/**
 * **CSS が実際に読み込まれていること**を先に確かめる。
 * 読み込まれていなければ以降の計算値は全部「既定値」になり、
 * **テストは通るのに何も測っていない**状態になる（教訓2）。
 */
describe('前提', () => {
  it('生成した CSS が当たっている', () => {
    expect(
      getComputedStyle(document.documentElement).getPropertyValue('--sg-space-surface').trim(),
    ).not.toBe('');
  });
});

describe('props の写像', () => {
  it('既定では面を surface と宣言し、浮きを持たない', async () => {
    const { container } = await render(onSurface(<Card>x</Card>));
    const el = cardIn(container);
    expect(el.getAttribute('data-sg-surface')).toBe('surface');
    expect(styleOf(el).boxShadow).toBe('none');
  });

  it('interactive のときだけ data-sg-interactive が付く', async () => {
    const off = await render(onSurface(<Card>x</Card>));
    expect(cardIn(off.container).hasAttribute('data-sg-interactive')).toBe(false);

    const on = await render(onSurface(<Card interactive>x</Card>));
    expect(cardIn(on.container).hasAttribute('data-sg-interactive')).toBe(true);
  });

  it('className は置き換えではなく追加である', async () => {
    const { container } = await render(onSurface(<Card className="sg-test-extra">x</Card>));
    const el = cardIn(container);
    expect(el.classList.contains('sg-test-extra')).toBe(true);
    // 基本のクラスが消えていないこと。**上書きされたら余白が失われる**
    expect(el.classList.contains('p-surface')).toBe(true);
  });
});

describe('設計の不変条件', () => {
  /**
   * **原則5。** 面は宣言するものであって、塗るものではない。
   * `bg-*` を書けてしまうと**前景がページ用のまま残り、保証が崩れてもエラーにならない**
   * （決定5-12）。
   *
   * クラス名の一覧を突き合わせる形にしてある。**「bg- で始まるものが無い」ではない**——
   * 禁止する形を並べると、並べ忘れたものを黙って通す（教訓5）。
   */
  it('Card が出すクラスは決めたものだけで、塗りのクラスを含まない', async () => {
    const { container } = await render(onSurface(<Card>x</Card>));
    expect([...cardIn(container).classList].sort()).toEqual(
      ['border-1', 'border-border', 'p-surface', 'rounded-sm'].sort(),
    );
  });

  it('elevation の4段が、それぞれ意図した浮きになる', async () => {
    /*
     * **4段すべてを測る**（自己レビュー K3）。
     * クラスが cva の中にあれば CSS は生成されるが、
     * **props を渡したときに実際に付くか**は別である。
     */
    const none = await render(onSurface(<Card>x</Card>));
    expect(styleOf(cardIn(none.container)).boxShadow).toBe('none');

    const shadows = new Set<string>();
    for (const level of ['raised', 'overlay', 'front'] as const) {
      const { container } = await render(onSurface(<Card elevation={level}>x</Card>));
      const shadow = styleOf(cardIn(container)).boxShadow;
      expect(shadow, `elevation=${level} で浮きが付かない`).not.toBe('none');
      shadows.add(shadow);
    }
    // **段ごとに違う値であること。** 同じ値なら段を分けた意味が無い
    expect(shadows.size).toBe(3);
  });

  it('overlay を選ぶと、elevation を書かなくても浮く', async () => {
    /*
     * 決定5-13 は overlay を surface と**同じ段**に置いた。そのうえでこう書いている。
     *
     * > overlay を surface と同じ段に置く以上、**暗色でこれが無いと下地と同化する。**
     *
     * したがって「浮きを付けられる」ではなく「**浮き無しでは組み立てられない**」にしてある
     * （決定5-9 と同じ作法）。
     */
    const { container } = await render(onSurface(<Card surface="overlay">x</Card>));
    expect(styleOf(cardIn(container)).boxShadow).not.toBe('none');
  });
});

describe('トークンの保証（実ブラウザでしか測れない）', () => {
  /**
   * **決定5-12。** 面は文脈であり、深い面では役割が1段深い段を指す。
   * 決定5-12 が塞いだ穴は「面を塗ったのに前景が浅いまま」であり、
   * **背景と前景が同時に動くこと**が保証の中身である。
   */
  it('面を宣言すると、背景が1段深くなる', async () => {
    const { container } = await render(onSurface(<Card>x</Card>));
    const page = container.querySelector('[data-sg-surface="page"]')!;
    const card = cardIn(container);
    expect(styleOf(card).background).not.toBe(styleOf(page).background);
    expect(styleOf(card).background).not.toBe('rgba(0, 0, 0, 0)');
  });

  it('前景も面から来る。塗っていないのに文字色と境界色が付く', async () => {
    const { container } = await render(onSurface(<Card>x</Card>));
    const s = styleOf(cardIn(container));
    expect(s.color).not.toBe('rgba(0, 0, 0, 0)');
    expect(s.borderColor).not.toBe(s.color);
  });

  it('骨格の余白が効いている（決定1-12）', async () => {
    const { container } = await render(onSurface(<Card>x</Card>));
    expect(Number.parseFloat(styleOf(cardIn(container)).padding)).toBeGreaterThan(0);
  });

  it('hover すると1段深い文脈になる（決定5-13）', async () => {
    const { container } = await render(onSurface(<Card interactive>hover me</Card>));
    const card = cardIn(container);
    const before = styleOf(card).background;
    await page.elementLocator(card).hover();
    await expect.poll(() => styleOf(card).background).not.toBe(before);
  });

  it('interactive でなければ hover しても変わらない', async () => {
    const { container } = await render(onSurface(<Card>no hover</Card>));
    const card = cardIn(container);
    const before = styleOf(card).background;
    await page.elementLocator(card).hover();
    expect(styleOf(card).background).toBe(before);
  });
});

/**
 * `asChild`（決定6-14）。**器を作らず、子だけを描く。**
 *
 * Card では「面の宣言が子へ移ること」が要点である——
 * 移らないと、リンクにした瞬間に背景と前景の保証が消える。
 */
describe('asChild', () => {
  it('div を1つも作らず、子だけを描く', async () => {
    const { container } = await render(
      onSurface(
        <Card asChild>
          <article>x</article>
        </Card>,
      ),
    );
    const article = container.querySelector('article');
    expect(article).not.toBeNull();
    // 面の器（onSurface）の div 以外に div が増えていないこと
    expect(container.querySelectorAll('div').length).toBe(1);
  });

  it('面の宣言と見た目が子へ移る', async () => {
    const plain = await render(onSurface(<Card>x</Card>));
    const asChild = await render(
      onSurface(
        <Card asChild>
          <article>x</article>
        </Card>,
      ),
    );
    const article = asChild.container.querySelector('article');
    if (!article) throw new Error('article が描画されていません');

    expect(article.getAttribute('data-sg-surface')).toBe('surface');
    expect(styleOf(article).background).toBe(styleOf(cardIn(plain.container)).background);
    expect(styleOf(article).color).toBe(styleOf(cardIn(plain.container)).color);
  });

  it('リンクにしても hover で1段深くなる', async () => {
    const { container } = await render(
      onSurface(
        <Card asChild interactive>
          <a href="#x">hover me</a>
        </Card>,
      ),
    );
    const a = container.querySelector('a');
    if (!a) throw new Error('a が描画されていません');
    const before = styleOf(a).background;
    await page.elementLocator(a).hover();
    // **背景だけでなく前景も動く**ことは面の仕掛けが保証している
    await expect.poll(() => styleOf(a).background).not.toBe(before);
  });
});
