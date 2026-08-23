/**
 * 生成スケールが実需要を覆えるかを照合する。
 * docs/verification.md に載せた数値はこのスクリプトの出力である。
 *
 * スケールを変更したら再実行し、docs/verification.md を更新すること。
 */
import * as S from './scales.mjs';
import { collect, sorted, sourcesOf } from './observed.mjs';

const { observed, missing } = collect();
if (missing.length) {
  console.error('観測対象が見つかりません:\n  ' + missing.join('\n  '));
  process.exit(1);
}

const near = (v, arr) => arr.reduce((a, b) => (Math.abs(b - v) < Math.abs(a - v) ? b : a));
const devPct = (v, arr) => (v === 0 ? 0 : Math.abs((near(v, arr) - v) / v) * 100);

const coverage = (values, scale, tol) => {
  const miss = values.filter((v) => devPct(v, scale) > tol);
  return {
    hit: values.length - miss.length,
    total: values.length,
    pct: ((values.length - miss.length) / values.length) * 100,
    miss,
  };
};

const line = (label, c) =>
  `  ${label.padEnd(28)} ${String(c.hit).padStart(2)}/${String(c.total).padEnd(2)} (${c.pct.toFixed(0).padStart(3)}%)` +
  (c.miss.length ? `  外れ: ${c.miss.join(', ')}` : '');

/* ---------- spacing ---------- */
const sp = sorted(observed.spacing);
const spPositive = sp.filter((v) => v > 0);
console.log('## spacing   スケール:', JSON.stringify(S.spacing));
console.log(line('全値 ±20%', coverage(spPositive, S.spacing, 20)));
console.log(line('4px 以上 ±20%', coverage(spPositive.filter((v) => v >= 4), S.spacing, 20)));
console.log(line('完全一致', coverage(sp, S.spacing, 0.001)));
console.log('  ※ 4px 未満は border-width の責務（決定1-7）');

/* ---------- font-size ---------- */
const fs = sorted(observed.fontSize);
/** 改訂前の8段は、改訂後11段の先頭8段と同一（上方向を3段足しただけ） */
const original8 = S.fontSize.slice(0, 8);
console.log('\n## font-size   スケール:', S.fontSize.map((v) => v.toFixed(2)).join(', '));
console.log(line('改訂前8段 ±5%', coverage(fs, original8, 5)));
console.log(line('改訂後11段 ±5%', coverage(fs, S.fontSize, 5)));
console.log(line('改訂後11段 ±8%', coverage(fs, S.fontSize, 8)));
console.log('  ※ 132px は clamp() の可変域の端であり段ではない');

/* ---------- radius ---------- */
const rd = sorted(observed.radius);
const radiusScale = [...S.radius, S.radiusFull, 999];
console.log('\n## radius   スケール:', JSON.stringify(S.radius), `+ full`);
console.log(line('完全一致', coverage(rd, radiusScale, 0.001)));

/* ---------- duration ---------- */
const du = sorted(observed.duration);
const transition = du.filter((v) => v <= 500);
const loop = du.filter((v) => v > 500);
console.log('\n## duration');
console.log('  遷移スケール:', S.durationTransition.map((v) => v.toFixed(1)).join(', '));
console.log(line('遷移域(≤500ms) ±10%', coverage(transition, S.durationTransition, 10)));
console.log('  ループスケール:', S.durationLoop.map((v) => v.toFixed(1)).join(', '));
console.log(line('ループ域(>500ms) ±10%', coverage(loop, S.durationLoop, 10)));

/* ---------- 導出値の検証 ---------- */
console.log('\n## line-height   実測（系統ごとの当てはめは docs/verification.md 参照）');
console.log(' ', sorted(observed.lineHeight).map((v) => `${v}[${sourcesOf(observed.lineHeight, v)}]`).join(' '));
console.log('\n## letter-spacing   実測（サイズと大文字化の2要因、決定1-9）');
console.log(' ', sorted(observed.letterSpacing).map((v) => `${v}[${sourcesOf(observed.letterSpacing, v)}]`).join(' '));
