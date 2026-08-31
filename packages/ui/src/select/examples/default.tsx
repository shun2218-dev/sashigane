import { Field } from '../../field/field.tsx';
import { Select } from '../select.tsx';

const plans = [
  { value: 'small', label: 'ふつう' },
  { value: 'large', label: '大きい' },
  { value: 'huge', label: 'とても大きい' },
];

/**
 * 通常。**素の `select` ではない。**
 *
 * 一覧の見た目を揃えるために自前で描いている。
 * 値は隠した素の `select` が持つので、フォームにはそのまま載る。
 */
export default function Default() {
  return (
    <div style={{ display: 'grid', gap: 12, maxWidth: 360 }}>
      <Field id="select-plan" label="プラン" description="あとから変えられます">
        <Select name="plan" options={plans} />
      </Field>
    </div>
  );
}
