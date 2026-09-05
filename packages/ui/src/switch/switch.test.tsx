import { describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { Field } from '../field/field.tsx';
import { Switch } from './switch.tsx';
import '../../test/tokens.css';

/**
 * Switch の保証。**実ブラウザで走る。**
 *
 * 測るのは3つである。
 *
 *   **スイッチだと申告すること** — チェックボックスのままだと、
 *     読み上げが「その場で効くもの」だと言えない
 *   **素の input に乗っていること** — 鍵盤もフォームへの載り方もブラウザが持つ
 *   **つまみが両方の地の上で見えること** — 塗りだけだと片方で沈む
 */

const onSurface = (node: React.ReactNode) => <div data-sg-surface="page">{node}</div>;

const inputIn = (c: HTMLElement) =>
  c.querySelector('[data-sg-component="switch"]') as HTMLInputElement;
const knobIn = (c: HTMLElement) => {
  const frame = c.querySelector('[data-sg-component="switch-frame"]');
  const knob = frame?.querySelector('[data-sg-surface="page"]');
  if (!knob) throw new Error('つまみが描画されていません');
  return knob;
};

describe('何だと申告するか', () => {
  it('スイッチだと名乗る', async () => {
    const { container } = await render(onSurface(<Switch aria-label="x" />));
    // **チェックボックスのままだと「その場で効くもの」だと言えない**
    expect(inputIn(container).getAttribute('role')).toBe('switch');
  });

  it('素の input に乗っている', async () => {
    const { container } = await render(onSurface(<Switch aria-label="x" name="n" />));
    expect(inputIn(container).type).toBe('checkbox');
    // **フォームに載る。** 自前で状態を持つと、素のフォームから外れる
    expect(inputIn(container).name).toBe('n');
  });

  it('押すと入り、もう一度押すと切れる', async () => {
    const { container } = await render(
      onSurface(
        <Field layout="inline" id="s" label="入り切り">
          <Switch />
        </Field>,
      ),
    );
    const input = inputIn(container);
    expect(input.checked).toBe(false);
    await userEvent.click(input);
    await expect.poll(() => inputIn(container).checked).toBe(true);
    await userEvent.click(input);
    await expect.poll(() => inputIn(container).checked).toBe(false);
  });
});

describe('つまみ', () => {
  it('境界を持つ', async () => {
    const { container } = await render(onSurface(<Switch aria-label="x" />));
    const s = getComputedStyle(knobIn(container));
    /*
     * **幅を見る。** 色だけを見ると、境界を消しても通る——
     * preflight が幅 0 の境界にも色を当てる。
     */
    expect(Number.parseFloat(s.borderTopWidth)).toBeGreaterThan(0);
  });

  it('入ると位置が動く', async () => {
    const { container } = await render(onSurface(<Switch aria-label="x" />));
    const before = knobIn(container).getBoundingClientRect().left;
    await userEvent.click(inputIn(container));
    // **遷移の途中を読まない。** 落ち着くまで待つ
    await expect
      .poll(() => knobIn(container).getBoundingClientRect().left)
      .toBeGreaterThan(before);
  });

  it('地を宣言している', async () => {
    const { container } = await render(onSurface(<Switch aria-label="x" />));
    // **塗るだけの道は無い。** 面を宣言して地と前景を同時に持つ
    expect(knobIn(container).getAttribute('data-sg-surface')).toBe('page');
  });
});

describe('面と線', () => {
  it('凹んだ面を宣言し、線は枠が描く', async () => {
    const { container } = await render(onSurface(<Switch aria-label="x" />));
    expect(inputIn(container).getAttribute('data-sg-surface')).toBe('inset');
    const frame = container.querySelector('[data-sg-component="switch-frame"]');
    if (!frame) throw new Error('枠が描画されていません');
    const f = getComputedStyle(frame);
    expect(f.outlineStyle).toBe('solid');
    expect(Number.parseFloat(f.outlineWidth)).toBeGreaterThan(0);
    expect(Number.parseFloat(getComputedStyle(inputIn(container)).borderTopWidth)).toBe(0);
  });

  it('丸い', async () => {
    const { container } = await render(onSurface(<Switch aria-label="x" />));
    const frame = container.querySelector('[data-sg-component="switch-frame"]');
    if (!frame) throw new Error('枠が描画されていません');
    const box = frame.getBoundingClientRect();
    const radius = Number.parseFloat(getComputedStyle(frame).borderTopLeftRadius);
    // **角ばっていると、チェックボックスと形から区別が付かない**
    expect(radius).toBeGreaterThanOrEqual(box.height / 2);
    // **横長である。** 正方形だとチェックボックスに見える
    expect(box.width).toBeGreaterThan(box.height);
  });
});
