import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { userEvent } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import { Checkbox } from '../checkbox/checkbox.tsx';
import { Input } from '../input/input.tsx';
import { PasswordInput } from '../password-input/password-input.tsx';
import { Radio } from '../radio/radio.tsx';
import { RadioGroup } from '../radio/radio-group.tsx';
import { Select } from '../select/select.tsx';
import { Switch } from '../switch/switch.tsx';
import { Textarea } from '../textarea/textarea.tsx';
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
     * ラベルは Field の `id` を指したままなので、**結びつきだけが静かに切れる。**
     *
     * 見た目は正常で、読み上げだけが黙る。**黙って通さない。**
     */
    expect(() =>
      Field({ id: 'a', label: 'ラベル', children: <Input id="b" /> }),
    ).toThrow(/id/);
  });

  it('入力の側で読み上げの配線を書くと落ちる', () => {
    expect(() =>
      Field({ id: 'a', label: 'ラベル', children: <Input aria-describedby="x" /> }),
    ).toThrow(/aria-describedby/);
    expect(() =>
      Field({ id: 'a', label: 'ラベル', children: <Input aria-invalid /> }),
    ).toThrow(/aria-invalid/);
  });

  it('register が返すものは通る', () => {
    // **register は name / onChange / onBlur / ref を返す。** どれも配線と重ならない
    expect(() =>
      Field({
        id: 'a',
        label: 'ラベル',
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

/**
 * **配線が届く先を、部品ごとに測る**（Issue #242）。
 *
 * 上の2つは `Input` だけを使っている。**Field の子になりうる部品は6つある。**
 * Field は配線を Slot で子へ移すので、**受け取った側が読み上げの届く要素まで
 * 運ばないと、見た目は正常なまま結びつきだけが切れる。**
 * それを測っていたのは `Input` だけだった。
 *
 * ## 焦点が当たる要素は部品ごとに違う
 *
 * `Select` は隠した `select` ではなく **`role="combobox"` の引き金**に配線が付く。
 * `PasswordInput` は入力と切り替え釦の複合で、**入力の側**に付く。
 * だから「`input` を探す」では測れない。**部品ごとに、どれが読み上げの相手かを書く。**
 */
const CONTROLS = [
  {
    name: 'Input',
    node: (props: Record<string, unknown>) => <Input {...props} />,
    control: (c: HTMLElement) => c.querySelector('[data-sg-component="input"]'),
  },
  {
    name: 'Textarea',
    node: (props: Record<string, unknown>) => <Textarea {...props} />,
    control: (c: HTMLElement) => c.querySelector('[data-sg-component="textarea"]'),
  },
  {
    name: 'Select',
    // **引き金に付く。** 隠した `select` は値をフォームに載せるためのものである
    node: (props: Record<string, unknown>) => (
      <Select options={[{ value: 'a', label: 'あ' }]} {...props} />
    ),
    control: (c: HTMLElement) => c.querySelector('[data-sg-component="select"]'),
  },
  {
    name: 'Checkbox',
    node: (props: Record<string, unknown>) => <Checkbox {...props} />,
    control: (c: HTMLElement) => c.querySelector('[data-sg-component="checkbox"]'),
  },
  {
    name: 'Switch',
    node: (props: Record<string, unknown>) => <Switch {...props} />,
    control: (c: HTMLElement) => c.querySelector('[data-sg-component="switch"]'),
  },
  {
    name: 'PasswordInput',
    // **切り替え釦ではなく入力に付く。** 釦へ漏れると、説明が釦の説明になる
    node: (props: Record<string, unknown>) => <PasswordInput {...props} />,
    control: (c: HTMLElement) => c.querySelector('[data-sg-component="password-input"]'),
  },
] as const;

const controlOf = (container: HTMLElement, entry: (typeof CONTROLS)[number]) => {
  const el = entry.control(container);
  if (!(el instanceof HTMLElement)) {
    throw new Error(`${entry.name} の配線先が見つかりません`);
  }
  return el;
};

describe('配線が届く先（部品ごと）', () => {
  for (const entry of CONTROLS) {
    describe(entry.name, () => {
      it('ラベルが配線先を指し、押すと焦点が移る', async () => {
        const id = `wire-${entry.name}`;
        const { container } = await render(
          onSurface(
            <Field id={id} label="なまえ">
              {entry.node({})}
            </Field>,
          ),
        );
        const control = controlOf(container, entry);
        expect(control.id, '配線先が Field の id を持っていない').toBe(id);

        const label = container.querySelector('[data-sg-component="field-label"]');
        expect(label?.getAttribute('for')).toBe(id);

        // **押して確かめる。** 属性が合っていても、焦点が移らなければ届いていない
        await userEvent.click(label as HTMLElement);
        expect(document.activeElement, 'ラベルを押しても焦点が移らない').toBe(control);
      });

      it('説明と誤りが、両方とも配線先に結びつく', async () => {
        const id = `desc-${entry.name}`;
        const { container } = await render(
          onSurface(
            <Field id={id} label="なまえ" description="半角で" error="入力してください">
              {entry.node({})}
            </Field>,
          ),
        );
        const control = controlOf(container, entry);
        const described = control.getAttribute('aria-describedby')?.split(' ') ?? [];
        expect(described, '説明が結びついていない').toContain(`${id}-description`);
        expect(described, '誤りが結びついていない').toContain(`${id}-error`);
        // **指した先が実在すること。** id を書いても要素が無ければ読み上げは黙る
        for (const target of described) {
          expect(container.querySelector(`#${target}`), `${target} が実在しない`).not.toBeNull();
        }
        /*
          **配線を受け取るのは1つだけである。**

          複合の部品（`PasswordInput` は入力と切り替え釦）で外側の器に撒くと、
          **釦のほうも同じ説明を読む。** 読み上げは同じ文言を2度読み、
          「表示する」という釦に「半角で」という説明が付く。
          属性が付いていること自体は正しいので、**上の検査では捕まらない。**
        */
        const carriers = container.querySelectorAll(`[aria-describedby~="${id}-description"]`);
        expect(carriers.length, '説明を受け取っている要素が1つではない').toBe(1);
      });

      it('誤りのときだけ aria-invalid が立つ', async () => {
        const clean = await render(
          onSurface(
            <Field id={`ok-${entry.name}`} label="なまえ">
              {entry.node({})}
            </Field>,
          ),
        );
        expect(controlOf(clean.container, entry).hasAttribute('aria-invalid')).toBe(false);

        const bad = await render(
          onSurface(
            <Field id={`ng-${entry.name}`} label="なまえ" error="入力してください">
              {entry.node({})}
            </Field>,
          ),
        );
        expect(controlOf(bad.container, entry).getAttribute('aria-invalid')).toBe('true');
      });

      it('必須が配線先まで届く', async () => {
        const { container } = await render(
          onSurface(
            <Field id={`req-${entry.name}`} label="なまえ" required>
              {entry.node({})}
            </Field>,
          ),
        );
        const control = controlOf(container, entry);
        // **引き金は `required` を持てない。** 読み上げには `aria-required` で伝わる
        const required =
          control.hasAttribute('required') || control.getAttribute('aria-required') === 'true';
        expect(required, '必須が配線先まで届いていない').toBe(true);
      });
    });
  }
});

/**
 * **RadioGroup は Field の子ではない。**
 *
 * `radiogroup` は `label htmlFor` で名付けられないので、`fieldset` / `legend` で
 * 自前に組んである。**利用者から見れば約束は同じ**なので、同じ項目を測る。
 *
 * 配線が2箇所にあること自体は別の問題として残っている。
 */
describe('RadioGroup（Field の子ではないが、同じ約束を持つ）', () => {
  it('説明と誤りがグループに結びつき、誤りのときだけ aria-invalid が立つ', async () => {
    const { container } = await render(
      onSurface(
        <RadioGroup id="rg" label="どれか" description="ひとつ選ぶ" error="選んでください">
          <Radio name="rg" value="a" aria-label="あ" />
          <Radio name="rg" value="b" aria-label="い" />
        </RadioGroup>,
      ),
    );
    const group = container.querySelector('[data-sg-component="radio-group"]');
    if (!(group instanceof HTMLElement)) throw new Error('グループが描画されていません');

    const described = group.getAttribute('aria-describedby')?.split(' ') ?? [];
    expect(described).toContain('rg-description');
    expect(described).toContain('rg-error');
    for (const target of described) {
      expect(container.querySelector(`#${target}`), `${target} が実在しない`).not.toBeNull();
    }
    expect(group.getAttribute('aria-invalid')).toBe('true');
  });
});
