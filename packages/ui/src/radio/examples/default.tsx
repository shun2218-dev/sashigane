import { Field } from '../../field/field.tsx';
import { Radio } from '../radio.tsx';
import { RadioGroup } from '../radio-group.tsx';

/**
 * 通常。**群れの札は RadioGroup が付ける。**
 *
 * 1つずつの札だけでは、**何についての選択なのかが読み上げに出ない。**
 * `name` は利用側が渡す——群れから配るには文脈が要り、
 * この部品がクライアント側になる。
 */
export default function Default() {
  return (
    <RadioGroup id="radio-plan" label="プラン" description="あとから変えられます">
      <Field layout="inline" id="radio-plan-a" label="ふつう">
        <Radio name="radio-plan-choice" value="a" defaultChecked />
      </Field>
      <Field layout="inline" id="radio-plan-b" label="大きい">
        <Radio name="radio-plan-choice" value="b" />
      </Field>
    </RadioGroup>
  );
}
