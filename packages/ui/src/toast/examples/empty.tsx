'use client';

/*
  **例そのものをクライアント側にする。** Toaster はクライアント側の部品である。
*/
import { Toaster } from '../toast.tsx';

/**
 * 空。**1つも出ていない。**
 *
 * このとき何も見えないが、**読み上げの領域は描かれている。**
 * 後から領域ごと現れると、読み上げは中身の追加に気づかない。
 */
export default function Empty() {
  return <Toaster />;
}
