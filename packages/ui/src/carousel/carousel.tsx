'use client';

/*
 * ── 維持する側への覚書 ───────────────────────────────
 *
 * **送りの仕組みは Embla に任せている。** 依存を1つ持つ。
 *
 * 素の `scroll-snap` でも送りと吸着はできるが、**掴んで引く操作**と
 * **端で折り返す送り**は自分で書くことになる。どちらもサイトやアプリで普通に使われる。
 * `::scroll-button()` と `::scroll-marker` は Chromium にしか無いので、
 * **前後のボタンと位置の印は自分で描く**——乗せると他のブラウザで操作手段が消える。
 *
 * **依存はこの部品を入れた利用者だけが持つ。** 配信 JSON は import から依存を導くので、
 * `@sashigane/carousel` にだけ載る。
 *
 * ## 文脈で配っている
 *
 * この系の部品はほとんど状態を持たないが、**送りの状態は前後のボタンと印が共有する。**
 * props で降ろすと、利用側が配線を書くことになる。
 *
 * ## 動きを減らす設定を尊重する
 *
 * Embla の送りは時間をかけて動く。**減らす設定のときは飛ばす**——
 * 利用側の責務にしない。
 * ─────────────────────────────────────────────
 */
import useEmblaCarousel from 'embla-carousel-react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type HTMLAttributes,
  type ReactNode,
  type Ref,
} from 'react';
import { Button } from '../button/button.tsx';
import { IconChevronLeft, IconChevronRight } from '../icon/icon.tsx';

type EmblaApi = ReturnType<typeof useEmblaCarousel>[1];

interface CarouselState {
  /** 送り枠に付ける ref。**枠は CarouselSlides が描く** */
  viewportRef: ReturnType<typeof useEmblaCarousel>[0];
  api: EmblaApi;
  /** いま見えている枚目（0 始まり） */
  selected: number;
  /** 何枚あるか。**印の数はここから来る** */
  count: number;
  canPrev: boolean;
  canNext: boolean;
}

const Ctx = createContext<CarouselState | null>(null);

const useCarousel = (): CarouselState => {
  const ctx = useContext(Ctx);
  // **枠の外で使うと、何も起きないまま黙る。** 気づけるようにする
  if (!ctx) throw new Error('Carousel の中で使ってください');
  return ctx;
};

export interface CarouselProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * 端で折り返す。**既定は折り返さない。**
   *
   * 折り返すと「最後まで来た」が分からなくなるので、
   * **見せ物**のときだけ入れる。
   */
  loop?: boolean;
  /**
   * 何を並べているかの名前。**読み上げが「何のカルーセルか」を言えるようにする。**
   */
  label: string;
  children?: ReactNode;
  ref?: Ref<HTMLDivElement>;
}

/**
 * 横に送って見せる枠。**送りの仕組みは Embla が持つ。**
 *
 * ```tsx
 * <Carousel label="おすすめ">
 *   <CarouselSlides>
 *     <CarouselSlide>1枚目</CarouselSlide>
 *   </CarouselSlides>
 *   <CarouselPrevious />
 *   <CarouselNext />
 *   <CarouselMarkers />
 * </Carousel>
 * ```
 *
 * ## 名前が要る
 *
 * `label` は必須である。**何のカルーセルかが読み上げに出ない**と、
 * 前後に送っても何を見ているのか分からない。
 */
export function Carousel({ loop = false, label, className, children, ...props }: CarouselProps) {
  /*
    **動きを減らす設定のときは飛ばす。** 利用側の責務にしない。

    描くときに読むとサーバ側で `matchMedia` が無いので、**最初の値だけ遅れて読む。**
    見た目には出ない——変わるのは送りの速さだけである。
  */
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    const q = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduce(q.matches);
    const on = () => setReduce(q.matches);
    q.addEventListener('change', on);
    return () => q.removeEventListener('change', on);
  }, []);

  const [viewportRef, api] = useEmblaCarousel({ loop, duration: reduce ? 0 : 25 });
  const [selected, setSelected] = useState(0);
  const [count, setCount] = useState(0);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  useEffect(() => {
    if (!api) return undefined;
    const sync = () => {
      setSelected(api.selectedScrollSnap());
      setCount(api.scrollSnapList().length);
      setCanPrev(api.canScrollPrev());
      setCanNext(api.canScrollNext());
    };
    sync();
    api.on('select', sync).on('reInit', sync);
    return () => {
      api.off('select', sync).off('reInit', sync);
    };
  }, [api]);

  const classes = 'relative flex flex-col gap-3';
  return (
    <Ctx.Provider value={{ viewportRef, api, selected, count, canPrev, canNext }}>
      <div
        data-sg-component="carousel"
        role="region"
        aria-roledescription="carousel"
        aria-label={label}
        className={className ? `${classes} ${className}` : classes}
        {...props}
      >
        {/*
          **送り枠で包まない。** 前後のボタンや印まで包むと、
          それらが送られて画面の外へ出る。枠を描くのは CarouselSlides である。
        */}
        {children}
      </div>
    </Ctx.Provider>
  );
}

export interface CarouselSlidesProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
  ref?: Ref<HTMLDivElement>;
}

/**
 * 送り枠と、その中で横に並ぶ器。
 *
 * **枠はここが描く。** 前後のボタンや印を包まないためである——
 * 包むと、それらが一緒に送られて画面の外へ出る。
 */
export function CarouselSlides({ className, ...props }: CarouselSlidesProps) {
  const { viewportRef } = useCarousel();
  const classes = 'flex';
  return (
    <div ref={viewportRef} data-sg-component="carousel-viewport" className="overflow-hidden">
      <div
        data-sg-component="carousel-slides"
        className={className ? `${classes} ${className}` : classes}
        {...props}
      />
    </div>
  );
}

export interface CarouselSlideProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
  ref?: Ref<HTMLDivElement>;
}

/**
 * 1枚。**縮まない。**
 *
 * 幅は利用側が決める。**既定は枠いっぱい**で、並べたいときはクラスで変える。
 */
export function CarouselSlide({ className, ...props }: CarouselSlideProps) {
  // **読み上げに「1枚」だと伝える。** 番号は付けない——
  // 何枚目かは送るたびに変わり、静的な属性では嘘になる
  const classes = 'min-w-0 shrink-0 grow-0 basis-full';
  return (
    <div
      data-sg-component="carousel-slide"
      role="group"
      aria-roledescription="slide"
      className={className ? `${classes} ${className}` : classes}
      {...props}
    />
  );
}

export interface CarouselButtonProps {
  /** 読み上げに出す名前。**既定は日本語である**（この系の文言に揃えている） */
  label?: string;
  className?: string;
}

/** 前へ送る。**端では押せない。** */
export function CarouselPrevious({ label = '前へ', className }: CarouselButtonProps) {
  const { api, canPrev } = useCarousel();
  const go = useCallback(() => api?.scrollPrev(), [api]);
  return (
    <Button
      data-sg-component="carousel-previous"
      variant="outline"
      iconOnly
      aria-label={label}
      disabled={!canPrev}
      onClick={go}
      className={className}
    >
      <IconChevronLeft />
    </Button>
  );
}

/** 次へ送る。**端では押せない。** */
export function CarouselNext({ label = '次へ', className }: CarouselButtonProps) {
  const { api, canNext } = useCarousel();
  const go = useCallback(() => api?.scrollNext(), [api]);
  return (
    <Button
      data-sg-component="carousel-next"
      variant="outline"
      iconOnly
      aria-label={label}
      disabled={!canNext}
      onClick={go}
      className={className}
    >
      <IconChevronRight />
    </Button>
  );
}

export interface CarouselMarkersProps {
  /** 1つずつの名前を作る。**既定は「N枚目」** */
  label?: (index: number, count: number) => string;
  className?: string;
}

/**
 * どこを見ているかの印。**押すとそこへ飛ぶ。**
 *
 * `::scroll-marker` はブラウザが作ってくれるが **Chromium にしか無い。**
 * 乗せると他のブラウザで印が消えるので、自分で描いている。
 */
export function CarouselMarkers({
  label = (i, n) => `${i + 1}枚目（全${n}枚）`,
  className,
}: CarouselMarkersProps) {
  const { api, selected, count } = useCarousel();
  const classes = 'flex items-center justify-center gap-2';
  return (
    <div
      data-sg-component="carousel-markers"
      className={className ? `${classes} ${className}` : classes}
    >
      {Array.from({ length: count }, (_, i) => (
        <button
          key={i}
          type="button"
          data-sg-component="carousel-marker"
          data-sg-fill={i === selected ? 'accent' : undefined}
          aria-label={label(i, count)}
          // **いまの場所を申告する。** 色だけで伝えると、見えない人に届かない
          aria-current={i === selected ? 'true' : undefined}
          onClick={() => api?.scrollTo(i)}
          className={
            i === selected
              ? 'size-2 shrink-0 rounded-full'
              : 'size-2 shrink-0 rounded-full bg-accent-subtle'
          }
        />
      ))}
    </div>
  );
}
