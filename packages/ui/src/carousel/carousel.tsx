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
import Autoplay from 'embla-carousel-autoplay';
import useEmblaCarousel from 'embla-carousel-react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type HTMLAttributes,
  type ReactNode,
  type Ref,
} from 'react';
import { Button } from '../button/button.tsx';
import { IconChevronLeft, IconChevronRight, IconPause, IconPlay } from '../icon/icon.tsx';

type EmblaApi = ReturnType<typeof useEmblaCarousel>[1];

/**
 * 自動で送る間隔の既定。
 *
 * **選んだ値である。導いていない。** 滞在の段の `dwell-2` と同じ数だが、
 * そこから解いているわけではない——**偶然そろっているだけ**である。
 *
 * CSS から読む道は取らない。読んでミリ秒に直す経路は、
 * **`4000ms` が `4s` として返るのを読み違えて**一度壊したので外してある。
 *
 * 段に合わせたい利用側は `autoplay={{ delay }}` で渡す。
 * **こちらが持つのは「渡されなかったときの1つ」だけ**である。
 */
export const AUTOPLAY_DELAY = 4000;

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
  /** 自動で送る設定になっているか */
  autoplay: boolean;
  /** いま自動で送っているか。**止めているあいだは偽** */
  playing: boolean;
  toggle: () => void;
  /**
   * 停止・再生の器が置かれたことを申告する。
   *
   * **置かれていないと落とす**（WCAG 2.2.2）。自動で動くものには止める手段が要る。
   */
  registerPlayPause: () => () => void;
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
   * 自動で送る。**既定は送らない。**
   *
   * **`CarouselPlayPause` を一緒に置かないと落ちる**（WCAG 2.2.2）——
   * 自動で動くものには、止める手段が無ければならない。
   *
   * 動きを減らす設定のときは**止まった状態で始まる。** 再生は利用者が選ぶ。
   */
  autoplay?: boolean | { delay?: number };
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
export function Carousel({
  autoplay = false,
  loop = false,
  label,
  className,
  children,
  ...props
}: CarouselProps) {
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

  /*
    **自動で送るのは頼んだときだけ。** 動きを減らす設定のときは、
    止まった状態で始める——**再生は利用者が選ぶ。**
    黙って動かさないが、動かす手段は残す。
  */
  const delay = typeof autoplay === 'object' ? (autoplay.delay ?? AUTOPLAY_DELAY) : AUTOPLAY_DELAY;
  const plugins = useMemo(
    () =>
      autoplay
        ? [
            Autoplay({
              delay,
              playOnInit: !reduce,
              // **触ったら止める。** 読んでいる最中に送られるのは邪魔である
              stopOnInteraction: true,
              stopOnMouseEnter: true,
              stopOnFocusIn: true,
            }),
          ]
        : [],
    [autoplay, delay, reduce],
  );

  const [viewportRef, api] = useEmblaCarousel({ loop, duration: reduce ? 0 : 25 }, plugins);
  const [playing, setPlaying] = useState(false);
  const hasPlayPause = useRef(false);

  const registerPlayPause = useCallback(() => {
    hasPlayPause.current = true;
    return () => {
      hasPlayPause.current = false;
    };
  }, []);

  /*
    **止める手段が無ければ落とす**（WCAG 2.2.2）。

    文書に書くだけでは守られない（教訓3）。**黙って動き続けるほうが害が大きい**——
    読んでいる最中に勝手に送られ、止める方法が無い。
  */
  useEffect(() => {
    if (!autoplay) return;
    if (hasPlayPause.current) return;
    throw new Error(
      'autoplay を使うときは CarouselPlayPause を一緒に置いてください（止める手段が要ります）',
    );
  }, [autoplay]);

  const toggle = useCallback(() => {
    const plugin = api?.plugins()?.autoplay;
    if (!plugin) return;
    if (plugin.isPlaying()) plugin.stop();
    else plugin.play();
    /*
      **押した結果をその場で読む。** 催しに任せていた時期があるが、
      **札が変わらなかった**——押しても「止める」のままだった。
      催しは触って止まったときのために残してある。
    */
    setPlaying(plugin.isPlaying());
  }, [api]);
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
    const syncPlaying = () => setPlaying(api.plugins()?.autoplay?.isPlaying() ?? false);
    const all = () => {
      sync();
      syncPlaying();
    };
    all();
    api
      .on('select', all)
      .on('reInit', all)
      .on('autoplay:play', syncPlaying)
      .on('autoplay:stop', syncPlaying);
    return () => {
      api
        .off('select', all)
        .off('reInit', all)
        .off('autoplay:play', syncPlaying)
        .off('autoplay:stop', syncPlaying);
    };
  }, [api]);

  const classes = 'relative flex flex-col gap-3';
  return (
    <Ctx.Provider
      value={{
        viewportRef,
        api,
        selected,
        count,
        canPrev,
        canNext,
        autoplay: Boolean(autoplay),
        playing,
        toggle,
        registerPlayPause,
      }}
    >
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

/**
 * 自動で送るのを止める／再生する。**`autoplay` を使うときは必須である。**
 *
 * WCAG 2.2.2 は、自動で動くものに**止める手段**を求めている。
 * 置かれていないと `Carousel` が落ちる——**黙って動き続けるほうが害が大きい。**
 *
 * 動きを減らす設定のときは**止まった状態で始まる。** ここから再生できる。
 */
export function CarouselPlayPause({
  playLabel = '自動で送る',
  pauseLabel = '自動で送るのを止める',
  className,
}: {
  playLabel?: string;
  pauseLabel?: string;
  className?: string;
}) {
  const { autoplay, playing, toggle, registerPlayPause } = useCarousel();
  useEffect(() => registerPlayPause(), [registerPlayPause]);
  // **自動で送らない枠では何も出さない。** 押しても何も起きないものを置かない
  if (!autoplay) return null;
  return (
    <Button
      data-sg-component="carousel-play-pause"
      variant="outline"
      iconOnly
      aria-label={playing ? pauseLabel : playLabel}
      onClick={toggle}
      className={className}
    >
      {playing ? <IconPause /> : <IconPlay />}
    </Button>
  );
}
