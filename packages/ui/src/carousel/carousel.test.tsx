import { describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import {
  Carousel,
  CarouselMarkers,
  CarouselNext,
  CarouselPrevious,
  CarouselSlide,
  CarouselSlides,
} from './carousel.tsx';
import '../../test/tokens.css';

/**
 * Carousel の保証。**実ブラウザで走る。**
 *
 * 測るのは4つである。
 *
 *   **何のカルーセルかが読み上げに出ること** — 出ないと、送っても何を見ているか分からない
 *   **端で押せなくなること** — 送る先が無いのに押せるのは嘘である
 *   **前後のボタンと印が、送り枠の外にあること** — 中にあると一緒に送られて画面の外へ出る
 *   **いまの場所が色以外でも分かること** — 色だけで伝えると、見えない人に届かない
 */

const onSurface = (node: React.ReactNode) => <div data-sg-surface="page">{node}</div>;

const three = (props: { loop?: boolean } = {}) => (
  <Carousel label="おすすめ" {...props}>
    <CarouselSlides>
      {['一', '二', '三'].map((n) => (
        <CarouselSlide key={n}>{n}枚目</CarouselSlide>
      ))}
    </CarouselSlides>
    <CarouselPrevious />
    <CarouselMarkers />
    <CarouselNext />
  </Carousel>
);

const byLabel = (c: HTMLElement, label: string) =>
  c.querySelector(`[aria-label="${label}"]`) as HTMLButtonElement;
const markers = (c: HTMLElement) =>
  [...c.querySelectorAll('[data-sg-component="carousel-marker"]')] as HTMLButtonElement[];

describe('読み上げに何が出るか', () => {
  it('何のカルーセルかを名乗る', async () => {
    const { container } = await render(onSurface(three()));
    const region = container.querySelector('[data-sg-component="carousel"]');
    if (!region) throw new Error('枠が描画されていません');
    expect(region.getAttribute('role')).toBe('region');
    // **この2つが揃って初めて「おすすめのカルーセル」と読まれる**
    expect(region.getAttribute('aria-roledescription')).toBe('carousel');
    expect(region.getAttribute('aria-label')).toBe('おすすめ');
  });

  it('1枚ずつが「スライド」だと伝わる', async () => {
    const { container } = await render(onSurface(three()));
    const slide = container.querySelector('[data-sg-component="carousel-slide"]');
    expect(slide?.getAttribute('role')).toBe('group');
    expect(slide?.getAttribute('aria-roledescription')).toBe('slide');
  });

  it('いまの場所を、色以外でも申告する', async () => {
    const { container } = await render(onSurface(three()));
    await expect.poll(() => markers(container).length).toBe(3);
    // **色だけで伝えると、見えない人に届かない**
    expect(markers(container)[0]?.getAttribute('aria-current')).toBe('true');
    expect(markers(container)[1]?.getAttribute('aria-current')).toBeNull();
  });
});

describe('送り', () => {
  it('端では押せない', async () => {
    const { container } = await render(onSurface(three()));
    await expect.poll(() => byLabel(container, '次へ').disabled).toBe(false);
    // **先頭では前へ送れない。** 送る先が無いのに押せるのは嘘である
    expect(byLabel(container, '前へ').disabled).toBe(true);
  });

  it('1枚だけなら、どちらにも送れない', async () => {
    const { container } = await render(
      onSurface(
        <Carousel label="1枚だけ">
          <CarouselSlides>
            <CarouselSlide>これだけ</CarouselSlide>
          </CarouselSlides>
          <CarouselPrevious />
          <CarouselNext />
        </Carousel>,
      ),
    );
    await expect.poll(() => byLabel(container, '次へ').disabled).toBe(true);
    expect(byLabel(container, '前へ').disabled).toBe(true);
  });

  it('次へ押すと、いまの場所が動く', async () => {
    const { container } = await render(onSurface(three()));
    await expect.poll(() => markers(container).length).toBe(3);
    await userEvent.click(byLabel(container, '次へ'));
    await expect.poll(() => markers(container)[1]?.getAttribute('aria-current')).toBe('true');
    expect(byLabel(container, '前へ').disabled).toBe(false);
  });

  it('折り返す形では端でも押せる', async () => {
    const { container } = await render(onSurface(three({ loop: true })));
    await expect.poll(() => byLabel(container, '前へ').disabled).toBe(false);
  });
});

describe('組み立て', () => {
  /**
   * **前後のボタンと印が、送り枠の中にあってはいけない。**
   *
   * 中に置くと一緒に送られ、**2枚目へ進んだ瞬間に画面の外へ出る。**
   * 見た目には「ボタンが消えた」としか映らない。
   */
  it('ボタンと印が送り枠の外にある', async () => {
    const { container } = await render(onSurface(three()));
    const viewport = container.querySelector('[data-sg-component="carousel-viewport"]');
    if (!viewport) throw new Error('送り枠が描画されていません');
    expect(viewport.contains(byLabel(container, '前へ')), '前へが枠の中にある').toBe(false);
    expect(viewport.contains(byLabel(container, '次へ')), '次へが枠の中にある').toBe(false);
    const marker = markers(container)[0];
    if (marker) expect(viewport.contains(marker), '印が枠の中にある').toBe(false);
  });

  it('枠の外で使うと黙らずに落ちる', async () => {
    // **何も起きないまま黙ると、配線の間違いに気づけない**
    await expect(render(onSurface(<CarouselPrevious />))).rejects.toThrow();
  });
});
