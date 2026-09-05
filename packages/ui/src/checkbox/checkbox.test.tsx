import { describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { Field } from '../field/field.tsx';
import { Checkbox } from './checkbox.tsx';
import '../../test/tokens.css';

/**
 * Checkbox の保証。**実ブラウザで走る。**
 *
 * 測るのは3つである。
 *
 *   **押すと印が出ること** — 状態を持たずに `peer-checked:` で出しているので、
 *     CSS が当たっていないと**押せているのに何も変わらない**
 *   **線が枠にあること** — 入力そのものに置くと色が凹んだ面の段になる（決定6-34）
 *   **印が塗りを宣言していること** — 塗るだけだと前景が置き去りになる（原則5）
 */

const onSurface = (node: React.ReactNode) => <div data-sg-surface="page">{node}</div>;

const boxIn = (container: HTMLElement) => {
  const el = container.querySelector('input[type="checkbox"]');
  if (!el) throw new Error('チェックボックスが描画されていません');
  return el as HTMLInputElement;
};

const frameIn = (container: HTMLElement) => {
  const el = container.querySelector('[data-sg-component="checkbox-frame"]');
  if (!el) throw new Error('枠が描画されていません');
  return el;
};

/** 入った印。**枠の中の、読み上げに出ない要素** */
const markIn = (container: HTMLElement) => {
  const el = frameIn(container).querySelector('[aria-hidden="true"]');
  if (!el) throw new Error('印が描画されていません');
  return el;
};

describe('前提', () => {
  it('生成した CSS が当たっている', () => {
    expect(
      getComputedStyle(document.documentElement).getPropertyValue('--sg-space-surface').trim(),
    ).not.toBe('');
  });
});

describe('入った印', () => {
  it('押すと出て、もう一度押すと消える', async () => {
    const { container } = await render(onSurface(<Checkbox aria-label="x" />));
    // **状態を持たない部品なので、CSS が当たっていないと何も変わらない**
    expect(getComputedStyle(markIn(container)).display).toBe('none');

    await userEvent.click(boxIn(container));
    await expect.poll(() => getComputedStyle(markIn(container)).display).not.toBe('none');

    await userEvent.click(boxIn(container));
    await expect.poll(() => getComputedStyle(markIn(container)).display).toBe('none');
  });

  it('印は読み上げに出ない', async () => {
    const { container } = await render(onSurface(<Checkbox aria-label="x" defaultChecked />));
    // **入っているかどうかは input が伝える。** 印を読ませても二重になる
    expect(markIn(container).getAttribute('aria-hidden')).toBe('true');
  });

  it('印は塗りを宣言する', async () => {
    const { container } = await render(onSurface(<Checkbox aria-label="x" defaultChecked />));
    const mark = markIn(container);
    // **塗るだけの道は無い**（原則5）。宣言なら背景と前景が対で決まる
    expect(mark.getAttribute('data-sg-fill')).toBe('accent');
    expect(getComputedStyle(mark).backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
    // 印の色が塗りと同じなら、印は見えない
    expect(getComputedStyle(mark).color).not.toBe(getComputedStyle(mark).backgroundColor);
  });

  it('押せないときは塗りの段が落ちる', async () => {
    const on = await render(onSurface(<Checkbox aria-label="x" defaultChecked />));
    const off = await render(onSurface(<Checkbox aria-label="x" defaultChecked disabled />));
    // **宣言は CSS では差し替えられない。** disabled は描くときに分かるので、そこで分ける
    expect(markIn(off.container).hasAttribute('data-sg-fill')).toBe(false);
    expect(getComputedStyle(markIn(off.container)).backgroundColor).not.toBe(
      getComputedStyle(markIn(on.container)).backgroundColor,
    );
  });
});

describe('面と線', () => {
  it('凹んだ面を宣言する', async () => {
    const { container } = await render(onSurface(<Checkbox aria-label="x" />));
    const box = boxIn(container);
    expect(box.getAttribute('data-sg-surface')).toBe('inset');
    expect(getComputedStyle(box).backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
  });

  it('線は枠が描き、入力そのものは線を持たない', async () => {
    const { container } = await render(onSurface(<Checkbox aria-label="x" />));
    const f = getComputedStyle(frameIn(container));
    const b = getComputedStyle(boxIn(container));
    expect(f.outlineStyle).toBe('solid');
    expect(Number.parseFloat(f.outlineWidth)).toBeGreaterThan(0);
    // **どちらかに残ると線が2本出る**
    expect(Number.parseFloat(f.borderTopWidth)).toBe(0);
    expect(Number.parseFloat(b.borderTopWidth)).toBe(0);
    expect(b.outlineStyle).toBe('none');
  });

  it('誤りのときは線の色が変わり、太くなる', async () => {
    const plain = await render(onSurface(<Checkbox aria-label="x" />));
    const bad = await render(onSurface(<Checkbox aria-label="x" aria-invalid />));
    const a = getComputedStyle(frameIn(plain.container));
    const b = getComputedStyle(frameIn(bad.container));
    expect(b.outlineColor).not.toBe(a.outlineColor);
    // **色だけで伝えない。** 面積が足りないと色の違いが読み取りにくい
    expect(Number.parseFloat(b.outlineWidth)).toBeGreaterThan(Number.parseFloat(a.outlineWidth));
  });

  it('押せないときは線が落ちる', async () => {
    const on = await render(onSurface(<Checkbox aria-label="x" />));
    const off = await render(onSurface(<Checkbox aria-label="x" disabled />));
    // **入っていない disabled は、押せるものと見た目が同じだった。**
    // 中の印は段が落ちるが、入っていなければ印そのものが無い
    expect(getComputedStyle(frameIn(off.container)).outlineColor).not.toBe(
      getComputedStyle(frameIn(on.container)).outlineColor,
    );
  });

  it('箱が潰れない', async () => {
    const { container } = await render(
      onSurface(
        <div style={{ display: 'flex', width: 40 }}>
          <Checkbox aria-label="x" />
          <span>とても長いラベルがここに続く場合でも</span>
        </div>,
      ),
    );
    // **狭いところに置かれても四角のままであること**
    const box = frameIn(container).getBoundingClientRect();
    expect(Math.round(box.width)).toBe(Math.round(box.height));
    expect(box.width).toBeGreaterThan(0);
  });
});

describe('ラベルとの結びつけ', () => {
  it('横並びではラベルが右に来て、押すと入る', async () => {
    const { container } = await render(
      onSurface(
        <Field layout="inline" id="cb" label="同意する">
          <Checkbox />
        </Field>,
      ),
    );
    const label = container.querySelector('label');
    if (!label) throw new Error('ラベルが描画されていません');
    // **ラベルが右にあること。** 上に置くと、どの選択肢のラベルか目で辿れない
    expect(label.getBoundingClientRect().left).toBeGreaterThan(
      frameIn(container).getBoundingClientRect().right,
    );
    // **実際に結べていること。** 属性が揃っていても id がずれていれば結べない
    expect(label.control).toBe(boxIn(container));

    await userEvent.click(label);
    // ラベルを押しても入る。**結びつけができていないと入らない**
    await expect.poll(() => boxIn(container).checked).toBe(true);
  });
});

describe('大きさ', () => {
  /**
   * **印が枠に収まっていることを測る。**
   *
   * 枠を 24 から 16 に縮めたとき、印は `Icon` の `sm`（16px）のままだった。
   * **枠と同じ大きさなので、縁まで埋まる。**
   *
   * 「収まっている」を測るのであって、特定の px を測るのではない——
   * `Icon` の段を変えても、収まっていれば通る。
   */
  it('入った印が枠の中に収まる', async () => {
    const { container } = await render(
      onSurface(<Checkbox aria-label="x" defaultChecked />),
    );
    const frame = container.querySelector('[data-sg-component="checkbox-frame"]');
    if (!frame) throw new Error('枠が描画されていません');
    const icon = frame.querySelector('svg');
    if (!icon) throw new Error('印が描画されていません');
    const box = frame.getBoundingClientRect().width;
    const mark = icon.getBoundingClientRect().width;
    expect(box, '枠の大きさ').toBe(16);
    expect(mark, '印の大きさ').toBeLessThan(box);
  });
});
