import { Button } from '../button.tsx';

/**
 * **読み込み中。**
 *
 * 輪を出し、押せなくする。**沈めない**——
 * 無効は「できない」で、読み込み中は「いま起きている」である。
 * 同じ見た目にすると区別が付かない。
 *
 * 文字はそのまま残る。輪だけにすると、何を待っているのか分からなくなる。
 * **アイコンだけのボタンでは輪が置き換える**——並べると枠が横に伸びてしまう。
 *
 * 下の列に無効を並べてある。**沈み方が違う**ことが見比べられる。
 */
const path = 'M4 4l16 16M20 4l-16 16';

const Close = () => (
  <svg className="size-6" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d={path} stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export default function Loading() {
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <Button loading>送信中</Button>
        <Button loading variant="subtle">
          送信中
        </Button>
        <Button loading variant="outline">
          送信中
        </Button>
        <Button loading iconOnly aria-label="送信中">
          <Close />
        </Button>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <Button disabled>押せない</Button>
        <Button loading>いま起きている</Button>
        <span>← 沈むのは「できない」ときだけです</span>
      </div>
    </div>
  );
}
