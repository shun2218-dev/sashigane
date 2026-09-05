import { Card } from '../../card/card.tsx';
import {
  Carousel,
  CarouselMarkers,
  CarouselNext,
  CarouselPlayPause,
  CarouselPrevious,
  CarouselSlide,
  CarouselSlides,
} from '../carousel.tsx';

/**
 * エッジケース。**1枚だけのときと、端で折り返すとき。**
 *
 * 1枚しか無ければ前も次も押せない。**送る先が無いのに押せるのは嘘である。**
 *
 * 折り返す形は既定ではない。**「最後まで来た」が分からなくなる**ので、
 * 見せ物のときだけ入れる。
 *
 * 自動で送る形には**止める器が必須**である。置かないと落ちる——
 * 自動で動くものには止める手段が要る。
 * 動きを減らす設定のときは**止まった状態で始まる。**
 */
export default function Edge() {
  return (
    <div style={{ display: 'grid', gap: 24, maxWidth: 420 }}>
      <Carousel label="1枚だけのもの">
        <CarouselSlides>
          <CarouselSlide>
            <Card>これだけ</Card>
          </CarouselSlide>
        </CarouselSlides>
        <div style={{ display: 'flex', gap: 8 }}>
          <CarouselPrevious />
          <CarouselNext />
        </div>
      </Carousel>

      <Carousel label="自動で送るもの" loop autoplay>
        <CarouselSlides>
          {['一', '二', '三'].map((n) => (
            <CarouselSlide key={n}>
              <Card>{n}枚目</Card>
            </CarouselSlide>
          ))}
        </CarouselSlides>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <CarouselPlayPause />
          <CarouselMarkers />
          <CarouselNext />
        </div>
      </Carousel>

      <Carousel label="折り返すもの" loop>
        <CarouselSlides>
          {['一', '二', '三'].map((n) => (
            <CarouselSlide key={n}>
              <Card>{n}枚目</Card>
            </CarouselSlide>
          ))}
        </CarouselSlides>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <CarouselPrevious />
          <CarouselMarkers />
          <CarouselNext />
        </div>
      </Carousel>
    </div>
  );
}
