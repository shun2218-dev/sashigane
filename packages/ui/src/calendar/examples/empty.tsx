'use client';

/*
  **例そのものをクライアント側にする。** 何も選ばれていない状態を見せる。
*/
import { ja } from 'react-day-picker/locale';
import { Calendar } from '../calendar.tsx';

/**
 * 空。**何も選ばれていないとき。**
 *
 * 升目は残る。**今日だけが境界で分かる**——選ばれていないことと、
 * 暦が出ていないことは違う。
 */
export default function Empty() {
  return <Calendar mode="single" locale={ja} selected={undefined} />;
}
