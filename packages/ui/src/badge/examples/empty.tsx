import { Badge } from '../badge.tsx';

/**
 * 空。**中身が無くても枠は潰れない。**
 *
 * 左右の余白が残るので、点として見える。
 * 何も無いバッジを出す意味は薄いが、**組み立て中に文字が届かないことはある。**
 */
export default function Empty() {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <Badge />
      <Badge tone="danger" />
    </div>
  );
}
