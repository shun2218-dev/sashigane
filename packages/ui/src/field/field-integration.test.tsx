import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { userEvent } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import { Input } from '../input/input.tsx';
import { Field } from './field.tsx';
import '../../test/tokens.css';

/**
 * **「どのライブラリとも組める」を実際に組んで測る**（決定6-29）。
 *
 * 決定にそう書いたが、**一度も組んでいなかった。**
 * 利用者に指摘されて足した——**試していない主張は、主張でしかない。**
 *
 * ## 何を見るか
 *
 *   1. **react-hook-form** — `register` を撒いても Field の配線が消えないこと
 *   2. **素のフォーム** — ライブラリ無しでも同じ形で書けること
 *
 * ## なぜ配線が消えうるか
 *
 * `register()` は `name` / `onChange` / `onBlur` / `ref` を返し、
 * Field は `id` / `required` / `aria-describedby` / `aria-invalid` を渡す。
 * **どちらも同じ入力へ届く。** 移し方（Slot）は子を勝たせるので、
 * **重なると Field の側が消える。** 重なっていないことを、ここで測る。
 */

const onSurface = (node: React.ReactNode) => <div data-sg-surface="page">{node}</div>;

const inputIn = (container: HTMLElement) => {
  const el = container.querySelector('input');
  if (!el) throw new Error('入力が描画されていません');
  return el;
};

/** react-hook-form と組んだ形。**利用側がこう書く**という見本でもある */
function WithHookForm({ onValid }: { onValid: (value: string) => void }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<{ mail: string }>({ mode: 'onSubmit' });

  return (
    <form onSubmit={handleSubmit((values) => onValid(values.mail))} noValidate>
      <Field id="rhf-mail" label="メールアドレス" error={errors.mail?.message} required>
        <Input {...register('mail', { required: '入力してください' })} />
      </Field>
      <button type="submit">送信</button>
    </form>
  );
}

/** ライブラリ無しの形。**素の `FormData` で受け取る** */
function WithNativeForm({ onValid }: { onValid: (value: string) => void }) {
  const [error, setError] = useState<string | undefined>();
  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        const value = String(new FormData(event.currentTarget).get('mail') ?? '');
        if (!value) {
          setError('入力してください');
          return;
        }
        setError(undefined);
        onValid(value);
      }}
    >
      <Field id="native-mail" label="メールアドレス" error={error} required>
        <Input name="mail" />
      </Field>
      <button type="submit">送信</button>
    </form>
  );
}

describe('react-hook-form と組む', () => {
  it('register を撒いても Field の配線が消えない', async () => {
    const { container } = await render(onSurface(<WithHookForm onValid={() => {}} />));
    const input = inputIn(container);
    const label = container.querySelector('label');

    // **どちらも生きていること。** 重なると片方が消える
    expect(input.id).toBe('rhf-mail');
    expect(input.name).toBe('mail');
    expect(input.required).toBe(true);
    expect(label?.control).toBe(input);
  });

  it('検証に落ちると、誤りが入力に結びつく', async () => {
    const { container } = await render(onSurface(<WithHookForm onValid={() => {}} />));
    const input = inputIn(container);
    expect(input.hasAttribute('aria-invalid')).toBe(false);

    await userEvent.click(container.querySelector('button') as Element);

    await expect.poll(() => input.getAttribute('aria-invalid')).toBe('true');
    const describedBy = input.getAttribute('aria-describedby');
    expect(describedBy).toBe('rhf-mail-error');
    expect(container.querySelector('#rhf-mail-error')?.textContent).toBe('入力してください');
  });

  it('通ると値が届き、誤りが消える', async () => {
    let received: string | undefined;
    const { container } = await render(
      onSurface(<WithHookForm onValid={(v) => { received = v; }} />),
    );
    const input = inputIn(container);
    const submit = container.querySelector('button') as Element;

    await userEvent.click(submit);
    await expect.poll(() => input.getAttribute('aria-invalid')).toBe('true');

    await userEvent.fill(input, 'you@example.com');
    await userEvent.click(submit);

    // **値が届くこと。** register が生きている証拠である
    await expect.poll(() => received).toBe('you@example.com');
    // **誤りが消えること。** 消えないと、直したのに直っていないように見える
    await expect.poll(() => input.hasAttribute('aria-invalid')).toBe(false);
    expect(input.hasAttribute('aria-describedby')).toBe(false);
  });
});

describe('配線を上書きされたとき', () => {
  it('入力の側で id を書くと落ちる', async () => {
    /*
     * **移し方は子を勝たせる**（`asChild` と同じ仕組み）。
     * つまり入力の側で `id` を書くと、**Field が渡した `id` が消える。**
     * 札は Field の `id` を指したままなので、**結びつきだけが静かに切れる。**
     *
     * 見た目は正常で、読み上げだけが黙る。**黙って通さない。**
     */
    expect(() =>
      Field({ id: 'a', label: '札', children: <Input id="b" /> }),
    ).toThrow(/id/);
  });

  it('入力の側で読み上げの配線を書くと落ちる', () => {
    expect(() =>
      Field({ id: 'a', label: '札', children: <Input aria-describedby="x" /> }),
    ).toThrow(/aria-describedby/);
    expect(() =>
      Field({ id: 'a', label: '札', children: <Input aria-invalid /> }),
    ).toThrow(/aria-invalid/);
  });

  it('register が返すものは通る', () => {
    // **register は name / onChange / onBlur / ref を返す。** どれも配線と重ならない
    expect(() =>
      Field({
        id: 'a',
        label: '札',
        children: <Input name="mail" onChange={() => {}} onBlur={() => {}} />,
      }),
    ).not.toThrow();
  });
});

describe('ライブラリ無しで組む', () => {
  it('素のフォームでも同じ形で書ける', async () => {
    let received: string | undefined;
    const { container } = await render(
      onSurface(<WithNativeForm onValid={(v) => { received = v; }} />),
    );
    const input = inputIn(container);
    const submit = container.querySelector('button') as Element;

    expect(input.name).toBe('mail');
    expect(input.id).toBe('native-mail');

    await userEvent.click(submit);
    await expect.poll(() => input.getAttribute('aria-invalid')).toBe('true');
    expect(container.querySelector('#native-mail-error')?.textContent).toBe('入力してください');

    await userEvent.fill(input, 'you@example.com');
    await userEvent.click(submit);
    // **FormData から取れること。** name が生きている証拠である
    await expect.poll(() => received).toBe('you@example.com');
  });
});
