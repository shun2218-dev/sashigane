import { describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { Tabs, TabsList, TabsPanel, TabsTrigger } from './tabs.tsx';
import '../../test/tokens.css';

/**
 * Tabs の保証。**実ブラウザで走る。**
 *
 * 測るのは4つである。
 *
 *   **結びつきが両向きにあること** — 片方だけだと、読み上げがどちらかを言えない
 *   **焦点が入るのは1つだけ** — 全部入ると、タブの数だけ Tab キーを押すことになる
 *   **矢印で移れて、端で折り返すこと**
 *   **押せないものを飛ばすこと** — 止まれるのに開けないのは嘘である
 */

const onSurface = (node: React.ReactNode) => <div data-sg-surface="page">{node}</div>;

const three = (props: Record<string, unknown> = {}) => (
  <Tabs id="t" {...props}>
    <TabsList label="種類">
      <TabsTrigger value="a">1つめ</TabsTrigger>
      <TabsTrigger value="b">2つめ</TabsTrigger>
      <TabsTrigger value="c">3つめ</TabsTrigger>
    </TabsList>
    <TabsPanel value="a">Aの中身</TabsPanel>
    <TabsPanel value="b">Bの中身</TabsPanel>
    <TabsPanel value="c">Cの中身</TabsPanel>
  </Tabs>
);

const tabs = (c: HTMLElement) => [...c.querySelectorAll('[role="tab"]')] as HTMLButtonElement[];
const panels = (c: HTMLElement) => [...c.querySelectorAll('[role="tabpanel"]')] as HTMLElement[];

describe('結びつき', () => {
  it('タブと中身が両向きに指し合う', async () => {
    const { container } = await render(onSurface(three()));
    await expect.poll(() => tabs(container).length).toBe(3);
    const [tab] = tabs(container);
    const [panel] = panels(container);
    if (!tab || !panel) throw new Error('描画されていません');
    // **片方だけだと、読み上げがどちらかを言えない**
    expect(tab.getAttribute('aria-controls')).toBe(panel.id);
    expect(panel.getAttribute('aria-labelledby')).toBe(tab.id);
  });

  it('並びが何のタブかを名乗る', async () => {
    const { container } = await render(onSurface(three()));
    const list = container.querySelector('[role="tablist"]');
    expect(list?.getAttribute('aria-label')).toBe('種類');
  });

  it('選ばれているものだけを申告する', async () => {
    const { container } = await render(onSurface(three()));
    await expect.poll(() => tabs(container)[0]?.getAttribute('aria-selected')).toBe('true');
    expect(tabs(container)[1]?.getAttribute('aria-selected')).toBe('false');
  });
});

describe('焦点', () => {
  it('tab 順に入るのは1つだけ', async () => {
    const { container } = await render(onSurface(three()));
    await expect.poll(() => tabs(container)[0]?.tabIndex).toBe(0);
    // **全部入ると、タブの数だけ Tab キーを押すことになる**
    expect(tabs(container)[1]?.tabIndex).toBe(-1);
    expect(tabs(container)[2]?.tabIndex).toBe(-1);
  });

  it('矢印で移れて、端で折り返す', async () => {
    const { container } = await render(onSurface(three()));
    await expect.poll(() => tabs(container).length).toBe(3);
    tabs(container)[0]?.focus();
    await userEvent.keyboard('{ArrowRight}');
    await expect.poll(() => document.activeElement).toBe(tabs(container)[1]);
    // **端では折り返す。** 端から端へ戻るのに全部通らずに済む
    await userEvent.keyboard('{ArrowLeft}{ArrowLeft}');
    await expect.poll(() => document.activeElement).toBe(tabs(container)[2]);
  });

  it('Home と End で端へ飛ぶ', async () => {
    const { container } = await render(onSurface(three()));
    await expect.poll(() => tabs(container).length).toBe(3);
    tabs(container)[0]?.focus();
    await userEvent.keyboard('{End}');
    await expect.poll(() => document.activeElement).toBe(tabs(container)[2]);
    await userEvent.keyboard('{Home}');
    await expect.poll(() => document.activeElement).toBe(tabs(container)[0]);
  });

  it('押せないものは矢印で飛ばされる', async () => {
    const { container } = await render(
      onSurface(
        <Tabs id="d">
          <TabsList label="種類">
            <TabsTrigger value="a">1つめ</TabsTrigger>
            <TabsTrigger value="b" disabled>
              2つめ
            </TabsTrigger>
            <TabsTrigger value="c">3つめ</TabsTrigger>
          </TabsList>
          <TabsPanel value="a">A</TabsPanel>
          <TabsPanel value="b">B</TabsPanel>
          <TabsPanel value="c">C</TabsPanel>
        </Tabs>,
      ),
    );
    await expect.poll(() => tabs(container).length).toBe(3);
    tabs(container)[0]?.focus();
    await userEvent.keyboard('{ArrowRight}');
    // **止まれるのに開けないのは嘘である**
    await expect.poll(() => document.activeElement).toBe(tabs(container)[2]);
  });
});

describe('開き方', () => {
  it('渡さなければ最初のタブが開く', async () => {
    const { container } = await render(onSurface(three()));
    await expect.poll(() => panels(container)[0]?.hidden).toBe(false);
    expect(panels(container)[1]?.hidden).toBe(true);
  });

  it('矢印で移った先がすぐ開く', async () => {
    const { container } = await render(onSurface(three()));
    await expect.poll(() => tabs(container).length).toBe(3);
    tabs(container)[0]?.focus();
    await userEvent.keyboard('{ArrowRight}');
    await expect.poll(() => panels(container)[1]?.hidden).toBe(false);
  });

  it('押して初めて開く形では、矢印だけでは開かない', async () => {
    const { container } = await render(onSurface(three({ activation: 'manual' })));
    await expect.poll(() => tabs(container).length).toBe(3);
    tabs(container)[0]?.focus();
    await userEvent.keyboard('{ArrowRight}');
    // **焦点は移るが、開かない**
    await expect.poll(() => document.activeElement).toBe(tabs(container)[1]);
    expect(panels(container)[1]?.hidden).toBe(true);
    await userEvent.click(tabs(container)[1] as Element);
    await expect.poll(() => panels(container)[1]?.hidden).toBe(false);
  });

  it('選ばれていない中身も DOM に残る', async () => {
    const { container } = await render(onSurface(three()));
    // **検索で見つかり、印刷にも出る**
    await expect.poll(() => panels(container).length).toBe(3);
  });
});

describe('組み立て', () => {
  it('枠の外で使うと黙らずに落ちる', async () => {
    await expect(render(onSurface(<TabsTrigger value="x">x</TabsTrigger>))).rejects.toThrow();
  });
});
