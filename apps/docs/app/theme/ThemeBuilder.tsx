'use client';

import {
  contrastBetween,
  describePrimaryInput,
  generatePalette,
  hexToOklch,
  statusNames,
  steps,
  surfaceRolesFor,
  toCss,
  toTokensCss,
  toHex,
  type Oklch,
  type Palette,
  type Ramp,
} from '@sashigane/tokens';
import { useMemo, useState } from 'react';
import tokens from '@sashigane/tokens/tokens.json' with { type: 'json' };

const g = tokens.color.guarantees;

const Swatches = ({ label, ramp }: { label: string; ramp: Ramp }) => (
  <div className="ramp">
    <div className="ramp-label">
      {label}
      <span className="hue">{ramp.hue.toFixed(0)}°</span>
    </div>
    <div className="ramp-strip">
      {steps.map((s) => {
        const c = ramp.byStep[s]!;
        return (
          <div
            key={s}
            className="swatch"
            style={{ background: toCss(c) }}
            title={`${label} ${s}\n${toHex(c)}\nL=${c.L.toFixed(3)} C=${c.C.toFixed(3)} H=${c.H.toFixed(1)}`}
          >
            <span style={{ color: c.L > 0.6 ? '#000' : '#fff' }}>{s}</span>
          </div>
        );
      })}
    </div>
  </div>
);

/**
 * **選んだ色がパレットのどこに入ったか**を示す。
 *
 * 決定5-1 は「受け継ぐのは色相のみ。L と C は規則が決める」と決めている。
 * そのため `accent` として使われる段は、選んだ色そのものとは限らない。
 *
 * ここを見せていなかったとき、**「選んだ色が勝手に変わる」と読まれた。**
 * 実際には色はパレットに入っており、変わっているのは
 * 「どの段を accent という役割に割り当てるか」である。**両者を並べて見せる。**
 */
const InputPlacement = ({
  palette,
  input,
  hex,
}: { palette: Palette; input: Oklch; hex: string }) => {
  // 判定はトークン側が持つ。ここで最近傍を計算し直すと、警告が使う判定と二重になる
  const { nearestStep, nearest: near, delta, modes } = describePrimaryInput(palette, input);
  const accentSteps = new Set(modes.map((m) => m.textStep));
  // 表示上の呼び方はこちらが持つ。トークン側は 'light' / 'dark' しか知らない
  const label = (mode: 'light' | 'dark') => (mode === 'light' ? '明色' : '暗色');

  return (
    <section>
      <h2>選んだ色はどこに入ったか</h2>
      <div className="placement">
        <span className="chip" style={{ background: toCss(input) }} />
        <code>{hex}</code>
        <span className="arrow">→</span>
        <span className="chip" style={{ background: toCss(near) }} />
        <code>
          primary 段{nearestStep} {toHex(near)}
        </code>
        <span className="delta">
          ΔL {delta.L.toFixed(3)} / ΔC {delta.C.toFixed(3)} / ΔH {delta.H.toFixed(1)}°
        </span>
      </div>

      <div className="ramp">
        <div className="ramp-label">primary</div>
        <div className="ramp-strip">
          {steps.map((st) => {
            const c = palette.primary.byStep[st]!;
            return (
              <div
                key={st}
                className={`swatch${st === nearestStep ? ' picked' : ''}${accentSteps.has(st) ? ' accent' : ''}`}
                style={{ background: toCss(c) }}
                title={`${st}\n${toHex(c)}`}
              >
                <span style={{ color: c.L > 0.6 ? '#000' : '#fff' }}>{st}</span>
              </div>
            );
          })}
        </div>
      </div>
      <p className="note">
        枠が二重の段が<strong>選んだ色に最も近い段</strong>、下線の段が{' '}
        <code>--sg-color-accent</code> が使う段です（
        {modes.map((m) => `${label(m.mode)}は段${m.textStep}`).join('、')}）。
      </p>

      <table className="contrast">
        <thead>
          <tr>
            <th>選んだ色を…</th>
            <th>比</th>
            <th>文字として</th>
            <th>マークとして</th>
          </tr>
        </thead>
        <tbody>
          {modes.map((m) => (
            <tr key={m.mode}>
              <td>{label(m.mode)}の面に置くと</td>
              <td>{m.ratio.toFixed(2)}:1</td>
              <td className={m.asText ? 'ok' : 'ng'}>
                {m.asText ? `使える（${m.textMin}:1 以上）` : `使えない（${m.textMin}:1 に届かない）`}
              </td>
              <td className={m.asMark ? 'ok' : 'ng'}>
                {m.asMark ? `使える（${m.markMin}:1 以上）` : `使えない（${m.markMin}:1 に届かない）`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="explain">
        <strong>色相は保たれています。</strong>変わるのは明度と彩度で、
        これは規則が解いています（決定5-1）。
        <code>--sg-color-accent</code> は<strong>文字の役割</strong>なので、
        選んだ色そのものではなく 4.5:1 を満たす段を使います。
        {modes.some((m) => !m.asText) && (
          <>
            {' '}
            上の表で「使えない」となっている側では、
            <strong>選んだ色を文字にすると読めません。</strong>
          </>
        )}
      </p>
    </section>
  );
};

/** 保証している組み合わせが実際に何対1かを出す。表示できないものは表示しない */
const GuaranteeTable = ({ palette }: { palette: Palette }) => {
  const ramps: [string, Ramp][] = [
    ['primary', palette.primary],
    ...statusNames.map((n) => [n, palette.status[n]] as [string, Ramp]),
  ];
  return (
    <table className="contrast">
      <thead>
        <tr>
          <th>組み合わせ</th>
          <th>目標</th>
          {ramps.map(([n]) => (
            <th key={n}>{n}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {(['light', 'dark'] as const).flatMap((side) => {
          const surfaceStep = side === 'light' ? g.lightSurfaceStep : g.darkSurfaceStep;
          const bg = palette.neutral.byStep[surfaceStep]!;
          return g[side].map((req) => (
            <tr key={`${side}-${req.step}`}>
              <td>
                {side === 'light' ? '明色' : '暗色'}の面({surfaceStep}) に 段{req.step}
              </td>
              <td>{req.min}:1</td>
              {ramps.map(([n, r]) => {
                const ratio = contrastBetween(r.byStep[req.step]!, bg);
                return (
                  <td key={n} className={ratio >= req.min ? 'ok' : 'ng'}>
                    {ratio.toFixed(2)}
                  </td>
                );
              })}
            </tr>
          ));
        })}
      </tbody>
    </table>
  );
};

/**
 * 面の上に一式を並べる。**面ごとに参照する段が変わる**（決定5-12）ので、
 * 段は手で決めず `surfaceRolesFor` から取る。
 */
const SurfaceSample = ({
  palette,
  mode,
  depth,
  title,
}: {
  palette: Palette;
  mode: 'light' | 'dark';
  depth: number;
  title: string;
}) => {
  const roles = surfaceRolesFor(palette, mode)[depth]!;
  const n = palette.neutral.byStep;
  const seriesSteps = roles.series ?? palette.categoricalSteps[mode];
  const onFill = mode === 'light' ? n[50]! : n[950]!;

  return (
    <>
      <div className="sample-label" style={{ color: toCss(n[roles.text.muted]!) }}>
        {title}
        <span>
          文字 段{roles.colorText} / マーク 段{roles.colorMark}
        </span>
      </div>
      <strong style={{ color: toCss(n[roles.text.default]!) }}>カードの見出し</strong>
      <p style={{ color: toCss(n[roles.text.muted]!) }}>
        補助的な説明文です。中間色が primary の色相で着色されているため、
        アクセント色と並べても浮かないことを確かめます。
      </p>
      <div className="preview-row">
        <button
          type="button"
          style={{
            background: toCss(palette.primary.byStep[roles.colorText]!),
            color: toCss(onFill),
          }}
        >
          主ボタン
        </button>
        {statusNames.map((st) => (
          <span
            key={st}
            className="badge"
            style={{
              color: toCss(palette.status[st].byStep[roles.colorText]!),
              borderColor: toCss(palette.status[st].byStep[roles.colorMark]!),
            }}
          >
            {st}
          </span>
        ))}
      </div>
      <div className="preview-row">
        {palette.categorical.map((r, i) => (
          <span key={r.hue} className="series" style={{ color: toCss(n[roles.text.muted]!) }}>
            {/* 系列ごとに段が違う。色相だけ変えると二色覚で潰れるため（決定5-8） */}
            <i style={{ background: toCss(r.byStep[seriesSteps[i]!]!) }} />
            系列{i + 1}
          </span>
        ))}
      </div>
    </>
  );
};

/**
 * 生成した色が実際に使えるかを見るための、最小限の画面。
 *
 * **ページの地の上とカードの上の両方に同じ一式を並べる。**
 * 面が変われば役割が指す段も変わる（決定5-12）ので、片方だけ見せると
 * 「カードの外に置いたらどうなるのか」が分からない。
 * 以前はカードの上だけを描き、しかも**ページ用の段を使っていた**ため、
 * バッジの文字がカードに対して 3.82:1 と、保証している 4.5:1 を割っていた。
 */
const Preview = ({ palette, mode }: { palette: Palette; mode: 'light' | 'dark' }) => {
  const n = palette.neutral.byStep;
  const surfaces = palette.neutral.byStep;
  const roles = surfaceRolesFor(palette, mode);
  const page = surfaces[roles[0]!.surface]!;
  const card = surfaces[roles[1]!.surface]!;
  return (
    <div className="preview" style={{ background: toCss(page) }}>
      <SurfaceSample palette={palette} mode={mode} depth={0} title="ページの地の上" />
      <div
        className="preview-card"
        style={{ background: toCss(card), borderColor: toCss(n[roles[1]!.border.default]!) }}
      >
        <SurfaceSample palette={palette} mode={mode} depth={1} title="カードの上" />
      </div>
    </div>
  );
};

export const ThemeBuilder = () => {
  const [hex, setHex] = useState('#3b82f6');
  const palette = useMemo(() => generatePalette(hexToOklch(hex)), [hex]);
  const css = useMemo(() => toTokensCss(palette), [palette]);
  /** 独立したサンプルページへ、選んだ色をそのまま渡す */
  const sampleHref = `/sample?primary=${encodeURIComponent(hex)}`;
  const [copied, setCopied] = useState(false);

  return (
    <main>
      <header>
        <h1>sashigane テーマビルダー</h1>
        <p>
          primary を1色選ぶと、パレット全体が規則から生成されます。
          コントラストは全色相で構造的に保証されています。
        </p>
        <label className="picker">
          <input type="color" value={hex} onChange={(e) => setHex(e.target.value)} />
          <code>{hex}</code>
        </label>
      </header>

      <InputPlacement palette={palette} input={hexToOklch(hex)} hex={hex} />

      {palette.warnings.length > 0 && (
        <section>
          <h2>警告</h2>
          <ul className="warnings">
            {palette.warnings.map((w) => (
              <li key={w.code + w.message}>
                <code>{w.code}</code> {w.message}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2>見た目</h2>
        <div className="previews">
          <Preview palette={palette} mode="light" />
          <Preview palette={palette} mode="dark" />
        </div>
      </section>

      {/*
        **サンプルページは埋め込まない。** 独立した URL を開く（決定6-4 の改訂）。
        生成物は `:root` と `@media (prefers-color-scheme)` と `[data-theme]` を書くので、
        同じドキュメントに入れるとこのページの見た目まで巻き込む。
        以前は iframe で隔離していたが、**別のページにすれば隔離そのものが要らない。**
      */}
      <p>
        <a className="sample-link" href={sampleHref} target="_blank" rel="noreferrer">
          このテーマでサンプルページを開く →
        </a>
      </p>

      <section>
        <h2>パレット</h2>
        <Swatches label="neutral" ramp={palette.neutral} />
        <Swatches label="primary" ramp={palette.primary} />
        {statusNames.map((n) => (
          <Swatches key={n} label={n} ramp={palette.status[n]} />
        ))}
        {palette.categorical.map((r, i) => (
          <Swatches key={r.hue} label={`series-${i + 1}`} ramp={r} />
        ))}
      </section>

      <section>
        <h2>コントラスト</h2>
        <GuaranteeTable palette={palette} />
        <p className="note">
          解いた明度: アンカー {palette.anchorLightness.toFixed(4)} / 下端{' '}
          {palette.bottomLightness.toFixed(4)}
        </p>
      </section>

      <section>
        <h2>CSS</h2>
        <button
          type="button"
          onClick={() => {
            void navigator.clipboard.writeText(css).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            });
          }}
        >
          {copied ? 'コピーしました' : 'コピー'}
        </button>
        <pre>{css}</pre>
      </section>
    </main>
  );
};
