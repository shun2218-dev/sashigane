import { Button } from '../button.tsx';

/**
 * 空。**ラベルが無くても枠として成立すること。**
 *
 * アイコンだけのボタンはここに来る。**押せるものが見えていること**を見る——
 * 塗りは面から独立しているので、中身が無くても背景と境界は残る。
 */
export default function Empty() {
  return <Button aria-label="ラベルの無いボタン" />;
}
