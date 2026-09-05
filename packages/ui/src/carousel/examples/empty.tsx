import { Carousel, CarouselMarkers, CarouselSlides } from '../carousel.tsx';

/**
 * 空。**1枚も無いとき。**
 *
 * 印は出ない——**数はスライドから来る**ので、無ければ0個になる。
 * 枠だけが残り、潰れない。
 */
export default function Empty() {
  return (
    <Carousel label="まだ何も無いもの" style={{ maxWidth: 420 }}>
      <CarouselSlides />
      <CarouselMarkers />
    </Carousel>
  );
}
