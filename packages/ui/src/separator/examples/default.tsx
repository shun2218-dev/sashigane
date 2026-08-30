import { Separator } from '../separator.tsx';

/**
 * 通常。**横向きが既定で、飾りとして扱われる。**
 *
 * 多くの区切りは見た目のためだけにあるので、読み上げには出さない。
 */
export default function Default() {
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <p>上の段落</p>
      <Separator />
      <p>下の段落</p>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', height: 32 }}>
        <span>左</span>
        <Separator orientation="vertical" />
        <span>右</span>
        <Separator orientation="vertical" />
        <span>その次</span>
      </div>
    </div>
  );
}
