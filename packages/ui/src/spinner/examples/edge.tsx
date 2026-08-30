import { Spinner } from '../spinner.tsx';

/**
 * エッジケース。**前景の色が変わる場所に置く。**
 *
 * 輪は文字の色をそのまま使うので、淡い塗りの上でも凹んだ面の上でも
 * 書き直さずに読める。
 *
 * 動きを減らす設定では**止まる。** 止まった輪からは進行が読み取れないので、
 * 名前を型で必須にしてある。
 */
export default function Edge() {
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div data-sg-fill="accent" style={{ padding: 16, borderRadius: 4 }}>
        <Spinner aria-label="塗りの上" />
      </div>
      <div data-sg-surface="inset" style={{ padding: 16, borderRadius: 4 }}>
        <Spinner aria-label="凹んだ面の上" />
      </div>
    </div>
  );
}
