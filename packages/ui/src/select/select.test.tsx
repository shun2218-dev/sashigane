import { describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { Field } from '../field/field.tsx';
import { Select } from './select.tsx';
import '../../test/tokens.css';

/**
 * Select の保証。**実ブラウザで走る。**
 *
 * この部品は素の `select` を捨てているので、**ブラウザが持っていた操作を
 * 自分で持ち直している。** 測るのはその全部である。
 *
 *   **キーボードで開いて選べること** — 矢印・Home/End・Enter・Escape・打った文字
 *   **押せない選択肢を飛ばすこと** — 止まれると、選べないものを選ぼうとして何も起きない
 *   **値がフォームに載ること** — 見えている部分は値を持たない
 *   **読み上げに必要な属性が揃うこと** — フォーカスを動かさない作りなので、属性が全部である
 */

const onSurface = (node: React.ReactNode) => <div data-sg-surface="page">{node}</div>;

const options = [
  { value: 'a', label: 'あんず' },
  { value: 'b', label: 'いちご' },
  { value: 'c', label: 'うめ', disabled: true },
  { value: 'd', label: 'えのき' },
];

const triggerIn = (container: HTMLElement) => {
  const el = container.querySelector('[role="combobox"]');
  if (!el) throw new Error('引き金が描画されていません');
  return el as HTMLButtonElement;
};

const listIn = (container: HTMLElement) => container.querySelector('[role="listbox"]');

const optionsIn = (container: HTMLElement) =>
  [...container.querySelectorAll('[role="option"]')] as HTMLElement[];

const nativeIn = (container: HTMLElement) => {
  const el = container.querySelector('select');
  if (!el) throw new Error('隠した select が描画されていません');
  return el;
};

/** いま指しているもの。**フォーカスは引き金にあるので、属性から辿るしかない** */
const activeIn = (container: HTMLElement) => {
  const id = triggerIn(container).getAttribute('aria-activedescendant');
  return id ? container.querySelector(`#${CSS.escape(id)}`)?.textContent : null;
};

describe('前提', () => {
  it('生成した CSS が当たっている', () => {
    expect(
      getComputedStyle(document.documentElement).getPropertyValue('--sg-space-surface').trim(),
    ).not.toBe('');
  });
});

describe('開け閉め', () => {
  it('押すと開き、もう一度押すと閉じる', async () => {
    const { container } = await render(onSurface(<Select aria-label="果物" options={options} />));
    expect(listIn(container)).toBeNull();
    expect(triggerIn(container).getAttribute('aria-expanded')).toBe('false');

    await userEvent.click(triggerIn(container));
    await expect.poll(() => listIn(container)).not.toBeNull();
    expect(triggerIn(container).getAttribute('aria-expanded')).toBe('true');

    await userEvent.click(triggerIn(container));
    await expect.poll(() => listIn(container)).toBeNull();
  });

  it('外を押すと閉じる', async () => {
    const { container } = await render(
      onSurface(
        <div>
          {/* **一覧より前に置く。** 後ろだと開いた一覧に覆われて押せない */}
          <button type="button">よそ</button>
          <Select aria-label="果物" options={options} />
        </div>,
      ),
    );
    await userEvent.click(triggerIn(container));
    await expect.poll(() => listIn(container)).not.toBeNull();
    // **引き金の {blur} では足りない。** 選択肢を押すときフォーカスを動かさない作りなので、
    // 外を押しても {blur} が来ない場面がある
    await userEvent.click(container.querySelectorAll('button')[0] as Element);
    await expect.poll(() => listIn(container)).toBeNull();
  });

  it('Escape で閉じる', async () => {
    const { container } = await render(onSurface(<Select aria-label="果物" options={options} />));
    await userEvent.click(triggerIn(container));
    await expect.poll(() => listIn(container)).not.toBeNull();
    await userEvent.keyboard('{Escape}');
    await expect.poll(() => listIn(container)).toBeNull();
  });
});

describe('キーボード', () => {
  it('下矢印で開き、矢印で動いて Enter で選べる', async () => {
    const { container } = await render(onSurface(<Select aria-label="果物" options={options} />));
    triggerIn(container).focus();
    await userEvent.keyboard('{ArrowDown}');
    await expect.poll(() => listIn(container)).not.toBeNull();
    await userEvent.keyboard('{ArrowDown}');
    await expect.poll(() => activeIn(container)).toBe('いちご');
    await userEvent.keyboard('{Enter}');
    await expect.poll(() => nativeIn(container).value).toBe('b');
    // 選んだら閉じる
    expect(listIn(container)).toBeNull();
    expect(triggerIn(container).textContent).toContain('いちご');
  });

  it('押せない選択肢を飛ばす', async () => {
    const { container } = await render(onSurface(<Select aria-label="果物" options={options} />));
    triggerIn(container).focus();
    await userEvent.keyboard('{ArrowDown}');
    await userEvent.keyboard('{ArrowDown}{ArrowDown}');
    // あんず → いちご → （うめは飛ばす）→ えのき
    // **止まれると、選べないものを選ぼうとして何も起きない**
    await expect.poll(() => activeIn(container)).toBe('えのき');
  });

  it('Home と End で端へ飛ぶ', async () => {
    const { container } = await render(onSurface(<Select aria-label="果物" options={options} />));
    triggerIn(container).focus();
    await userEvent.keyboard('{ArrowDown}');
    await userEvent.keyboard('{End}');
    await expect.poll(() => activeIn(container)).toBe('えのき');
    await userEvent.keyboard('{Home}');
    await expect.poll(() => activeIn(container)).toBe('あんず');
  });

  it('打った文字で探せる', async () => {
    /*
      **かな漢字変換を通す文字では測れない。** 変換中の打鍵は `key` が
      文字にならず（`Process`）、この仕組みには届かない。
      **日本語のラベルでは効かない**ということでもある。ここでは効く側を測る。
    */
    const latin = [
      { value: 'a', label: 'Apple' },
      { value: 'b', label: 'Banana' },
      { value: 'c', label: 'Cherry' },
    ];
    const { container } = await render(onSurface(<Select aria-label="fruit" options={latin} />));
    triggerIn(container).focus();
    await userEvent.keyboard('{ArrowDown}');
    // **素の select が持っていた操作である。** 無いと長い一覧で辿り着けない
    await userEvent.keyboard('c');
    await expect.poll(() => activeIn(container)).toBe('Cherry');
  });
});

describe('値', () => {
  it('選ぶと隠した select に入り、change が飛ぶ', async () => {
    const seen: string[] = [];
    const { container } = await render(
      onSurface(
        <Select
          aria-label="果物"
          name="fruit"
          options={options}
          onChange={(event) => seen.push(event.target.value)}
        />,
      ),
    );
    await userEvent.click(triggerIn(container));
    await userEvent.click(optionsIn(container)[1] as Element);
    /*
      **素の setter を通してから投げないと、React が握り潰す。**
      握り潰されると値は入るのに onChange が来ない——
      `register()` は値の変化を知らないまま、フォームは空のままになる。
    */
    await expect.poll(() => seen).toEqual(['b']);
    expect(nativeIn(container).value).toBe('b');
  });

  it('フォームに載る', async () => {
    const { container } = await render(
      onSurface(
        <form>
          <Select aria-label="果物" name="fruit" options={options} defaultValue="a" />
        </form>,
      ),
    );
    await userEvent.click(triggerIn(container));
    await userEvent.click(optionsIn(container)[3] as Element);
    const form = container.querySelector('form');
    if (!form) throw new Error('フォームが描画されていません');
    // **見えている部分は値を持たない。** 隠した select だけが持つ
    await expect.poll(() => new FormData(form).get('fruit')).toBe('d');
  });

  it('利用側が値を持つときは、こちらの状態で上書きしない', async () => {
    const { container } = await render(
      onSurface(<Select aria-label="果物" options={options} value="a" />),
    );
    await userEvent.click(triggerIn(container));
    await userEvent.click(optionsIn(container)[1] as Element);
    // **渡された値のまま。** 利用側が受け取って渡し直すまで変わらない
    await expect.poll(() => triggerIn(container).textContent).toContain('あんず');
  });
});

describe('読み上げに渡すもの', () => {
  it('引き金が combobox として名乗り、一覧を指す', async () => {
    const { container } = await render(onSurface(<Select aria-label="果物" options={options} />));
    const trigger = triggerIn(container);
    expect(trigger.getAttribute('aria-haspopup')).toBe('listbox');
    // **閉じているときは指さない。** 指すと読み上げが選択肢を読む
    expect(trigger.hasAttribute('aria-activedescendant')).toBe(false);
    await userEvent.click(trigger);
    await expect.poll(() => listIn(container)?.id).toBe(trigger.getAttribute('aria-controls'));
    expect(trigger.getAttribute('aria-activedescendant')).not.toBeNull();
  });

  it('選ばれているものだけが aria-selected を持つ', async () => {
    const { container } = await render(
      onSurface(<Select aria-label="果物" options={options} defaultValue="b" />),
    );
    await userEvent.click(triggerIn(container));
    const selected = optionsIn(container).filter(
      (o) => o.getAttribute('aria-selected') === 'true',
    );
    expect(selected.map((o) => o.textContent)).toEqual(['いちご']);
  });

  it('隠した select は読み上げにも Tab にも出ない', async () => {
    const { container } = await render(onSurface(<Select aria-label="果物" options={options} />));
    const native = nativeIn(container);
    // 隠さないと同じ選択肢が2回読まれる
    expect(native.getAttribute('aria-hidden')).toBe('true');
    // **`Tab` で見えない部品に入る**のを止める
    expect(native.tabIndex).toBe(-1);
  });

  it('選択肢が無いときも、一覧の中身は選択肢の役割で出す', async () => {
    const { container } = await render(onSurface(<Select aria-label="から" options={[]} />));
    await userEvent.click(triggerIn(container));
    // **役割の無い要素を listbox に置くと、読み上げが数え方を見失う**
    await expect.poll(() => optionsIn(container).length).toBe(1);
    expect(optionsIn(container)[0]?.getAttribute('aria-disabled')).toBe('true');
  });
});

describe('ラベルとの結びつけ', () => {
  it('Field のラベルが引き金を指す', async () => {
    const { container } = await render(
      onSurface(
        <Field id="s" label="果物" error="選んでください">
          <Select options={options} />
        </Field>,
      ),
    );
    const label = container.querySelector('label');
    const trigger = triggerIn(container);
    // **button はラベルを付けられる要素である。** 指せないと読み上げが名前を言えない
    expect(label?.control).toBe(trigger);
    expect(trigger.getAttribute('aria-describedby')).toBe('s-error');
    expect(trigger.getAttribute('aria-invalid')).toBe('true');
  });

  it('誤りのときは線の色が変わる', async () => {
    const plain = await render(onSurface(<Select aria-label="x" options={options} />));
    const bad = await render(onSurface(<Select aria-label="x" options={options} aria-invalid />));
    const frame = (c: HTMLElement) => {
      const el = c.querySelector('[data-sg-component="select-frame"]');
      if (!el) throw new Error('枠が描画されていません');
      return getComputedStyle(el);
    };
    expect(frame(bad.container).outlineColor).not.toBe(frame(plain.container).outlineColor);
  });
});
