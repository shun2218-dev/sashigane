import { Field } from '../../field/field.tsx';
import { PasswordInput } from '../password-input.tsx';

/**
 * 空。**何も入っていないときも、切り替えのボタンは出したままにする。**
 *
 * 入ってから現れる形にすると、**欄の幅が打ち始めた瞬間に変わる。**
 */
export default function Empty() {
  return (
    <div style={{ display: 'grid', gap: 12, maxWidth: 360 }}>
      <Field id="password-empty" label="パスワード" description="8文字以上">
        <PasswordInput placeholder="" autoComplete="new-password" />
      </Field>
    </div>
  );
}
