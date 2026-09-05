import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import { Breadcrumb, BreadcrumbItem } from './breadcrumb.tsx';
import '../../test/tokens.css';

/**
 * Breadcrumb の保証。**実ブラウザで走る。**
 *
 * 測るのは4つである。
 *
 *   **区切りを器が入れ、読み上げに出さないこと** — 利用側に書かせると付け忘れられる
 *   **末尾だけが「いま居る場所」を名乗ること** — 組み替えても付け替え忘れが起きない
 *   **`ol` の中に `li` 以外が出ないこと** — 区切りも `li` で包む必要がある
 *   **面の宣言が背景と前景を同時に変えること** — 塗るだけの道が残っていないこと
 *   **要素だけを数えること** — 混ざったものに区切りが付くと、道筋が増えて見える
 */

const onSurface = (node: React.ReactNode) => <div data-sg-surface="page">{node}</div>;

const three = (props: Record<string, unknown> = {}) => (
  <Breadcrumb {...props}>
    <BreadcrumbItem href="/">ホーム</BreadcrumbItem>
    <BreadcrumbItem href="/docs">ドキュメント</BreadcrumbItem>
    <BreadcrumbItem>はじめに</BreadcrumbItem>
  </Breadcrumb>
);

const items = (c: HTMLElement) =>
  [...c.querySelectorAll('[data-sg-component="breadcrumb-item"]')] as HTMLElement[];
const separators = (c: HTMLElement) =>
  [...c.querySelectorAll('[data-sg-component="breadcrumb-separator"]')] as HTMLElement[];

describe('区切り', () => {
  it('項目のあいだにだけ入る', async () => {
    const { container } = await render(onSurface(three()));
    await expect.poll(() => items(container).length).toBe(3);
    // 3つの項目に区切りは2つ。**先頭に記号が浮かない**
    expect(separators(container).length).toBe(2);
  });

  it('1つしか無いときは出ない', async () => {
    const { container } = await render(
      onSurface(
        <Breadcrumb>
          <BreadcrumbItem>ホーム</BreadcrumbItem>
        </Breadcrumb>,
      ),
    );
    await expect.poll(() => items(container).length).toBe(1);
    expect(separators(container).length).toBe(0);
  });

  it('読み上げに出ない', async () => {
    const { container } = await render(onSurface(three()));
    await expect.poll(() => separators(container).length).toBe(2);
    // **出すと項目の数だけ記号が読まれる**
    for (const s of separators(container)) {
      expect(s.getAttribute('aria-hidden')).toBe('true');
    }
  });

  it('形を差し替えられる', async () => {
    const { container } = await render(onSurface(three({ separator: '›' })));
    await expect.poll(() => separators(container)[0]?.textContent).toBe('›');
  });
});

describe('いま居る場所', () => {
  it('末尾だけが名乗る', async () => {
    const { container } = await render(onSurface(three()));
    await expect.poll(() => items(container).length).toBe(3);
    const [first, second, last] = items(container);
    expect(first?.getAttribute('aria-current')).toBe(null);
    expect(second?.getAttribute('aria-current')).toBe(null);
    // **利用側に書かせない。** 組み替えたときに付け替え忘れる
    expect(last?.getAttribute('aria-current')).toBe('page');
  });

  it('末尾に href があってもリンクのまま名乗る', async () => {
    const { container } = await render(
      onSurface(
        <Breadcrumb>
          <BreadcrumbItem href="/">ホーム</BreadcrumbItem>
          <BreadcrumbItem href="/here">ここ</BreadcrumbItem>
        </Breadcrumb>,
      ),
    );
    await expect.poll(() => items(container).length).toBe(2);
    const last = items(container)[1];
    expect(last?.tagName).toBe('A');
    expect(last?.getAttribute('aria-current')).toBe('page');
  });

  it('href が無ければリンクにならない', async () => {
    const { container } = await render(onSurface(three()));
    await expect.poll(() => items(container).length).toBe(3);
    // **行き先の無いリンクを作らない。** 押せるように見えて何も起きない
    expect(items(container)[2]?.tagName).toBe('SPAN');
  });
});

describe('組み立て', () => {
  it('道筋が名前を名乗る', async () => {
    const { container } = await render(onSurface(three({ label: '現在地' })));
    const nav = container.querySelector('[data-sg-component="breadcrumb"]');
    expect(nav?.tagName).toBe('NAV');
    expect(nav?.getAttribute('aria-label')).toBe('現在地');
  });

  it('ol の子は li だけである', async () => {
    const { container } = await render(onSurface(three()));
    await expect.poll(() => container.querySelector('ol')?.children.length).toBe(5);
    const list = container.querySelector('ol');
    // **区切りも li で包む。** ol は li 以外を子に置けない
    for (const child of [...(list?.children ?? [])]) {
      expect(child.tagName).toBe('LI');
    }
  });

  it('asChild で名乗りと申告が子へ移る', async () => {
    const { container } = await render(
      onSurface(
        <Breadcrumb>
          <BreadcrumbItem asChild>
            <a href="/" data-router="next">
              ホーム
            </a>
          </BreadcrumbItem>
          <BreadcrumbItem asChild>
            <span data-router="next">ここ</span>
          </BreadcrumbItem>
        </Breadcrumb>,
      ),
    );
    await expect.poll(() => items(container).length).toBe(2);
    const [first, last] = items(container);
    // **枠を1つも作らない。** 子がそのまま名乗る
    expect(first?.getAttribute('data-router')).toBe('next');
    expect(last?.getAttribute('data-router')).toBe('next');
    expect(last?.getAttribute('aria-current')).toBe('page');
  });
});

describe('面', () => {
  it('面が深くなると前景が追随する', async () => {
    const { container } = await render(
      <div data-sg-surface="page">
        <div data-sg-surface="surface">{three()}</div>
      </div>,
    );
    const shallow = await render(onSurface(three()));
    await expect.poll(() => items(container).length).toBe(3);
    await expect.poll(() => items(shallow.container).length).toBe(3);

    /*
      **塗るだけの道が残っていないことを、前景の側から測る。**
      パンくずは自分では塗らないので、宣言が効いているかは
      **文字色が段を追ったか**でしか分からない。
    */
    const deepText = () => getComputedStyle(items(container)[0] as HTMLElement).color;
    const shallowText = () =>
      getComputedStyle(items(shallow.container)[0] as HTMLElement).color;
    await expect.poll(deepText).not.toBe(shallowText());
  });

  it('いま居る場所は、道筋の途中より濃い', async () => {
    const { container } = await render(onSurface(three()));
    await expect.poll(() => items(container).length).toBe(3);
    const [first, , last] = items(container);
    // **色だけで伝えていない**（aria-current が読み上げに届く）が、
    // 見た目の側でも区別が付いていること
    expect(getComputedStyle(first as HTMLElement).color).not.toBe(
      getComputedStyle(last as HTMLElement).color,
    );
  });
});

describe('数え方', () => {
  it('要素でない子は数えない', async () => {
    const { container } = await render(
      onSurface(
        <Breadcrumb>
          <BreadcrumbItem href="/">ホーム</BreadcrumbItem>
          {' / '}
          <BreadcrumbItem>ここ</BreadcrumbItem>
        </Breadcrumb>,
      ),
    );
    await expect.poll(() => items(container).length).toBe(2);
    /*
      **他所から移ってきた人は、自分で区切りを書く。**
      文字を数えると区切りが2つ付き、**末尾が「いま居る場所」でなくなる。**
    */
    expect(separators(container).length).toBe(1);
    expect(items(container)[1]?.getAttribute('aria-current')).toBe('page');
  });
});
