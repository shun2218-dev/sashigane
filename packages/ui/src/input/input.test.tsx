import { describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { Input } from './input.tsx';
import '../../test/tokens.css';

/**
 * Input の保証。**実ブラウザで走る。**
 *
 * 測るのは3つである。
 *
 *   **凹んだ面を宣言すること** — 背景だけを塗ると前景が置き去りになる
 *   **誤りの線が文字色でないこと** — 取り違えは検査では捕まらない
 *   **線が1本しか無いこと** — 状態とフォーカスで別々の仕組みを使うと2本出る
 */

const onSurface = (node: React.ReactNode) => <div data-sg-surface="page">{node}</div>;

const inputIn = (container: HTMLElement) => {
  const el = container.querySelector('input');
  if (!el) throw new Error('入力が描画されていません');
  return el;
};

describe('前提', () => {
  it('生成した CSS が当たっている', () => {
    expect(
      getComputedStyle(document.documentElement).getPropertyValue('--sg-space-surface').trim(),
    ).not.toBe('');
  });
});

describe('面', () => {
  it('凹んだ面を宣言する', async () => {
    const { container } = await render(onSurface(<Input aria-label="x" />));
    const el = inputIn(container);
    expect(el.getAttribute('data-sg-surface')).toBe('inset');
    // **面が塗っていること。** 透明なら宣言が効いていない
    expect(getComputedStyle(el).backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
  });

  it('ページの地とは違う色になる', async () => {
    const { container } = await render(onSurface(<Input aria-label="x" />));
    const page = container.querySelector('[data-sg-surface="page"]');
    if (!page) throw new Error('面が無い');
    const bg = (el: Element) => getComputedStyle(el).backgroundColor;
    // **凹んで見えないと、入力できる場所だと分からない**
    expect(bg(inputIn(container))).not.toBe(bg(page));
  });
});

/** 線の測り方。**幅も見る**——色だけを見ると、線を消しても通る */
const line = (el: Element) => {
  const s = getComputedStyle(el);
  return {
    width: Number.parseFloat(s.outlineWidth),
    color: s.outlineColor,
    style: s.outlineStyle,
    // **境界は 0 でなければならない。** 輪郭と両方あると線が2本出る
    border: Number.parseFloat(s.borderTopWidth),
  };
};

describe('線', () => {
  it('輪郭が実線で幅を持ち、文字色ではない', async () => {
    const { container } = await render(onSurface(<Input aria-label="x" />));
    const el = inputIn(container);
    const l = line(el);
    expect(l.style).toBe('solid');
    expect(l.width).toBeGreaterThan(0);
    expect(l.color).not.toBe(getComputedStyle(el).color);
  });

  it.each([
    ['通常', <Input aria-label="x" key="a" />],
    ['誤り', <Input aria-label="x" aria-invalid key="b" />],
    ['満たす', <Input aria-label="x" valid key="c" />],
  ])('%s のとき、線は1本しか無い', async (_name, node) => {
    const { container } = await render(onSurface(node));
    /*
     * **境界と輪郭の両方を持たない。** 持つと、状態とフォーカスが重なったときに
     * 赤い境界の外側へ青い輪郭が浮く。実際に出して指摘された。
     *
     * `input` はブラウザ既定で境界を持つので、**preflight が無い配布先でも
     * 0 であること**をここで測る。
     */
    expect(line(inputIn(container)).border).toBe(0);
  });

  it('誤りのときは線の色が変わり、太くなる', async () => {
    const plain = await render(onSurface(<Input aria-label="x" />));
    const bad = await render(onSurface(<Input aria-label="x" aria-invalid />));
    const a = line(inputIn(plain.container));
    const b = line(inputIn(bad.container));
    expect(b.color).not.toBe(a.color);
    // **色だけで伝えない。** 面積が足りないと色の違いが読み取りにくい
    expect(b.width).toBeGreaterThan(a.width);
  });

  it('満たしているときは線の色が変わり、太くなる', async () => {
    const plain = await render(onSurface(<Input aria-label="x" />));
    const ok = await render(onSurface(<Input aria-label="x" valid />));
    const a = line(inputIn(plain.container));
    const b = line(inputIn(ok.container));
    expect(b.color).not.toBe(a.color);
    expect(b.width).toBeGreaterThan(a.width);
    // **誤りとは別の色である。** 同じなら、どちらの状態か線からは読めない
    const bad = await render(onSurface(<Input aria-label="x" aria-invalid />));
    expect(b.color).not.toBe(line(inputIn(bad.container)).color);
  });

  it('aria-invalid を自分では書かない', async () => {
    const { container } = await render(onSurface(<Input aria-label="x" />));
    // **付けるのは Field である。** ここで決めると、Field を使わない書き方だけが誤りを名乗れる
    expect(inputIn(container).hasAttribute('aria-invalid')).toBe(false);
  });
});

describe('フォーカス', () => {
  it('太さで差がつき、線は増えない', async () => {
    const { container } = await render(onSurface(<Input aria-label="x" />));
    const el = inputIn(container);
    const before = line(el);
    await userEvent.click(el);
    // **遷移の途中を読まない。** 計算値が遷移前のまま返る
    await expect.poll(() => line(el).width).toBeGreaterThan(before.width);
    const after = line(el);
    expect(after.border).toBe(0);
    // 状態が無いときは色も変わる。**灰色が 1px 太るだけでは見落とす**
    expect(after.color).not.toBe(before.color);
  });

  it('誤りのときは赤いまま太くなる', async () => {
    const { container } = await render(onSurface(<Input aria-label="x" aria-invalid />));
    const el = inputIn(container);
    const before = line(el);
    await userEvent.click(el);
    await expect.poll(() => line(el).width).toBeGreaterThan(before.width);
    /*
     * **直している最中に赤が消えない。** フォーカスの色で上書きすると、
     * 誤りを直そうとして入力欄に入った瞬間に、誤りの色が消える。
     *
     * ## この検査が見ていない範囲
     *
     * 順序は特定度で決めてある——`aria-invalid:focus-visible:outline-danger` は
     * (0,3,0) で、`focus-visible:outline-border-focus` の (0,2,0) に勝つ。
     *
     * **その指定を外してもこの検査は落ちない。** 外すと残るのは
     * `aria-invalid:outline-danger` (0,2,0) で、フォーカスの色と特定度が並ぶ——
     * いまは Tailwind の出力順がたまたま誤りを後に置いているので赤のままになる。
     * **実測して確かめた**（消しても 15 件とも通った）。
     *
     * つまりここが固定しているのは**見た目の結果**であって、
     * **出力順に依存していないこと**ではない。順序が変われば黙って青くなる。
     */
    expect(line(el).color).toBe(before.color);
    expect(line(el).border).toBe(0);
  });

  it('満たしているときは緑のまま太くなる', async () => {
    const { container } = await render(onSurface(<Input aria-label="x" valid />));
    const el = inputIn(container);
    const before = line(el);
    await userEvent.click(el);
    await expect.poll(() => line(el).width).toBeGreaterThan(before.width);
    expect(line(el).color).toBe(before.color);
  });

  it('太さが変わっても寸法が動かない', async () => {
    const { container } = await render(onSurface(<Input aria-label="x" />));
    const el = inputIn(container);
    const before = el.getBoundingClientRect();
    await userEvent.click(el);
    await expect.poll(() => line(el).width).toBeGreaterThan(1);
    const after = el.getBoundingClientRect();
    /*
     * **輪郭で描いている理由がこれである。** 境界の幅を変えると箱の高さが変わり、
     * フォーカスのたびに下にある説明文が動く。
     */
    expect(after.height).toBe(before.height);
    expect(after.top).toBe(before.top);
  });
});

describe('押せないとき', () => {
  it('文字が淡くなる。不透明度では表さない', async () => {
    const plain = await render(onSurface(<Input aria-label="x" />));
    const off = await render(onSurface(<Input aria-label="x" disabled />));
    const a = getComputedStyle(inputIn(plain.container));
    const b = getComputedStyle(inputIn(off.container));
    expect(b.color).not.toBe(a.color);
    // **薄めると前景と背景が同時に下地へ寄り、読みやすさの保証が効かなくなる**
    expect(b.opacity).toBe('1');
  });
});
