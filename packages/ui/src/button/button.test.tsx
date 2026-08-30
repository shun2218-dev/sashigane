import { page, userEvent } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import { Button } from './button.tsx';
import { Slot } from '../internal/slot.tsx';
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
  it('**4種すべて**が hover で背景を変える', async () => {
    /*
     * 押せることが見た目から分かること。**1つでも変わらないと、
     * 利用者は「押せるのか分からない」状態になる。**
     * 実際 `subtle` だけ何も起きておらず、利用者に指摘されるまで気づかなかった。
     */
    for (const variant of ['solid', 'subtle', 'outline', 'ghost'] as const) {
      const { container } = await render(onSurface(<Button variant={variant}>x</Button>));
      const el = buttonIn(container);
      const before = styleOf(el).background;
      await page.elementLocator(el).hover();
      await expect
        .poll(() => styleOf(el).background, { timeout: 2000 })
        .not.toBe(before);
    }
  });

  it('subtle の hover は色味を保ったまま1段深くなる', async () => {
    /*
     * **面の hover は中立色で塗る。** 自前で塗っている `subtle` がそれに上書きされると、
     * hover した瞬間にランプの色が消えて灰色になる。
     * 色が付いたまま深くなることを、**彩度で見る。**
     */
    const { container } = await render(onSurface(<Button variant="subtle">x</Button>));
    const el = buttonIn(container);
    /**
     * 彩度を読む。**表記が2つある**——`oklch(L C H)` と `oklab(L a b)` で、
     * 遷移を経ると後者で返る。`oklab` の彩度は a と b の長さである。
     * 片方しか読まない式にして一度落とした。
     */
    const chroma = () => {
      const bg = styleOf(el).background;
      const lch = bg.match(/oklch\(\s*[\d.]+\s+([\d.]+)/);
      if (lch) return Number(lch[1]);
      const lab = bg.match(/oklab\(\s*[\d.]+\s+(-?[\d.]+)\s+(-?[\d.]+)/);
      if (lab) return Math.hypot(Number(lab[1]), Number(lab[2]));
      throw new Error(`彩度を読めない表記です: ${bg}`);
    };
    /*
     * **遷移を止めてから測る。** 色は 200ms かけて動くので、
     * 途中を読むと「変わった」も「色が残っている」も**両方たまたま通ってしまう。**
     * 実際、止めずに書いたときは**塗りの再主張を外しても通っていた。**
     */
    el.style.transition = 'none';
    const beforeBg = styleOf(el).background;
    expect(chroma(), '塗りに色が付いていない').toBeGreaterThan(0.02);

    await page.elementLocator(el).hover();
    await expect.poll(() => styleOf(el).background, { timeout: 2000 }).not.toBe(beforeBg);
    // **そのうえで色が残っていること。** 中立色に上書きされると彩度が落ちる
    expect(chroma(), 'hover で色味が消えている').toBeGreaterThan(0.02);
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
  it('塗りは宣言で作る。両モードで文字が明るい端になる', async () => {
    /*
     * **指摘から出た保証。** 以前は暗色で「明るい塗り＋黒文字」になっていた——
     * 観測4本に1件も無い組み合わせだった。
     * 塗りを宣言に分けたので、段が面にもモードにも依存しなくなり、文字は両モードとも白になる。
     */
    const seen: string[] = [];
    for (const theme of ['light', 'dark'] as const) {
      document.documentElement.setAttribute('data-theme', theme);
      const { container } = await render(onSurface(<Button>x</Button>));
      const el = buttonIn(container);
      expect(el.getAttribute('data-sg-fill'), '塗りが宣言されていない').toBe('accent');
      const s = styleOf(el);
      // 明るい端は明度が高い。暗い端が選ばれていたら落ちる
      const lightness = Number(s.color.match(/okl(?:ch|ab)\(\s*([\d.]+)/)?.[1] ?? '0');
      expect(lightness, `${theme} で文字が明るい端ではない`).toBeGreaterThan(0.8);
      seen.push(s.background);
    }
    document.documentElement.removeAttribute('data-theme');
    // **塗りはテーマで変わらない。** ブランドの色である
    expect(new Set(seen).size, '塗りがテーマで変わっている').toBe(1);
  });

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

/**
 * `asChild`（決定6-14）。**器を作らず、子だけを描く。**
 *
 * ここで測るのは props の写像ではなく **DOM の形**である——
 * 「button の中に a が入る」形になっていないことは、計算値では見えない。
 */
describe('asChild', () => {
  it('button を1つも作らず、子だけを描く', async () => {
    const { container } = await render(
      onSurface(
        <Button asChild>
          <a href="#x">link</a>
        </Button>,
      ),
    );
    // **これが要件の中心。** 入れ子になっていたら、押せる要素が2つになる
    expect(container.querySelector('button')).toBeNull();
    const a = container.querySelector('a');
    expect(a).not.toBeNull();
    expect(a?.getAttribute('href')).toBe('#x');
  });

  it('クラスと面・塗りの宣言が子へ移る', async () => {
    const plain = await render(onSurface(<Button>x</Button>));
    const asChild = await render(
      onSurface(
        <Button asChild>
          <a href="#x">x</a>
        </Button>,
      ),
    );
    const a = asChild.container.querySelector('a');
    if (!a) throw new Error('a が描画されていません');

    expect(a.getAttribute('data-sg-fill')).toBe('accent');
    // **見た目が同じであること。** クラスだけ移って属性が落ちても、
    // 塗りが消えるので背景で捕まえられる
    expect(styleOf(a).background).toBe(styleOf(buttonIn(plain.container)).background);
    expect(styleOf(a).color).toBe(styleOf(buttonIn(plain.container)).color);
  });

  it('type は移さない。子が a のとき意味を持たないため', async () => {
    const { container } = await render(
      onSurface(
        <Button asChild>
          <a href="#x">x</a>
        </Button>,
      ),
    );
    expect(container.querySelector('a')?.hasAttribute('type')).toBe(false);
  });

  it('子の onClick と、こちらへ渡した onClick の両方が呼ばれる', async () => {
    const calls: string[] = [];
    const { container } = await render(
      onSurface(
        <Button asChild onClick={() => calls.push('button')}>
          <a href="#x" onClick={(e) => { e.preventDefault(); calls.push('child'); }}>
            x
          </a>
        </Button>,
      ),
    );
    const a = container.querySelector('a');
    if (!a) throw new Error('a が描画されていません');
    await userEvent.click(a);
    // **片方だけにすると、渡した onClick が黙って消える**
    expect(calls).toEqual(['child', 'button']);
  });

  it('子のクラスは消えない', async () => {
    const { container } = await render(
      onSurface(
        <Button asChild>
          <a href="#x" className="mine">
            x
          </a>
        </Button>,
      ),
    );
    const a = container.querySelector('a');
    expect(a?.classList.contains('mine')).toBe(true);
    expect(a?.classList.contains('inline-flex')).toBe(true);
  });

  it('disabled と同時に使うと落ちる', () => {
    // 型では塞いであるが、型を持たない側から来ることもある
    const props = { asChild: true, disabled: true } as unknown as Parameters<typeof Button>[0];
    expect(() => Button({ ...props, children: <a href="#x">x</a> })).toThrow(/disabled/);
  });

  it('ref は自分と子の両方に配られる', async () => {
    let own: Element | null = null;
    let child: Element | null = null;
    const { container } = await render(
      onSurface(
        <Button
          asChild
          ref={(node) => {
            own = node;
          }}
        >
          <a
            href="#x"
            ref={(node) => {
              child = node;
            }}
          >
            x
          </a>
        </Button>,
      ),
    );
    const a = container.querySelector('a');
    expect(a).not.toBeNull();
    // **片方を捨てない。** 捨てても画面は正常に見えるので、測らないと気づけない
    expect(own).toBe(a);
    expect(child).toBe(a);
  });

  it('片方だけに ref があっても届く', async () => {
    let own: Element | null = null;
    const { container } = await render(
      onSurface(
        <Button
          asChild
          ref={(node) => {
            own = node;
          }}
        >
          <a href="#x">x</a>
        </Button>,
      ),
    );
    expect(own).toBe(container.querySelector('a'));
  });

  it('子が要素でないと落ちる', () => {
    /*
     * **Button ではなく Slot を直接呼ぶ。** Button を関数として呼んでも
     * 返るのは `<Slot>` の要素で、投げるのは描画のときだからである。
     * Button がこの経路を通ることは、上の「button を1つも作らず」が見ている。
     *
     * **黙って通さない。** クラスも属性もどこにも付かないまま描画されるため
     */
    expect(() => Slot({ children: 'ただの文字' })).toThrow(/1つだけ/);
    expect(() => Slot({ children: undefined })).toThrow(/1つだけ/);
    expect(() =>
      Slot({
        children: [<a key="a" href="#a" />, <a key="b" href="#b" />],
      }),
    ).toThrow(/1つだけ/);
  });
});
