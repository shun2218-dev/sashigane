import { describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { Field } from '../field/field.tsx';
import { PasswordInput } from './password-input.tsx';
import '../../test/tokens.css';

/**
 * PasswordInput の保証。**実ブラウザで走る。**
 *
 * 測るのは4つである。
 *
 *   **既定で隠れていること** — 見えたまま描かれると、肩越しに読まれる
 *   **打っている最中に切り替えてもフォーカスが外れないこと** — 枠を差し替えると
 *     React が中身を作り直し、**文字が入らなくなる。**見た目には何も出ない
 *   **ラベルが状態を伝えること** — 目の絵柄だけでは、いまどちらなのかが読み上げに出ない
 *   **切り替えがフォームを送らないこと** — 既定の `type` は `submit` である
 */

const onSurface = (node: React.ReactNode) => <div data-sg-surface="page">{node}</div>;

const inputIn = (c: HTMLElement) =>
  c.querySelector('[data-sg-component="password-input"]') as HTMLInputElement;
const toggleIn = (c: HTMLElement) =>
  c.querySelector('[data-sg-component="password-input-toggle"]') as HTMLButtonElement;

describe('隠すことと見せること', () => {
  it('既定では隠れている', async () => {
    const { container } = await render(onSurface(<PasswordInput aria-label="パスワード" />));
    expect(inputIn(container).type).toBe('password');
  });

  it('押すと見え、もう一度押すと隠れる', async () => {
    const { container } = await render(onSurface(<PasswordInput aria-label="パスワード" />));
    await userEvent.click(toggleIn(container));
    await expect.poll(() => inputIn(container).type).toBe('text');
    await userEvent.click(toggleIn(container));
    await expect.poll(() => inputIn(container).type).toBe('password');
  });

  it('ラベルが状態を伝える', async () => {
    const { container } = await render(onSurface(<PasswordInput aria-label="パスワード" />));
    const toggle = toggleIn(container);
    expect(toggle.getAttribute('aria-label')).toBe('パスワードを表示');
    await userEvent.click(toggle);
    await expect.poll(() => toggle.getAttribute('aria-label')).toBe('パスワードを隠す');
  });
});

describe('打っている最中に切り替える', () => {
  /**
   * **静止した状態を並べても、この壊れ方は写らない。**
   *
   * 枠の有無を状態で変えると React が中身を作り直し、
   * **フォーカスが外れて、以降の文字が入らなくなる。**
   * 見た目には何も出ないので、打ち続けて初めて分かる。
   *
   * ここは同じ要素の `type` だけが変わるので、作り直しが起きない。
   */
  it('切り替えても、続けて打った文字が入る', async () => {
    const { container } = await render(onSurface(<PasswordInput aria-label="パスワード" />));
    const input = inputIn(container);

    await userEvent.click(input);
    await userEvent.type(input, 'まえ');
    await userEvent.click(toggleIn(container));
    // **切り替えのあと、欄へ戻って打ち続ける**
    await userEvent.click(input);
    await userEvent.type(input, 'あと');

    await expect.poll(() => inputIn(container).value).toBe('まえあと');
    // **要素が作り直されていない**——同じノードのままである
    expect(inputIn(container)).toBe(input);
  });
});

describe('フォームと押せないとき', () => {
  it('切り替えはフォームを送らない', async () => {
    let submitted = 0;
    const { container } = await render(
      onSurface(
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submitted += 1;
          }}
        >
          <PasswordInput aria-label="パスワード" />
        </form>,
      ),
    );
    expect(toggleIn(container).type).toBe('button');
    await userEvent.click(toggleIn(container));
    expect(submitted).toBe(0);
  });

  it('押せないときは切り替えも押せない', async () => {
    const { container } = await render(
      onSurface(<PasswordInput aria-label="パスワード" disabled />),
    );
    // **中身が見えないのに切り替えだけ動くのは嘘である**
    expect(toggleIn(container).disabled).toBe(true);
  });
});

describe('面と線', () => {
  it('凹んだ面を宣言し、線は枠が描く', async () => {
    const { container } = await render(onSurface(<PasswordInput aria-label="パスワード" />));
    const input = inputIn(container);
    expect(input.getAttribute('data-sg-surface')).toBe('inset');
    const frame = container.querySelector('[data-sg-component="password-input-frame"]');
    if (!frame) throw new Error('枠が描画されていません');
    const f = getComputedStyle(frame);
    expect(f.outlineStyle).toBe('solid');
    expect(Number.parseFloat(f.outlineWidth)).toBeGreaterThan(0);
    expect(Number.parseFloat(getComputedStyle(input).borderTopWidth)).toBe(0);
  });

  it('満たしているとき、印と切り替えの場所が重ならない', async () => {
    const { container } = await render(
      onSurface(
        <Field id="p" label="パスワード" valid>
          <PasswordInput />
        </Field>,
      ),
    );
    const mark = container.querySelector('[data-sg-component="icon-check"]');
    if (!mark) throw new Error('満たしている印が描画されていません');
    const a = mark.getBoundingClientRect();
    const b = toggleIn(container).getBoundingClientRect();
    // **重なると、どちらも押しにくく読み取りにくい**
    const overlaps = a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
    expect(overlaps, '印と切り替えが重なっている').toBe(false);
  });
});
