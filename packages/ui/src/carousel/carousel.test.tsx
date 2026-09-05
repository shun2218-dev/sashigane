import { describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import type { CarouselOptions } from './carousel.tsx';
import {
  AUTOPLAY_DELAY,
  Carousel,
  CarouselMarkers,
  CarouselNext,
  CarouselPlayPause,
  CarouselPrevious,
  CarouselSlide,
  CarouselSlides,
} from './carousel.tsx';
import Edge from './examples/edge.tsx';
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

const three = (props: Record<string, unknown> = {}) => (
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
    const { container } = await render(onSurface(three({ options: { loop: true } })));
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

describe('自動で送る', () => {
  const auto = (props: Record<string, unknown> = {}) => (
    <Carousel label="見せ物" autoplay {...props}>
      <CarouselSlides>
        {['一', '二', '三'].map((n) => (
          <CarouselSlide key={n}>{n}枚目</CarouselSlide>
        ))}
      </CarouselSlides>
      <CarouselPlayPause />
    </Carousel>
  );

  it('止める手段が無ければ落ちる', async () => {
    /*
     * **WCAG 2.2.2。** 自動で動くものには止める手段が要る。
     *
     * 文書に書くだけでは守られない。**黙って動き続けるほうが害が大きい**——
     * 読んでいる最中に勝手に送られ、止める方法が無い。
     */
    await expect(
      render(
        onSurface(
          <Carousel label="止められないもの" autoplay>
            <CarouselSlides>
              <CarouselSlide>一</CarouselSlide>
              <CarouselSlide>二</CarouselSlide>
            </CarouselSlides>
          </Carousel>,
        ),
      ),
    ).rejects.toThrow();
  });

  it('置いてあれば落ちない', async () => {
    const { container } = await render(onSurface(auto()));
    expect(container.querySelector('[data-sg-component="carousel-play-pause"]')).not.toBeNull();
  });

  it('自動で送らない枠には、止める器を出さない', async () => {
    // **押しても何も起きないものを置かない**
    const { container } = await render(
      onSurface(
        <Carousel label="手で送るもの">
          <CarouselSlides>
            <CarouselSlide>一</CarouselSlide>
          </CarouselSlides>
          <CarouselPlayPause />
        </Carousel>,
      ),
    );
    expect(container.querySelector('[data-sg-component="carousel-play-pause"]')).toBeNull();
  });

  it('押すと止まり、もう一度押すと再生する', async () => {
    const { container } = await render(onSurface(auto()));
    const btn = () =>
      container.querySelector('[data-sg-component="carousel-play-pause"]') as HTMLButtonElement;
    // **札が状態を伝える。** 図案だけでは、いまどちらなのかが読み上げに出ない
    await expect.poll(() => btn().getAttribute('aria-label')).toBe('自動で送るのを止める');
    await userEvent.click(btn());
    await expect.poll(() => btn().getAttribute('aria-label')).toBe('自動で送る');
    await userEvent.click(btn());
    await expect.poll(() => btn().getAttribute('aria-label')).toBe('自動で送るのを止める');
  });

});

describe('例が教えている形', () => {
  /**
   * **例は教材である**（決定6-4）。展示ページも型表もここから出る。
   *
   * 止める器を**送る器の場所に置いてしまい**、「前へ」が消えた例を一度配った。
   * 利用者の指摘で気づいた——**4つとも別の役目を持つ。**
   *
   *   前へ・次へ   場所を移す
   *   止める・再生 勝手に動くのを制する
   *   印           いまどこか
   *
   * 例が片方を落としたら落ちるようにする。
   */
  it('自動で送る例が、送る器も止める器も両方見せている', async () => {
    const { container } = await render(onSurface(<Edge />));
    const auto = container.querySelector('[aria-label="自動で送るもの"]');
    if (!auto) throw new Error('自動で送る例が描画されていません');

    for (const [name, selector] of [
      ['前へ', '[data-sg-component="carousel-previous"]'],
      ['次へ', '[data-sg-component="carousel-next"]'],
      ['止める・再生', '[data-sg-component="carousel-play-pause"]'],
      ['印', '[data-sg-component="carousel-markers"]'],
    ] as const) {
      expect(auto.querySelector(selector), `${name}が例に無い`).not.toBeNull();
    }
  });
});

describe('送りの設定', () => {
  it('Embla の設定をそのまま渡せる', async () => {
    const { container } = await render(
      onSurface(three({ options: { loop: true, align: 'start' } })),
    );
    // **折り返す設定が効いていれば、先頭でも前へ送れる**
    await expect.poll(() => byLabel(container, '前へ').disabled).toBe(false);
  });

  it('duration は型として渡せない', () => {
    /*
     * **送りの速さは動きを減らす設定から決めている。**
     * 渡せるようにすると、利用側がその設定を打ち消せてしまう。
     *
     * これは型で塞いでいる。**走らせても分からない**ので、
     * 型が受け付けないことをここに書き残す。
     */
    // @ts-expect-error duration は受けない
    const rejected: CarouselOptions = { duration: 100 };
    expect(rejected).toBeTruthy();
  });
});
