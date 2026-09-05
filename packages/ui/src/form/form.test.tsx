import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { Button } from '../button/button.tsx';
import { Field } from '../field/field.tsx';
import { Input } from '../input/input.tsx';
import { Radio } from '../radio/radio.tsx';
import { RadioGroup } from '../radio/radio-group.tsx';
import { Form, FormActions } from './form.tsx';
import '../../test/tokens.css';

/**
 * Form の保証。**実ブラウザで走る。**
 *
 * 測るのは3つである。
 *
 *   **送信に失敗したら最初の誤りへ焦点が移ること** — 誤りが画面の外にあると、
 *     押しても何も起きていないように見える
 *   **利用側の検証が終わってから探すこと** — 待たずに探すと、まだ誰も誤りを名乗っていない
 *   **ブラウザ既定の検証を切ってあること** — Field の文言と二重になる
 */

const onSurface = (node: React.ReactNode) => <div data-sg-surface="page">{node}</div>;

const inputsIn = (container: HTMLElement) =>
  [...container.querySelectorAll('input')] as HTMLInputElement[];

/** 送信すると検証が走るフォーム。**誤りは押した後に付く** */
const Late = ({ async: isAsync = false }: { async?: boolean }) => {
  const [bad, setBad] = useState(false);
  return (
    <Form
      onSubmit={(event) => {
        event.preventDefault();
        if (!isAsync) {
          setBad(true);
          return undefined;
        }
        // **約束を返す書き方。** 検証が非同期に終わる
        return new Promise<void>((resolve) => {
          setTimeout(() => {
            setBad(true);
            resolve();
          }, 30);
        });
      }}
    >
      <Field id="late-a" label="ひとつめ">
        <Input />
      </Field>
      <Field id="late-b" label="ふたつめ" error={bad ? '入力してください' : undefined}>
        <Input />
      </Field>
      <FormActions>
        <Button type="submit">送る</Button>
      </FormActions>
    </Form>
  );
};

describe('前提', () => {
  it('生成した CSS が当たっている', () => {
    expect(
      getComputedStyle(document.documentElement).getPropertyValue('--sg-space-surface').trim(),
    ).not.toBe('');
  });
});

describe('送信に失敗したとき', () => {
  it('最初の誤りへ焦点が移る', async () => {
    const { container } = await render(onSurface(<Late />));
    const submit = container.querySelector('button[type="submit"]');
    await userEvent.click(submit as Element);
    // **押した後に誤りが付く。** 待たずに探すと、まだ誰も名乗っていない
    await expect.poll(() => document.activeElement).toBe(inputsIn(container)[1]);
  });

  it('検証が非同期に終わっても移る', async () => {
    const { container } = await render(onSurface(<Late async />));
    const submit = container.querySelector('button[type="submit"]');
    await userEvent.click(submit as Element);
    await expect.poll(() => document.activeElement).toBe(inputsIn(container)[1]);
  });

  it('焦点を持てないものが名乗っているときは、中の入力へ移る', async () => {
    const { container } = await render(
      onSurface(
        <Form onSubmit={(event) => event.preventDefault()}>
          <RadioGroup id="g" label="プラン" error="どれか選んでください">
            <Field layout="inline" id="g-a" label="ふつう">
              <Radio name="g-choice" value="a" />
            </Field>
          </RadioGroup>
          <FormActions>
            <Button type="submit">送る</Button>
          </FormActions>
        </Form>,
      ),
    );
    const submit = container.querySelector('button[type="submit"]');
    await userEvent.click(submit as Element);
    /*
      **`fieldset` が名乗るが、`fieldset` に焦点は乗らない。**
      名乗っているものに `focus()` を呼ぶだけだと何も起きず、
      利用者から見ると「押しても何も起きない」ままになる。
    */
    await expect.poll(() => document.activeElement).toBe(inputsIn(container)[0]);
  });

  it('欄に誤りが無く、全体の誤りだけのときはそこへ移る', async () => {
    const Rejected = () => {
      const [failed, setFailed] = useState(false);
      return (
        <Form
          error={failed ? '送信できませんでした' : undefined}
          onSubmit={(event) => {
            event.preventDefault();
            setFailed(true);
          }}
        >
          <Field id="r-a" label="ひとつめ">
            <Input />
          </Field>
          <FormActions>
            <Button type="submit">送る</Button>
          </FormActions>
        </Form>
      );
    };
    const { container } = await render(onSurface(<Rejected />));
    await userEvent.click(container.querySelector('button[type="submit"]') as Element);
    /*
      **読み上げには届くが、目で見ている人には届かない。**
      文言はフォームの上端、押したボタンは下端にあるので、
      長いフォームでは画面の外になる——押しても何も起きていないように見える。
    */
    await expect
      .poll(() => document.activeElement)
      .toBe(container.querySelector('[data-sg-component="form-error"]'));
  });

  it('全体の誤りと欄の誤りが両方あるときは、全体の誤りへ移る', async () => {
    const Both = () => {
      const [failed, setFailed] = useState(false);
      return (
        <Form
          error={failed ? '送信できませんでした' : undefined}
          onSubmit={(event) => {
            event.preventDefault();
            setFailed(true);
          }}
        >
          <Field id="b-a" label="ひとつめ" error={failed ? '入力してください' : undefined}>
            <Input />
          </Field>
          <FormActions>
            <Button type="submit">送る</Button>
          </FormActions>
        </Form>
      );
    };
    const { container } = await render(onSurface(<Both />));
    await userEvent.click(container.querySelector('button[type="submit"]') as Element);
    // **なぜ送れなかったかを説明しているのは全体の誤りである。** 上端にあるので、
    // そこへ移せば下へ読み進める形になる
    await expect
      .poll(() => document.activeElement)
      .toBe(container.querySelector('[data-sg-component="form-error"]'));
  });

  it('async で書いた送信処理にも追随する', async () => {
    const Async = () => {
      const [bad, setBad] = useState(false);
      return (
        <Form
          onSubmit={async (event) => {
            event.preventDefault();
            await new Promise((resolve) => {
              setTimeout(resolve, 30);
            });
            setBad(true);
          }}
        >
          <Field id="as-a" label="ひとつめ" error={bad ? '入力してください' : undefined}>
            <Input />
          </Field>
          <FormActions>
            <Button type="submit">送る</Button>
          </FormActions>
        </Form>
      );
    };
    const { container } = await render(onSurface(<Async />));
    await userEvent.click(container.querySelector('button[type="submit"]') as Element);
    // **`async` の関数は約束を返す。** 待てる側である
    await expect.poll(() => document.activeElement).toBe(inputsIn(container)[0]);
  });

  it('誤りが無いときは焦点を動かさない', async () => {
    const { container } = await render(
      onSurface(
        <Form onSubmit={(event) => event.preventDefault()}>
          <Field id="ok-a" label="ひとつめ">
            <Input />
          </Field>
          <FormActions>
            <Button type="submit">送る</Button>
          </FormActions>
        </Form>,
      ),
    );
    const submit = container.querySelector('button[type="submit"]') as HTMLElement;
    await userEvent.click(submit);
    // **押したボタンに焦点が残る。** 勝手に動かすと、次に何を押すか見失う
    await expect.poll(() => document.activeElement).toBe(submit);
  });

  it('切ることもできる', async () => {
    const Off = () => {
      const [bad, setBad] = useState(false);
      return (
        <Form
          focusOnError={false}
          onSubmit={(event) => {
            event.preventDefault();
            setBad(true);
          }}
        >
          <Field id="off-a" label="ひとつめ" error={bad ? '誤り' : undefined}>
            <Input />
          </Field>
          <FormActions>
            <Button type="submit">送る</Button>
          </FormActions>
        </Form>
      );
    };
    const { container } = await render(onSurface(<Off />));
    const submit = container.querySelector('button[type="submit"]') as HTMLElement;
    await userEvent.click(submit);
    await expect.poll(() => inputsIn(container)[0]?.getAttribute('aria-invalid')).toBe('true');
    expect(document.activeElement).toBe(submit);
  });
});

describe('フォーム全体の誤り', () => {
  it('その場で読み上げに届く形で出る', async () => {
    const { container } = await render(
      onSurface(
        <Form error="送信できませんでした">
          <Field id="e-a" label="ひとつめ">
            <Input />
          </Field>
        </Form>,
      ),
    );
    const alert = container.querySelector('[data-sg-component="form-error"]');
    // **指す先が無い。** どの欄が悪いとも言えないので aria-describedby では結べない
    expect(alert?.getAttribute('role')).toBe('alert');
    expect(alert?.textContent).toBe('送信できませんでした');
  });

  it('無いときは空の場所を残さない', async () => {
    const { container } = await render(
      onSurface(
        <Form>
          <Field id="n-a" label="ひとつめ">
            <Input />
          </Field>
        </Form>,
      ),
    );
    // **置くと、何も書かれていない行が読み上げに出る**
    expect(container.querySelector('[data-sg-component="form-error"]')).toBeNull();
  });
});

describe('ブラウザ既定の検証', () => {
  it('切ってある', async () => {
    const { container } = await render(
      onSurface(
        <Form>
          <Field id="v-a" label="ひとつめ" required>
            <Input />
          </Field>
        </Form>,
      ),
    );
    const form = container.querySelector('form');
    // **既定の吹き出しは Field の文言と二重になる。** 見た目も位置も揃わない
    expect(form?.noValidate).toBe(true);
    // 必須であること自体は残す。**読み上げには届く**
    expect(inputsIn(container)[0]?.required).toBe(true);
  });

  it('戻すこともできる', async () => {
    const { container } = await render(
      onSurface(
        <Form noValidate={false}>
          <Field id="w-a" label="ひとつめ" required>
            <Input />
          </Field>
        </Form>,
      ),
    );
    expect(container.querySelector('form')?.noValidate).toBe(false);
  });
});
