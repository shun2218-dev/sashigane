import {
  contrastBetween,
  generatePalette,
  hexToOklch,
  statusNames,
  steps,
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
const InputPlacement = ({ palette, input }: { palette: Palette; input: Oklch }) => {
  const nearest = steps.reduce((best, s) =>
    Math.abs(palette.primary.byStep[s]!.L - input.L) <
    Math.abs(palette.primary.byStep[best]!.L - input.L)
      ? s
      : best,
  );
  const near = palette.primary.byStep[nearest]!;
  /*
   * **モードごとに別々に判定する。** 片方で足りていても、もう片方で足りないことがある。
   * 実際、明るい黄色は暗色の面では 13:1 を超えるが、明色の面では 1.25:1 しか無い。
   * ひとまとめに「使える」と書くと、足りない側の数字を並べたまま反対のことを言うことになる。
   */
  const modes = (['light', 'dark'] as const).map((mode) => {
    const surfaceStep = mode === 'light' ? g.lightSurfaceStep : g.darkSurfaceStep;
    const reqs = mode === 'light' ? g.light : g.dark;
    const page = palette.neutral.byStep[surfaceStep]!;
    const ratio = contrastBetween(input, page);
    const textReq = reqs.reduce((a, b) => (a.min >= b.min ? a : b));
    const markReq = reqs.reduce((a, b) => (a.min <= b.min ? a : b));
    return {
      mode,
      label: mode === 'light' ? '明色' : '暗色',
      ratio,
      textStep: textReq.step,
      textMin: textReq.min,
      markMin: markReq.min,
      asText: ratio >= textReq.min,
      asMark: ratio >= markReq.min,
    };
  });
  const accentSteps = new Set(modes.map((m) => m.textStep));

  return (
    <section>
      <h2>選んだ色はどこに入ったか</h2>
      <div className="placement">
        <span className="chip" style={{ background: toCss(input) }} />
        <code>{toHex(input)}</code>
        <span className="arrow">→</span>
        <span className="chip" style={{ background: toCss(near) }} />
        <code>
          primary 段{nearest} {toHex(near)}
        </code>
        <span className="delta">
          ΔL {Math.abs(input.L - near.L).toFixed(3)} / ΔC{' '}
          {Math.abs(input.C - near.C).toFixed(3)} / ΔH{' '}
          {Math.abs(input.H - near.H).toFixed(1)}°
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
                className={`swatch${st === nearest ? ' picked' : ''}${accentSteps.has(st) ? ' accent' : ''}`}
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
        {modes.map((m) => `${m.label}は段${m.textStep}`).join('、')}）。
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
              <td>{m.label}の面に置くと</td>
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

/** 生成した色が実際に使えるかを見るための、最小限の画面 */
const Preview = ({ palette, mode }: { palette: Palette; mode: 'light' | 'dark' }) => {
  const n = palette.neutral.byStep;
  const bg = mode === 'light' ? n[50]! : n[950]!;
  const surface = mode === 'light' ? n[100]! : n[900]!;
  const text = mode === 'light' ? n[900]! : n[100]!;
  const muted = mode === 'light' ? n[600]! : n[300]!;
  const border = mode === 'light' ? n[300]! : n[700]!;
  // 文字は 4.5:1 が要るので 500（明色）/ 400（暗色）。
  // チャートの線や点は文字ではないので 3:1 で足り、1段明るい方を使える。
  // 段500 で描いていたときは5系列が沈んで見分けにくかった。
  const textStep = mode === 'light' ? 500 : 400;
  const markStep = mode === 'light' ? 400 : 300;
  const seriesSteps = mode === 'light' ? palette.categoricalSteps.light : palette.categoricalSteps.dark;
  return (
    <div className="preview" style={{ background: toCss(bg), color: toCss(text) }}>
      <div
        className="preview-card"
        style={{ background: toCss(surface), borderColor: toCss(border) }}
      >
        <strong>カードの見出し</strong>
        <p style={{ color: toCss(muted) }}>
          補助的な説明文です。中間色が primary の色相で着色されているため、
          アクセント色と並べても浮かないことを確かめます。
        </p>
        <div className="preview-row">
          <button
            type="button"
            style={{
              background: toCss(palette.primary.byStep[textStep]!),
              color: toCss(mode === 'light' ? n[50]! : n[950]!),
            }}
          >
            主ボタン
          </button>
          {statusNames.map((s) => (
            <span
              key={s}
              className="badge"
              style={{
                color: toCss(palette.status[s].byStep[textStep]!),
                borderColor: toCss(palette.status[s].byStep[markStep]!),
              }}
            >
              {s}
            </span>
          ))}
        </div>
        <div className="preview-row">
          {palette.categorical.map((r, i) => (
            <span key={r.hue} className="series">
              {/* 系列ごとに段が違う。色相だけ変えると二色覚で潰れるため（決定5-8） */}
              <i style={{ background: toCss(r.byStep[seriesSteps[i]!]!) }} />
              系列{i + 1}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export const ThemeBuilder = () => {
  const [hex, setHex] = useState('#3b82f6');
  const palette = useMemo(() => generatePalette(hexToOklch(hex)), [hex]);
  const css = useMemo(() => toTokensCss(palette), [palette]);
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

      <InputPlacement palette={palette} input={hexToOklch(hex)} />

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
