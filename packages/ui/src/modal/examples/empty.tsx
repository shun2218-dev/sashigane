'use client';

/*
  **例そのものをクライアント側にする。** Modal はクライアント側の部品なので、
  サーバ側から開け閉めの処理（関数）を渡せない。
*/
import { Button } from '../../button/button.tsx';
import { Modal } from '../modal.tsx';
import { useModal } from '../use-modal.ts';

/**
 * 空。**中身も操作も無い、見出しだけ。**
 *
 * 操作を置かない形はある（読むだけのダイアログ）。
 * そのときも**閉じる道は残る**——右上の印と `Escape` である。
 */
export default function Empty() {
  const modal = useModal();
  return (
    <div>
      <Button onClick={modal.show}>見出しだけのダイアログを開く</Button>
      <Modal open={modal.open} onClose={modal.hide} title="見出しだけ" style={{ maxWidth: 420 }}>
        {null}
      </Modal>
    </div>
  );
}
