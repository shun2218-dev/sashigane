'use client';

/*
  **例そのものをクライアント側にする。** 出したり閉じたりを見せるのに状態が要る。
*/
import { useState } from 'react';
import { Alert } from '../alert.tsx';
import { Button } from '../../button/button.tsx';

/**
 * エッジケース。**閉じられるもの、長い文言、後から出すもの。**
 *
 * 閉じる釦は `onDismiss` を渡したときだけ出る。
 * **渡さなければ閉じられない**——消してはいけない知らせがあるため。
 *
 * 後から出すものには `live` を渡す。**その場に最初からあるものには渡さない**——
 * 文書の順に読まれるので、領域にすると二重になる。
 */
export default function Edge() {
  const [shown, setShown] = useState(false);
  const [kept, setKept] = useState(true);

  return (
    <div style={{ display: 'grid', gap: 16, maxWidth: 480 }}>
      {kept ? (
        <Alert tone="info" title="閉じられる知らせ" onDismiss={() => setKept(false)}>
          閉じる釦は、閉じたときの処理を渡したときだけ出ます。
        </Alert>
      ) : (
        <Button variant="outline" onClick={() => setKept(true)}>
          もう一度出す
        </Button>
      )}

      <Alert tone="warning" title="長い文言でも折り返す">
        住所の変更は、次の請求が確定するまで反映されません。すでに確定している請求は
        古い住所のまま送られます。急ぎのときは、請求の担当へ直接お問い合わせください。
      </Alert>

      <Button variant="outline" onClick={() => setShown((v) => !v)}>
        {shown ? '取り消しの知らせを消す' : '取り消しの知らせを出す'}
      </Button>
      {shown ? (
        <Alert tone="danger" title="送信に失敗しました" live>
          宛先のうち3件が見つかりませんでした。宛先を確かめてください。
        </Alert>
      ) : null}
    </div>
  );
}
