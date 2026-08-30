import { describe, expect, it } from 'vitest';
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
    const border = (el: Element) => getComputedStyle(el).borderTopColor;
    expect(border(inputIn(bad.container))).not.toBe(border(inputIn(plain.container)));
  });
});
