import { ImageResponse } from 'next/og';
import { MARK_PATH_PLAIN, ROTATION, VIEW_BOX } from '../lib/mark';
import { brandFill, onBrandFill } from '../lib/brand';

/**
 * ホーム画面に置かれる絵。**角丸も余白も端末が付ける**ので、地を塗って中央に置くだけ。
 *
 * **刻みは落とす。** この大きさでも端末が縮めて出すことがあり、favicon と同じ理由が当たる。
 *
 * 塗りとその上の色は、宣言する塗りの組（決定6-9）をそのまま使う。
 */
export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: brandFill,
        }}
      >
        <svg width="124" height="124" viewBox={VIEW_BOX} fill={onBrandFill} fillRule="evenodd">
          <path d={MARK_PATH_PLAIN} />
          <path d={MARK_PATH_PLAIN} transform={ROTATION} />
        </svg>
      </div>
    ),
    size,
  );
}
