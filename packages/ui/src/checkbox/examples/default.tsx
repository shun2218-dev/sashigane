import { Field } from '../../field/field.tsx';
import { Checkbox } from '../checkbox.tsx';

/**
 * 通常。**ラベルは Field が付ける。**
 *
 * `layout="inline"` でラベルが右に来る。上に置くと、
 * ラベルがどの選択肢のものか目で辿れない。
 */
export default function Default() {
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <Field layout="inline" id="checkbox-terms" label="利用規約に同意する">
        <Checkbox />
      </Field>
      <Field
        layout="inline"
        id="checkbox-news"
        label="お通知を受け取る"
        description="いつでも止められます"
      >
        <Checkbox defaultChecked />
      </Field>
    </div>
  );
}
