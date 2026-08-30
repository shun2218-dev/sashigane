import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { Input } from '../input/input.tsx';
import { Field } from './field.tsx';
import '../../test/tokens.css';

/**
 * Field の保証。**実ブラウザで走る。**
 *
 * 測るのは1つに尽きる——**結びつけが実際にできていること。**
 *
 * 札と入力、説明と入力、誤りと入力。**どれも忘れると読み上げだけが黙る。**
 * 見た目は正常なので、ここで測らないと誰も気づかない。
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

describe('結びつけ', () => {
  it('札が入力を指す', async () => {
    const { container } = await render(
      onSurface(
        <Field id="a" label="札">
          <Input />
        </Field>,
      ),
    );
    const label = container.querySelector('label');
    expect(label?.getAttribute('for')).toBe('a');
    expect(inputIn(container).id).toBe('a');
    // **実際に結べていること。** 属性が揃っていても、id がずれていれば結べない
    expect(label?.control).toBe(inputIn(container));
  });

  it('説明が入力に届く', async () => {
    const { container } = await render(
      onSurface(
        <Field id="b" label="札" description="説明の文">
          <Input />
        </Field>,
      ),
    );
    const described = inputIn(container).getAttribute('aria-describedby');
    expect(described).toBe('b-description');
    expect(container.querySelector('#b-description')?.textContent).toBe('説明の文');
  });

  it('誤りが入力に届き、入力が誤りを名乗る', async () => {
    const { container } = await render(
      onSurface(
        <Field id="c" label="札" error="誤りの文">
          <Input />
        </Field>,
      ),
    );
    const input = inputIn(container);
    expect(input.getAttribute('aria-describedby')).toBe('c-error');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(container.querySelector('#c-error')?.textContent).toBe('誤りの文');
  });

  it('説明と誤りが両方あるときは、両方届く', async () => {
    const { container } = await render(
      onSurface(
        <Field id="d" label="札" description="説明" error="誤り">
          <Input />
        </Field>,
      ),
    );
    // **片方だけにすると、もう片方が読み上げに届かない**
    expect(inputIn(container).getAttribute('aria-describedby')).toBe('d-description d-error');
  });

  it('誤りが無いときは誤りを名乗らない', async () => {
    const { container } = await render(
      onSurface(
        <Field id="e" label="札">
          <Input />
        </Field>,
      ),
    );
    const input = inputIn(container);
    expect(input.hasAttribute('aria-invalid')).toBe(false);
    // **空の関連付けを残さない。** 指す先が無い id を書くと、読み上げが黙る
    expect(input.hasAttribute('aria-describedby')).toBe(false);
  });

  it('必須は札にも入力にも届く', async () => {
    const { container } = await render(
      onSurface(
        <Field id="f" label="札" required>
          <Input />
        </Field>,
      ),
    );
    expect(inputIn(container).required).toBe(true);
    // **記号だけでは読み上げに届かない。** 文字も一緒に置く
    expect(container.querySelector('label')?.textContent).toContain('必須');
  });

  it('説明も誤りも無いときは、空の段落を置かない', async () => {
    const { container } = await render(
      onSurface(
        <Field id="g" label="札">
          <Input />
        </Field>,
      ),
    );
    // **置くと、何も書かれていない行が読み上げに出る**
    expect(container.querySelectorAll('p').length).toBe(0);
  });
});

describe('誤りの見た目', () => {
  it('誤りのときだけ境界が変わる', async () => {
    const plain = await render(
      onSurface(
        <Field id="h" label="札">
          <Input />
        </Field>,
      ),
    );
    const bad = await render(
      onSurface(
        <Field id="i" label="札" error="誤り">
          <Input />
        </Field>,
      ),
    );
    const lineColor = (el: Element) => getComputedStyle(el).outlineColor;
    expect(lineColor(inputIn(bad.container))).not.toBe(lineColor(inputIn(plain.container)));
  });
});

/**
 * 満たしていることの表示（決定6-30）。
 *
 * 測るのは3つである。
 *
 *   **誤りと同じ見た目にならないこと** — 同じなら状態を分けた意味が無い
 *   **線が太いこと** — 1px では色の面積が足りず、違いが読み取りにくい
 *   **印が読み上げに出ないこと** — 出ても「チェック」としか言わない
 */
describe('満たしていること', () => {
  it('線が誤りとも通常とも違う', async () => {
    const plain = await render(
      onSurface(
        <Field id="v1" label="札">
          <Input />
        </Field>,
      ),
    );
    const ok = await render(
      onSurface(
        <Field id="v2" label="札" valid>
          <Input />
        </Field>,
      ),
    );
    const bad = await render(
      onSurface(
        <Field id="v3" label="札" error="誤り">
          <Input />
        </Field>,
      ),
    );
    const lineColor = (c: HTMLElement) => getComputedStyle(inputIn(c)).outlineColor;
    const seen = new Set([
      lineColor(plain.container),
      lineColor(ok.container),
      lineColor(bad.container),
    ]);
    // **3つとも違うこと。** 潰れていたら状態を分けた意味が無い
    expect(seen.size).toBe(3);
  });

  it('状態の線は通常より太い', async () => {
    const plain = await render(
      onSurface(
        <Field id="w1" label="札">
          <Input />
        </Field>,
      ),
    );
    const ok = await render(
      onSurface(
        <Field id="w2" label="札" valid>
          <Input />
        </Field>,
      ),
    );
    const bad = await render(
      onSurface(
        <Field id="w3" label="札" error="誤り">
          <Input />
        </Field>,
      ),
    );
    const w = (c: HTMLElement) => Number.parseFloat(getComputedStyle(inputIn(c)).outlineWidth);
    // **1px では色の面積が足りず、違いが読み取りにくい**
    expect(w(ok.container)).toBeGreaterThan(w(plain.container));
    expect(w(bad.container)).toBeGreaterThan(w(plain.container));
  });

  it('印が出て、読み上げには出ない', async () => {
    const { container } = await render(
      onSurface(
        <Field id="v4" label="札" valid>
          <Input />
        </Field>,
      ),
    );
    const check = container.querySelector('[data-sg-component="icon-check"]');
    expect(check).not.toBeNull();
    // **出ても「チェック」としか言わない。** 状態は境界が伝える
    expect(check?.getAttribute('aria-hidden')).toBe('true');
  });

  it('印が文字に重ならない', async () => {
    const { container } = await render(
      onSurface(
        <Field id="v5" label="札" valid>
          <Input />
        </Field>,
      ),
    );
    const input = inputIn(container);
    const check = container.querySelector('[data-sg-component="icon-check"]');
    if (!check) throw new Error('印が描画されていません');
    const gap = input.getBoundingClientRect().right - check.getBoundingClientRect().right;
    // 器の中に収まっていること
    expect(gap).toBeGreaterThan(0);
    // **文字の入る幅を空けていること。** 空けないと長い文字が印の下へ潜る
    expect(Number.parseFloat(getComputedStyle(input).paddingInlineEnd)).toBeGreaterThan(
      Number.parseFloat(getComputedStyle(input).paddingInlineStart),
    );
  });

  it('誤りと同時に渡すと、誤りが勝つ', async () => {
    const { container } = await render(
      onSurface(
        <Field id="v6" label="札" valid error="誤り">
          <Input />
        </Field>,
      ),
    );
    // **両方は成り立たない**
    expect(container.querySelector('[data-sg-component="icon-check"]')).toBeNull();
    expect(inputIn(container).getAttribute('aria-invalid')).toBe('true');
  });
});

/**
 * 状態が変わっても入力が続けられること。
 *
 * **入力中に誤りと満たしているが入れ替わる。** そこで入力が描き直されると、
 * **打っている最中にフォーカスが外れる。**
 *
 * 見た目には何も出ない——文字が入らなくなるだけである。
 */
const Toggling = () => {
  const [value, setValue] = useState('');
  const short = value.length > 0 && value.length < 3;
  return (
    <Field
      id="tg"
      label="札"
      valid={value.length >= 3}
      error={short ? '短い' : undefined}
    >
      <Input value={value} onChange={(e) => setValue(e.target.value)} />
    </Field>
  );
};

describe('入力中に状態が変わるとき', () => {
  it('誤りから満たしているへ変わっても、打ち続けられる', async () => {
    const { container } = await render(onSurface(<Toggling />));
    await userEvent.click(inputIn(container));
    // 3文字目で満たしている側へ変わる。**そこで描き直されると4文字目が入らない**
    await userEvent.keyboard('abcd');
    expect(inputIn(container).value).toBe('abcd');
    expect(document.activeElement).toBe(inputIn(container));
  });

  it('満たしているから誤りへ戻っても、打ち続けられる', async () => {
    const { container } = await render(onSurface(<Toggling />));
    await userEvent.click(inputIn(container));
    await userEvent.keyboard('abc');
    // 3文字目を消すと誤りの側へ戻る。**逆向きでも同じことが起きる**
    await userEvent.keyboard('{Backspace}{Backspace}');
    expect(inputIn(container).value).toBe('a');
    expect(document.activeElement).toBe(inputIn(container));
  });
});
