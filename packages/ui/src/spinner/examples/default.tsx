import { Spinner } from '../spinner.tsx';

/**
 * 通常。**回転はトークン層が持っている。**
 *
 * 輪の色は文字の色をそのまま使う。置いた場所の前景に従うので、
 * 面が変わっても色を書き直す必要が無い。
 */
export default function Default() {
  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
      <Spinner aria-label="読み込み中" />
      <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
        <Spinner aria-hidden="true" />
        読み込み中
      </span>
    </div>
  );
}
