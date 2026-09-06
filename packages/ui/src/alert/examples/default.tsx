import { Alert } from '../alert.tsx';

/**
 * 通常。**その場に残る知らせ。**
 *
 * ランプは意味を運ばない。**文言だけで意味が通るようにする。**
 * 「エラーが発生しました」ではなく、何が起きて次に何ができるかを書く。
 */
export default function Default() {
  return (
    <div style={{ display: 'grid', gap: 16, maxWidth: 480 }}>
      <Alert title="下書きは保存されています">
        この画面を閉じても、書きかけの内容は残ります。
      </Alert>
      <Alert tone="danger" title="保存できませんでした">
        接続が切れています。もう一度お試しください。
      </Alert>
      <Alert tone="warning" title="この操作は取り消せません">
        削除した予定は元に戻せません。
      </Alert>
      <Alert tone="success" title="送信しました">
        受け取りの控えをメールで送りました。
      </Alert>
      <Alert tone="info" title="9月10日に停止します">
        当日の午前2時から4時のあいだ、この機能は使えません。
      </Alert>
    </div>
  );
}
