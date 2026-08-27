import { useEffect, useRef, useState } from 'react';
// Vite の ?raw。HTML を文字列として読む。**素の HTML のまま置いておくことに意味がある**ので、
// JSX に書き換えない。React が要らないことを見せるページを React で書いたら証明にならない
import sampleHtml from './sample-page.html?raw';

type Theme = 'auto' | 'light' | 'dark';
type Density = 'auto' | 'compact' | 'default' | 'comfortable';
type Width = { label: string; px: number | null };

/** 幅を変えると密度（決定1-12）とブレークポイント（決定1-10）の挙動がその場で見える */
const WIDTHS: Width[] = [
  { label: 'デスクトップ', px: null },
  { label: 'タブレット 768', px: 768 },
  { label: 'モバイル 375', px: 375 },
];

/**
 * 生成した CSS を流し込んだサンプルページを iframe で出す。
 *
 * **iframe である理由。** 生成物は `:root` と `@media (prefers-color-scheme)` と
 * `[data-theme]` を書く。同じドキュメントに入れるとビルダー自身の見た目まで巻き込み、
 * 「生成物だけで成立したのか」が判別できなくなる。iframe なら中に入るのは
 * この CSS 1枚だけで、React もビルダーの style.css も届かない。
 *
 * **srcdoc は一度しか渡さない。** 色を変えるたびに srcdoc を作り直すと iframe が
 * 読み込み直され、スクロール位置が飛ぶ。読み込み後は中の `<style>` の中身だけを
 * 差し替える。ページの構造は不変で、変わるのは変数の値だけ ——
 * これは利用側でテーマを切り替えたときに起きることと同じである。
 */
export const SamplePage = ({ css }: { css: string }) => {
  const frame = useRef<HTMLIFrameElement>(null);
  // **回数を持つ。** 真偽値だと、iframe が読み込み直されたとき（HMR、中でのリロード）に
  // 値が変わらず effect が走らない。流し込みが消えた空のページが残る
  const [loads, setLoads] = useState(0);
  const [theme, setTheme] = useState<Theme>('auto');
  const [density, setDensity] = useState<Density>('auto');
  const [width, setWidth] = useState(0);
  const [brand, setBrand] = useState(false);

  useEffect(() => {
    const doc = frame.current?.contentDocument;
    if (!doc || loads === 0) return;
    const slot = doc.getElementById('sg-tokens');
    if (slot) slot.textContent = css;
  }, [css, loads]);

  useEffect(() => {
    const html = frame.current?.contentDocument?.documentElement;
    if (!html || loads === 0) return;
    // auto は属性を外す。**外した状態が既定**で、明色は @media が、密度は画面幅が決める
    if (theme === 'auto') html.removeAttribute('data-theme');
    else html.setAttribute('data-theme', theme);
    if (density === 'auto') html.removeAttribute('data-sg-density');
    else html.setAttribute('data-sg-density', density);
    // 書体の差し込み口（決定1-11）。**:root に差さないと届かない。**
    // 書体スタック側の var() は宣言された要素で置換されるため、部分木に差しても効かない。
    // 実測は docs/experiments/font-family.md
    // （ここでスタック側の変数名を書くと check:token-usage が落ちる。教訓の対象は名前であって
    //   文脈ではないので、説明では名前そのものを書かない）
    if (brand) html.style.setProperty('--sg-font-brand-display-latin', 'Georgia');
    else html.style.removeProperty('--sg-font-brand-display-latin');
  }, [theme, density, brand, loads]);

  const px = WIDTHS[width]!.px;

  return (
    <section>
      <h2>サンプルページ</h2>
      <p className="explain">
        下の枠の中が読み込んでいるのは、<strong>いま生成した CSS 1枚だけ</strong>です。
        React もフレームワークも入っていません。色は1つも生値で書いておらず、
        見えているものは全部 <code>var(--sg-*)</code> から来ています。
      </p>

      <div className="sample-controls">
        <label>
          テーマ
          <select value={theme} onChange={(e) => setTheme(e.target.value as Theme)}>
            <option value="auto">OS に従う</option>
            <option value="light">明色に固定</option>
            <option value="dark">暗色に固定</option>
          </select>
        </label>
        <label>
          密度
          <select value={density} onChange={(e) => setDensity(e.target.value as Density)}>
            <option value="auto">画面幅に従う</option>
            <option value="compact">compact</option>
            <option value="default">default</option>
            <option value="comfortable">comfortable</option>
          </select>
        </label>
        <label>
          画面幅
          <select value={width} onChange={(e) => setWidth(Number(e.target.value))}>
            {WIDTHS.map((w, i) => (
              <option key={w.label} value={i}>
                {w.label}
              </option>
            ))}
          </select>
        </label>
        <label className="check">
          <input type="checkbox" checked={brand} onChange={(e) => setBrand(e.target.checked)} />
          見出しに書体を差す
        </label>
      </div>

      <div className="sample-frame">
        <iframe
          ref={frame}
          title="生成したトークンで組んだサンプルページ"
          srcDoc={sampleHtml}
          onLoad={() => setLoads((n) => n + 1)}
          style={px === null ? undefined : { width: px, maxWidth: '100%' }}
        />
      </div>

      <p className="note">
        画面幅を狭めると骨格の余白が1段詰まります（決定1-12）。密度を選べば固定できます。
        テーマを OS に従わせているとき、切り替えているのは
        <code>@media (prefers-color-scheme)</code> の側です。
      </p>
    </section>
  );
};
