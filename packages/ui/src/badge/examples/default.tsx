import { Badge } from '../badge.tsx';

/**
 * 通常。**色は宣言から来る。**
 *
 * 中立は凹んだ面を宣言する。色付きは淡い塗りを使う。
 * どちらも背景と文字が対で決まっているので、**背景だけを塗る道は無い。**
 */
export default function Default() {
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <Badge>中立</Badge>
        <Badge tone="accent">強調</Badge>
        <Badge tone="danger">危険</Badge>
        <Badge tone="warning">注意</Badge>
        <Badge tone="success">成功</Badge>
        <Badge tone="info">情報</Badge>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <Badge size="sm">小さい方</Badge>
        <Badge size="sm" tone="success">
          表の行の脇に
        </Badge>
        <Badge>大きい方</Badge>
        <Badge tone="success">本文と並べて</Badge>
      </div>
    </div>
  );
}
