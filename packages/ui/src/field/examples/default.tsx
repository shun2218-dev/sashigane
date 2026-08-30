import { Input } from '../../input/input.tsx';
import { Field } from '../field.tsx';

/**
 * 通常。**結びつけを利用側に書かせない。**
 *
 * 札と入力、説明と入力。どれも忘れると読み上げだけが黙る——
 * 見た目は正常なので、書き忘れても気づけない。
 *
 * 利用側が渡すのは `id` を1つだけである。
 */
export default function Default() {
  return (
    <div style={{ display: 'grid', gap: 16, maxWidth: 360 }}>
      <Field id="mail" label="メールアドレス">
        <Input type="email" placeholder="you@example.com" />
      </Field>
      <Field id="name" label="表示名" description="他の人に見える名前です">
        <Input placeholder="さしがね" />
      </Field>
    </div>
  );
}
