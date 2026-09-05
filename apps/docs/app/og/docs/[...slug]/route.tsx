import { ImageResponse } from 'next/og';
import { notFound } from 'next/navigation';
import { pageImage, source } from '../../../../lib/source';
import { MARK_PATH, ROTATION, VIEW_BOX } from '../../../../lib/mark';
import { darkAccent, darkMuted, darkSurface, darkText } from '../../../../lib/brand';

/**
 * ページごとの絵。**題と説明はページから取る。**
 *
 * 手で書かない——ページを直したときに絵だけ古くなる。
 *
 * 最後の段は `image.png` なので落とす。**経路の組み立ては `pageImage` に1つだけ**
 * 置いてあり、こちらはその逆をたどるだけである。
 *
 * ## 自前で組んでいる
 *
 * fumadocs の既定の絵を使っていた時期があるが、**題の色がこちらの色ではなかった**——
 * 「sashigane」がピンクで出る。ブランドの絵なので、色は全部こちらから解く。
 *
 * ## 色は生成器から解く
 *
 * 1枚の絵に焼かれるので CSS 変数が届かない（`lib/brand.ts`）。
 * 明暗を選べないので**暗い方に寄せてある。**
 */
export const revalidate = false;

/**
 * **`opacity` を渡さないときは `style` ごと出さない。**
 * `style={{ opacity: undefined }}` を渡すと Satori が値を文字列として扱おうとして落ちる
 * ——`Cannot read properties of undefined (reading 'trim')` になる。**型では防げない。**
 */
const Mark = ({ size, color, opacity }: { size: number; color: string; opacity?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox={VIEW_BOX}
    fill={color}
    fillRule="evenodd"
    {...(opacity === undefined ? {} : { style: { opacity } })}
  >
    <path d={MARK_PATH} />
    <path d={MARK_PATH} transform={ROTATION} />
  </svg>
);

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string[] }> },
) {
  const { slug } = await params;
  const page = source.getPage(slug.slice(0, -1));
  if (!page) notFound();

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: darkSurface,
          padding: '64px 72px',
          position: 'relative',
        }}
      >
        {/*
          大きなマークを地に沈める。**題より前に出ない濃さにしてある。**

          **切らない。** 端からはみ出させていた時期があるが、
          残った部分がただの矩形に見えて、マークだと分からなかった。
        */}
        <div style={{ display: 'flex', position: 'absolute', right: 64, top: 132 }}>
          <Mark size={330} color={darkAccent} opacity={0.12} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Mark size={44} color={darkAccent} />
          <span style={{ color: darkMuted, fontSize: 30, fontWeight: 600 }}>sashigane</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ color: darkText, fontSize: 68, fontWeight: 700, lineHeight: 1.15 }}>
            {page.data.title}
          </div>
          {page.data.description ? (
            <div style={{ color: darkMuted, fontSize: 30, marginTop: 20, lineHeight: 1.5 }}>
              {page.data.description}
            </div>
          ) : null}
        </div>

        {/* 下の帯。宣言する塗りではなく、暗い地の上のアクセントである */}
        <div style={{ display: 'flex', height: 12, background: darkAccent, position: 'absolute', left: 0, right: 0, bottom: 0 }} />
      </div>
    ),
    { width: 1200, height: 630 },
  );
}

export function generateStaticParams() {
  return source.getPages().map((page) => ({ slug: pageImage(page).segments }));
}
