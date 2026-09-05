'use client';

/*
  **例そのものをクライアント側にする。** Form はクライアント側の部品なので、
  サーバ側から送信処理（関数）を渡せない。
*/
import { Button } from '../../button/button.tsx';
import { Form, FormActions } from '../form.tsx';

/**
 * 空。**欄が1つも無い。**
 *
 * 押すだけのフォーム（確認して送るだけ、など）がある。
 * **欄が無くても崩れないこと**を見せておく。
 */
export default function Empty() {
  return (
    <Form style={{ maxWidth: 360 }} onSubmit={(event) => event.preventDefault()}>
      <FormActions>
        <Button type="submit">この内容で送る</Button>
      </FormActions>
    </Form>
  );
}
