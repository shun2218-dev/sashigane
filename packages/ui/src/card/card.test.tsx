import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import { Card } from './card.tsx';
import { CardDescription, CardFooter, CardHeader, CardTitle } from './card-parts.tsx';
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

/**
 * hover を測るための器。**ポインタを外す先を一緒に描く。**
 *
 * 描いた要素は前のテストと同じ位置に出ることがあり、
 * **ポインタが乗ったままだと `before` が既に hover 後の値になる。**
 * そうなると「変わったこと」を測れない——CI で実際に落ちた
 * （`expected X not to be X`）。
 */
const withAway = (node: React.ReactNode) =>
  onSurface(
    <>
      <span data-testid="away">away</span>
      {node}
    </>,
  );

/** ポインタを、測る相手から外す */
const moveAway = async (container: HTMLElement) => {
  const away = container.querySelector('[data-testid="away"]');
  if (!away) throw new Error('ポインタの逃げ先が描画されていません');
  await page.elementLocator(away).hover();
};

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
      // 並べ方（flex / flex-col / gap-surface）は色ではない。
      // **区画を縦に並べて間を空けるのは器の責務**である（決定6-15）
      ['flex', 'flex-col', 'gap-surface', 'border-1', 'border-border', 'p-surface', 'rounded-sm'].sort(),
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
    const { container } = await render(withAway(<Card interactive>hover me</Card>));
    const card = container.querySelector('[data-sg-component="card"]');
    if (!card) throw new Error('Card が描画されていません');
    // **先にポインタを外す。** 乗ったままだと before が既に hover 後の値になる
    await moveAway(container);
    const before = styleOf(card).background;
    await page.elementLocator(card).hover();
    await expect.poll(() => styleOf(card).background).not.toBe(before);
  });

  it('interactive でなければ hover しても変わらない', async () => {
    const { container } = await render(withAway(<Card>no hover</Card>));
    const card = container.querySelector('[data-sg-component="card"]');
    if (!card) throw new Error('Card が描画されていません');
    await moveAway(container);
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
      withAway(
        <Card asChild interactive>
          <a href="#x">hover me</a>
        </Card>,
      ),
    );
    const a = container.querySelector('a');
    if (!a) throw new Error('a が描画されていません');
    // **先にポインタを外す。** 乗ったままだと before が既に hover 後の値になる
    await moveAway(container);
    const before = styleOf(a).background;
    await page.elementLocator(a).hover();
    // **背景だけでなく前景も動く**ことは面の仕掛けが保証している
    await expect.poll(() => styleOf(a).background).not.toBe(before);
  });
});

/**
 * 中の区画（決定6-15）。**区画は面も色も持たない。**
 *
 * 測るのは2つである。
 *
 *   **面が器だけのものであること** — 区画が面を宣言すると、
 *   宣言が入れ子になって段が意図せず深くなる
 *   **文字の役割が届いていること** — 見出しと補足が同じ見た目なら、
 *   区画を分けた意味が無い
 */
describe('自分の名前を名乗る', () => {
  it('器と区画が、それぞれ別の名前を名乗る', async () => {
    const { container } = await render(
      onSurface(
        <Card>
          <CardHeader>
            <CardTitle>見出し</CardTitle>
            <CardDescription>補足</CardDescription>
          </CardHeader>
          <CardFooter>操作</CardFooter>
        </Card>,
      ),
    );
    const names = [...container.querySelectorAll('[data-sg-component]')].map((e) =>
      e.getAttribute('data-sg-component'),
    );
    expect(names).toEqual(['card', 'card-header', 'card-title', 'card-description', 'card-footer']);
  });

  it('区画も asChild で名乗りが子へ移る', async () => {
    const { container } = await render(
      onSurface(
        <CardTitle asChild>
          <h2>x</h2>
        </CardTitle>,
      ),
    );
    expect(container.querySelector('h2')?.getAttribute('data-sg-component')).toBe('card-title');
  });
});

describe('中の区画', () => {
  it('区画は面を宣言しない', async () => {
    const { container } = await render(
      onSurface(
        <Card>
          <CardHeader>
            <CardTitle>見出し</CardTitle>
            <CardDescription>補足</CardDescription>
          </CardHeader>
          本文
          <CardFooter>操作</CardFooter>
        </Card>,
      ),
    );
    const declared = container.querySelectorAll('[data-sg-surface]');
    // 面の器（onSurface）と Card の2つだけ。**区画は1つも宣言しない**
    expect(declared.length).toBe(2);
  });

  it('見出しは既定で h3 になり、asChild で深さを変えられる', async () => {
    const a = await render(onSurface(<CardTitle>x</CardTitle>));
    expect(a.container.querySelector('h3')).not.toBeNull();

    const b = await render(
      onSurface(
        <CardTitle asChild>
          <h2>x</h2>
        </CardTitle>,
      ),
    );
    expect(b.container.querySelector('h2')).not.toBeNull();
    // **h3 が残っていないこと。** 器を作っていたら両方出る
    expect(b.container.querySelector('h3')).toBeNull();
  });

  it('見出しと補足は、大きさも色も違う', async () => {
    const { container } = await render(
      onSurface(
        <Card>
          <CardHeader>
            <CardTitle>見出し</CardTitle>
            <CardDescription>補足</CardDescription>
          </CardHeader>
        </Card>,
      ),
    );
    const title = container.querySelector('h3');
    const desc = container.querySelector('p');
    if (!title || !desc) throw new Error('区画が描画されていません');
    const t = getComputedStyle(title);
    const d = getComputedStyle(desc);
    // **潰れていないこと。** 同じなら区画を分けた意味が無い
    expect(Number.parseFloat(t.fontSize)).toBeGreaterThan(Number.parseFloat(d.fontSize));
    expect(t.color).not.toBe(d.color);
    expect(Number.parseFloat(t.fontWeight)).toBeGreaterThan(Number.parseFloat(d.fontWeight));
  });

  it('区画の間に余白が入る', async () => {
    const { container } = await render(
      onSurface(
        <Card>
          <CardHeader>
            <CardTitle>見出し</CardTitle>
          </CardHeader>
          本文
        </Card>,
      ),
    );
    const card = cardIn(container);
    expect(getComputedStyle(card).display).toBe('flex');
    expect(Number.parseFloat(getComputedStyle(card).rowGap)).toBeGreaterThan(0);
  });

  it('操作の区画は下端に寄る', async () => {
    const { container } = await render(
      onSurface(
        <Card style={{ height: 300 }}>
          短い本文
          <CardFooter>操作</CardFooter>
        </Card>,
      ),
    );
    const card = cardIn(container);
    const footer = container.querySelector('[data-testid], .mt-auto') ?? card.lastElementChild;
    if (!footer) throw new Error('操作の区画が描画されていません');
    const cardBottom = card.getBoundingClientRect().bottom;
    const footerBottom = footer.getBoundingClientRect().bottom;
    // 余白ぶんだけ内側にいるが、**上に取り残されていないこと**
    expect(cardBottom - footerBottom).toBeLessThan(60);
  });
});
