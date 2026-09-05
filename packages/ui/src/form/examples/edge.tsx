'use client';

/*
  **例そのものをクライアント側にする。** Form はクライアント側の部品なので、
  サーバ側から送信処理（関数）を渡せない。
*/
import { Button } from '../../button/button.tsx';
import { Field } from '../../field/field.tsx';
import { Input } from '../../input/input.tsx';
import { Form, FormActions } from '../form.tsx';

/**
 * エッジケース。**フォーム全体の誤りと、欄の誤りが同時にある。**
 *
 * 全体の誤りは**指す先が無い**——どの欄が悪いとも言えないので、
 * `aria-describedby` では結べない。その場で読み上げに届く形で出す。
 */
export default function Edge() {
  return (
    <Form
      style={{ maxWidth: 360 }}
      error="送信できませんでした。時間をおいて試してください"
      onSubmit={(event) => event.preventDefault()}
    >
      <Field id="form-edge-name" label="お名前" error="入力してください" required>
        <Input />
      </Field>
      <Field id="form-edge-mail" label="メールアドレス" valid>
        <Input type="email" defaultValue="you@example.com" />
      </Field>
      <FormActions>
        <Button type="submit">送信する</Button>
        <Button type="button" variant="ghost">
          取り消す
        </Button>
      </FormActions>
    </Form>
  );
}
