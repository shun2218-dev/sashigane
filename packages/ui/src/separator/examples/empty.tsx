import { Separator } from '../separator.tsx';

/**
 * 空。**中身を持たない。**
 *
 * 子を受け取らないので、空の状態はこれ1つしかない。
 * 線そのものが中身である。
 */
export default function Empty() {
  return <Separator />;
}
