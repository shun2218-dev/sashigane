import { Alert } from '../alert.tsx';

/**
 * 空。**見出しだけのとき、本文だけのとき。**
 *
 * どちらも枠は残る。**枠ごと消えると、
 * 何かが失敗したのか、もともと無いのかが分からない。**
 */
export default function Empty() {
  return (
    <div style={{ display: 'grid', gap: 16, maxWidth: 480 }}>
      <Alert tone="info" title="まだ何も登録されていません" />
      <Alert>ここに書かれた内容は、あなたにだけ見えます。</Alert>
    </div>
  );
}
