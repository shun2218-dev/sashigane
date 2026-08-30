import { Button } from '../../button/button.tsx';
import { IconPlus, IconX } from '../icon.tsx';

/**
 * エッジケース。**名前を与えたときと、塗りの上に置いたとき。**
 *
 * 既定は読み上げから隠れる。名前を渡すと隠れなくなる——
 * **アイコンだけで意味を伝える場所**では、名前が要る。
 *
 * 色は継承するので、塗りの上でも枠の中でも書き直さずに読める。
 */
export default function Edge() {
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
        <IconX aria-label="閉じる" />
        <span>← 名前を渡すと読み上げに出ます</span>
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <Button>
          <IconPlus />
          追加する
        </Button>
        <Button iconOnly aria-label="閉じる">
          <IconX />
        </Button>
      </div>
    </div>
  );
}
