import { describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { Field } from '../field/field.tsx';
import { RadioGroup } from './radio-group.tsx';
import { Radio } from './radio.tsx';
import '../../test/tokens.css';

/**
 * Radio と RadioGroup の保証。**実ブラウザで走る。**
 *
 * 測るのは3つである。
 *
 *   **群れの中で1つだけ選ばれること** — 素の `input` に任せている部分だが、
 *     `name` を配っていないので**利用側が書き忘れると全部が独立に選べる**
 *   **群れの札が読み上げに届くこと** — `fieldset` と `legend` でしか作れない
 *   **印が塗りを宣言していること** — 塗るだけだと前景が置き去りになる（原則5）
 */

const onSurface = (node: React.ReactNode) => <div data-sg-surface="page">{node}</div>;

const radiosIn = (container: HTMLElement) =>
  [...container.querySelectorAll('input[type="radio"]')] as HTMLInputElement[];

const frameIn = (container: HTMLElement) => {
  const el = container.querySelector('[data-sg-component="radio-frame"]');
  if (!el) throw new Error('器が描画されていません');
  return el;
};

const markIn = (el: Element) => {
  const mark = el.querySelector('[aria-hidden="true"]');
  if (!mark) throw new Error('印が描画されていません');
  return mark;
};

const group = (
  <RadioGroup id="g" label="プラン" description="あとから変えられます">
    <Field layout="inline" id="g-a" label="ふつう">
      <Radio name="g-choice" value="a" />
    </Field>
    <Field layout="inline" id="g-b" label="大きい">
      <Radio name="g-choice" value="b" />
    </Field>
  </RadioGroup>
);

describe('前提', () => {
  it('生成した CSS が当たっている', () => {
    expect(
      getComputedStyle(document.documentElement).getPropertyValue('--sg-space-surface').trim(),
    ).not.toBe('');
  });
});

describe('選ぶ', () => {
  it('群れの中で1つだけ選ばれる', async () => {
    const { container } = await render(onSurface(group));
    const [a, b] = radiosIn(container);
    await userEvent.click(a as Element);
    await expect.poll(() => (a as HTMLInputElement).checked).toBe(true);
    await userEvent.click(b as Element);
    // **前のものが外れること。** name が揃っていないと両方入ったままになる
    await expect.poll(() => (a as HTMLInputElement).checked).toBe(false);
    expect((b as HTMLInputElement).checked).toBe(true);
  });

  it('押すと印が出る', async () => {
    const { container } = await render(onSurface(group));
    const first = container.querySelector('[data-sg-component="radio-frame"]');
    if (!first) throw new Error('器が描画されていません');
    expect(getComputedStyle(markIn(first)).display).toBe('none');
    await userEvent.click(radiosIn(container)[0] as Element);
    await expect.poll(() => getComputedStyle(markIn(first)).display).not.toBe('none');
  });

  it('印は塗りを宣言し、輪の中に収まる', async () => {
    const { container } = await render(
      onSurface(<Radio aria-label="x" name="one" value="a" defaultChecked />),
    );
    const frame = frameIn(container);
    const dot = markIn(frame).firstElementChild;
    if (!dot) throw new Error('点が描画されていません');
    expect(dot.getAttribute('data-sg-fill')).toBe('accent');
    expect(getComputedStyle(dot).backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
    // **点は輪より小さいこと。** 同じ大きさだと、選ばれていない側と形が変わって見える
    expect(dot.getBoundingClientRect().width).toBeLessThan(frame.getBoundingClientRect().width);
  });
});

describe('群れの札', () => {
  it('fieldset と legend で作る', async () => {
    const { container } = await render(onSurface(group));
    const fieldset = container.querySelector('fieldset');
    expect(fieldset).not.toBeNull();
    // **legend でしか作れない。** 読み上げは選択肢を読むたびに群れの札を添える
    expect(fieldset?.querySelector('legend')?.textContent).toBe('プラン');
  });

  it('説明が群れに届く', async () => {
    const { container } = await render(onSurface(group));
    const fieldset = container.querySelector('fieldset');
    expect(fieldset?.getAttribute('aria-describedby')).toBe('g-description');
    expect(container.querySelector('#g-description')?.textContent).toBe('あとから変えられます');
  });

  it('誤りは群れに付く', async () => {
    const { container } = await render(
      onSurface(
        <RadioGroup id="e" label="送り方" error="どれか選んでください">
          <Field layout="inline" id="e-a" label="ふつう">
            <Radio name="e-choice" value="a" />
          </Field>
        </RadioGroup>,
      ),
    );
    const fieldset = container.querySelector('fieldset');
    // **選ばれていないのは選択肢1つの問題ではない**ので、群れが名乗る
    expect(fieldset?.getAttribute('aria-invalid')).toBe('true');
    expect(fieldset?.getAttribute('aria-describedby')).toBe('e-error');
    expect(container.querySelector('#e-error')?.textContent).toBe('どれか選んでください');
  });

  it('説明も誤りも無いときは、空の段落を置かない', async () => {
    const { container } = await render(
      onSurface(
        <RadioGroup id="p" label="札だけ">
          <Field layout="inline" id="p-a" label="ふつう">
            <Radio name="p-choice" value="a" />
          </Field>
        </RadioGroup>,
      ),
    );
    // **置くと、何も書かれていない行が読み上げに出る**
    expect(container.querySelectorAll('p').length).toBe(0);
  });
});

describe('面と線', () => {
  it('凹んだ面を宣言し、線は器が描く', async () => {
    const { container } = await render(onSurface(<Radio aria-label="x" name="s" value="a" />));
    const radio = radiosIn(container)[0] as HTMLInputElement;
    expect(radio.getAttribute('data-sg-surface')).toBe('inset');
    const f = getComputedStyle(frameIn(container));
    const b = getComputedStyle(radio);
    expect(f.outlineStyle).toBe('solid');
    expect(Number.parseFloat(f.outlineWidth)).toBeGreaterThan(0);
    // **どちらかに残ると線が2本出る**
    expect(Number.parseFloat(f.borderTopWidth)).toBe(0);
    expect(Number.parseFloat(b.borderTopWidth)).toBe(0);
    expect(b.outlineStyle).toBe('none');
  });

  it('丸い', async () => {
    const { container } = await render(onSurface(<Radio aria-label="x" name="r" value="a" />));
    const frame = frameIn(container);
    const box = frame.getBoundingClientRect();
    const radius = Number.parseFloat(getComputedStyle(frame).borderTopLeftRadius);
    // **四角いと、1つだけ選ぶものだと形から分からない**
    expect(radius).toBeGreaterThanOrEqual(box.width / 2);
  });
});
