import { Button } from '../button.tsx';

/**
 * 通常。**塗り方4種とランプ5本の組み合わせ。**
 *
 * 色は1つも決めていない。塗りの色も、その上に載る文字の色も、
 * hover でずらす先も、すべてトークンが持っている。
 */
export default function Default() {
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Button>solid</Button>
        <Button variant="subtle">subtle</Button>
        <Button variant="outline">outline</Button>
        <Button variant="ghost">ghost</Button>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Button tone="danger">danger</Button>
        <Button tone="warning">warning</Button>
        <Button tone="success">success</Button>
        <Button tone="info">info</Button>
      </div>
    </div>
  );
}
