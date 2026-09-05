import { Card } from '../../card/card.tsx';
import {
  Carousel,
  CarouselMarkers,
  CarouselNext,
  CarouselPrevious,
  CarouselSlide,
  CarouselSlides,
} from '../carousel.tsx';

/**
 * 通常。**1枚ずつ送る。**
 *
 * 前後のボタンは端で押せなくなる。印は押すとそこへ飛ぶ。
 * **掴んで引く操作も効く**——送りの仕組みは Embla が持っている。
 */
export default function Default() {
  return (
    <Carousel label="おすすめ" style={{ maxWidth: 420 }}>
      <CarouselSlides>
        {['一', '二', '三', '四'].map((n) => (
          <CarouselSlide key={n}>
            <Card>{n}枚目の中身</Card>
          </CarouselSlide>
        ))}
      </CarouselSlides>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <CarouselPrevious />
        <CarouselMarkers />
        <CarouselNext />
      </div>
    </Carousel>
  );
}
