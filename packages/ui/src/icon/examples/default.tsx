import { IconPlus, IconX } from '../icon.tsx';

/**
 * 通常。**図案は lucide から来る。**
 *
 * 寸法は行の高さに合わせてある。文字やボタンと横に並べたときに揃う。
 * 色は継承する——置いた場所の前景に従う。
 */
export default function Default() {
  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
      <IconPlus />
      <IconX />
      <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
        <IconPlus />
        文字と並べる
      </span>
    </div>
  );
}
