import { Card } from '../card.tsx';

/**
 * 空。**中身が無くても面として成立すること。**
 *
 * 骨格の余白は画面幅で動くので、空のときの高さも画面幅によって変わる。潰れないことを見る。
 */
export default function Empty() {
  return <Card />;
}
