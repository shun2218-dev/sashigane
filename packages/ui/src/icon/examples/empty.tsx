import { IconX } from '../icon.tsx';

/**
 * 空。**中身を持たない。**
 *
 * 絵柄そのものが中身なので、空の状態はこれ1つしかない。
 * 既定では読み上げから隠れている——**文字の隣で同じことを言っている**ためである。
 */
export default function Empty() {
  return <IconX />;
}
