import { Field } from '../../field/field.tsx';
import { Select } from '../select.tsx';

/**
 * 空。**選択肢が1つも無い。**
 *
 * 読み込みの前や、絞り込んだ結果が空になる場面がある。
 * **開けないようにはしていない**——押せるのに何も起きないと、
 * 壊れているのか空なのか区別が付かない。開いて「無い」と伝える。
 */
export default function Empty() {
  return (
    <div style={{ display: 'grid', gap: 12, maxWidth: 360 }}>
      <Field id="select-empty" label="絞り込み">
        <Select options={[]} />
      </Field>
    </div>
  );
}
