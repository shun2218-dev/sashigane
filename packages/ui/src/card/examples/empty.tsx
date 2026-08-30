import { Card } from '../card.tsx';

/**
 * 空。**中身が無くても面として成立すること。**
 *
 * 骨格の余白（`p-surface`）は密度で動くので（決定1-12）、
 * 空のときの高さは**画面幅によって変わる。** 潰れないことを見る。
 */
export default function Empty() {
  return <Card />;
}
