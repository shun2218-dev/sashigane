import { Field } from '../../field/field.tsx';
import { PasswordInput } from '../password-input.tsx';

/**
 * 通常。**打った文字を確かめられる。**
 *
 * 末尾のボタンで見せる／隠すを切り替える。切り替えても**打っている場所は動かない**——
 * 器を差し替えず、同じ要素の `type` だけを入れ替えているためである。
 */
export default function Default() {
  return (
    <div style={{ display: 'grid', gap: 12, maxWidth: 360 }}>
      <Field id="password-default" label="パスワード">
        <PasswordInput autoComplete="current-password" />
      </Field>
    </div>
  );
}
