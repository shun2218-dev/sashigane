import { Spinner } from '../spinner.tsx';

/**
 * 空。**中身を持たない。**
 *
 * 子を受け取らないので、空の状態はこれ1つしかない。
 * 名前だけは必ず要る——**止まったときに見た目から進行が読み取れない**ため。
 */
export default function Empty() {
  return <Spinner aria-label="読み込み中" />;
}
