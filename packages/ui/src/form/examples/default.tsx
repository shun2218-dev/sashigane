import { Button } from '../../button/button.tsx';
import { Field } from '../../field/field.tsx';
import { Input } from '../../input/input.tsx';
import { Form, FormActions } from '../form.tsx';

/**
 * 通常。**欄を束ねて、操作を並べる。**
 *
 * バリデーションは持たない。走らせるのは利用側である。
 */
export default function Default() {
  return (
    <Form style={{ maxWidth: 360 }} onSubmit={(event) => event.preventDefault()}>
      <Field id="form-name" label="お名前" required>
        <Input />
      </Field>
      <Field id="form-mail" label="メールアドレス" description="返信に使います">
        <Input type="email" />
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
