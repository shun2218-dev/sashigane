import { Field } from '../../field/field.tsx';
import { Select } from '../select.tsx';

const many = [
  { value: 'a', label: 'あんず' },
  { value: 'b', label: 'いちご' },
  { value: 'c', label: 'うめ', disabled: true },
  { value: 'd', label: 'えのき' },
  { value: 'e', label: 'おれんじ' },
];

/**
 * エッジケース。**押せない選択肢・押せない本体・誤り・とても長いラベル。**
 *
 * 押せない選択肢は矢印キーで飛ばされる。**止まれてしまうと、
 * 選べないものを選ぼうとして何も起きない。**
 */
export default function Edge() {
  return (
    <div style={{ display: 'grid', gap: 12, maxWidth: 360 }}>
      <Field id="select-many" label="果物" description="うめは選べません">
        <Select options={many} defaultValue="b" />
      </Field>
      <Field id="select-off" label="押せない">
        <Select options={many} disabled />
      </Field>
      <Field id="select-bad" label="プラン" error="選んでください" required>
        <Select options={many} />
      </Field>
      <Field id="select-long" label="とても長いラベル">
        <Select
          options={[
            {
              value: 'x',
              label: '折り返さずに収まりきらないほど長い選択肢のラベルがここに入る場合',
            },
          ]}
          defaultValue="x"
        />
      </Field>
    </div>
  );
}
