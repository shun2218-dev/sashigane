/**
 * JS へ出す値の不変条件。
 *
 * この出力は tokens.css と同じ内容を別の形で持つ**二重管理**である。
 * ずれを検出する検査は `scripts/check-token-values.mjs` が持つ（出力どうしを突き合わせる）。
 * ここで見るのは、出力そのものが満たすべき性質。
 */
import { describe, expect, it } from 'vitest';
import {
  colorRequirements,
  colorSemanticVars,
  colorWithoutRequirement,
  contrastBetween,
  generatePalette,
  hexToOklch,
  statusNames,
  steps,
  surfaceRolesFor,
  toHex,
  tokenLayers,
  tokenValues,
} from '../src/index.ts';
import tokens from '../src/tokens.json' with { type: 'json' };

/** `--sg-{ランプ}-{段}` を素直に16進へ落とした値。寄せる前の姿 */
const primitiveHex = (pal: ReturnType<typeof generatePalette>, ref: string): string | undefined => {
  const m = /^--sg-(series-\d+|[a-z]+)-(\d+)$/.exec(ref);
  if (!m) return undefined;
  const [, ramp, step] = m;
  const r =
    ramp === 'neutral'
      ? pal.neutral
      : ramp === 'primary'
        ? pal.primary
        : ramp!.startsWith('series-')
          ? pal.categorical[Number(ramp!.split('-')[1]) - 1]
          : (pal.status as Record<string, typeof pal.primary>)[ramp!];
  return r ? toHex(r.byStep[Number(step)]!) : undefined;
};

const palette = generatePalette({ L: 0.6, C: 0.1, H: 220 });
const values = tokenValues(palette);
const layers = tokenLayers(palette);

describe('JS へ出す値', () => {
  it('鍵はセマンティックと過不足なく一致する', () => {
    for (const theme of ['light', 'dark'] as const) {
      expect(Object.keys(values[theme]).sort()).toEqual([...layers.semantics].sort());
    }
  });

  it('プリミティブは出さない（原則3）', () => {
    const primitives = new Set(layers.primitives);
    for (const theme of ['light', 'dark'] as const) {
      expect(Object.keys(values[theme]).filter((n) => primitives.has(n))).toEqual([]);
    }
  });

  it('解決済みの値であり var() が残っていない', () => {
    for (const theme of ['light', 'dark'] as const) {
      for (const [name, v] of Object.entries(values[theme])) {
        expect(v, name).not.toContain('var(');
      }
    }
  });

  it('色は16進で出す（canvas や OG 画像が oklch を解さない）', () => {
    for (const theme of ['light', 'dark'] as const) {
      for (const [name, v] of Object.entries(values[theme])) {
        if (!name.startsWith('--sg-color-')) continue;
        expect(v, name).toMatch(/^#[0-9a-f]{6}$/);
      }
    }
  });

  it('テーマで変わるのは色と浮きだけ（タイポグラフィと余白は動かない）', () => {
    for (const [name, v] of Object.entries(values.light)) {
      if (name.startsWith('--sg-color-')) continue;
      // 浮きはモードで媒体そのものが変わる（明色は影、暗色は輪郭。決定1-8 改訂）。
      // 色以外でテーマに依存する唯一の役割なので、名指しで除く
      if (name.startsWith('--sg-elevation-')) continue;
      expect(values.dark[name], name).toBe(v);
    }
  });

  it('浮きは light と dark で必ず変わる（暗色で影が素通りしていない）', () => {
    const names = Object.keys(values.light).filter((n) => n.startsWith('--sg-elevation-'));
    expect(names.length).toBeGreaterThan(0);
    for (const name of names) {
      expect(values.dark[name], name).not.toBe(values.light[name]);
      // 暗色は輪郭。影の色（透過を持つ8桁）が残っていたら媒体が入れ替わっていない
      expect(values.dark[name], name).not.toMatch(/#[0-9a-f]{8}/);
      expect(values.light[name], name).toMatch(/#[0-9a-f]{8}/);
    }
  });

  it('色は light と dark で必ず変わる（暗色ブロックが素通りしていない）', () => {
    // 連続帯の中央だけは構造的に動かない。両モードが同じランプを逆向きに
    // たどるので、真ん中の1本だけが同じ段を指す（決定5-11）。
    // **一律に sequential を除外しない。** 動かないのは中央の1本だけで、
    // 他が動かなくなったらそれは暗色ブロックの素通りである
    const fixed = `--sg-color-sequential-${(steps.length - 1) / 2}`;
    const same = Object.entries(values.light).filter(
      ([name, v]) => name.startsWith('--sg-color-') && values.dark[name] === v,
    );
    expect(same.map(([n]) => n)).toEqual([fixed]);
  });
});

/**
 * 16進に落としても保証が成立すること（決定2-6 改訂、Issue #52）。
 *
 * 決定5-2 は端点を要件**ちょうど**まで解くので余裕がゼロである。
 * `tokens.css` は `oklch()` をそのまま出すので影響しないが、
 * `tokens.js` は16進に丸めるため、境界の段が**丸めた瞬間だけ**割ることがあった。
 */
describe('JS へ出す値の保証（決定2-6 改訂）', () => {
  /** 全色相ぶんの値を1度だけ作る。tokenValues は出力を丸ごと組むので重い */
  const all = Array.from({ length: 360 }, (_, H) => {
    const pal = generatePalette({ L: 0.6, C: 0.1, H });
    return { H, pal, values: tokenValues(pal) };
  });

  it('ページ地に対する要件を、16進のままで満たす — 全360色相', () => {
    for (const { H, pal, values: v } of all) {
      for (const mode of ['light', 'dark'] as const) {
        const bg = hexToOklch(v[mode]['--sg-color-bg-page']!);
        for (const [name, min] of colorRequirements(mode, pal)) {
          const hex = v[mode][name];
          if (hex === undefined) continue;
          expect(
            contrastBetween(hexToOklch(hex), bg),
            `${mode} / ${name} / primary=${H}°`,
          ).toBeGreaterThanOrEqual(min);
        }
      }
    }
  }, 60_000);

  /**
   * **寄せが知覚できる量を超えないこと。**
   *
   * `hexMeeting` は RGB 空間で最も近い16進を選ぶので、**明度だけを動かす保証は無い。**
   * 色相も彩度も動きうる。RGB の段数は知覚の量ではないので、知覚距離で上限を持つ。
   *
   * 実測では ΔEok 最大 0.0036 だった（決定5-5 の識別閾 0.08、
   * 決定5-6 の改訂で「目視で見えた」とした 0.018 のどちらも大きく下回る）。
   */
  it('寄せた色は、知覚できる量まで動かない — 全360色相', () => {
    const ab = (c: { L: number; C: number; H: number }) => [
      c.C * Math.cos((c.H * Math.PI) / 180),
      c.C * Math.sin((c.H * Math.PI) / 180),
    ];
    let worst = { d: 0, name: '', H: -1 };
    for (const { H, pal, values: v } of all) {
      for (const mode of ['light', 'dark'] as const) {
        const lines = colorSemanticVars(mode, pal);
        for (const [name] of colorRequirements(mode, pal)) {
          const line = lines.find((l) => l.trimStart().startsWith(`${name}:`));
          const ref = line && /var\((--sg-[a-z0-9-]+)\)/.exec(line)?.[1];
          const naive = ref ? primitiveHex(pal, ref) : undefined;
          const got = v[mode][name];
          if (!naive || !got || naive === got) continue;
          const [a, b] = [hexToOklch(naive), hexToOklch(got)];
          const [a1, a2] = ab(a) as [number, number];
          const [b1, b2] = ab(b) as [number, number];
          const d = Math.hypot(a.L - b.L, a1 - b1, a2 - b2);
          if (d > worst.d) worst = { d, name, H };
        }
      }
    }
    /*
     * 実測の最大は 0.0036。上限はその倍ほどに置く。
     *
     * **この検査が何を捕まえるかを正直に書く**（教訓2）。
     *   捕まえる   — 寄せを近傍探索でなく大きく飛ばす形に変えること
     *                （黒/白へ飛ばす実装に替えると 0.56 になって落ちた）
     *   捕まえない — 近傍の中で最も遠い候補を選ぶように変えること。
     *                探索半径が 1〜2 で済むので知覚量まで届かない。**壊し方を作れなかった**
     *   捕まえない — 要件（textMin）を上げること。パレット全体が解き直されるので
     *                丸めのずれ自体は小さいままだった
     */
    expect(worst.d, `最大は primary=${worst.H}° の ${worst.name}`).toBeLessThan(0.005);
  }, 60_000);

  /**
   * **要件そのものが正しいことを見る。**
   *
   * 分類漏れは下の検査が捕まえるが、**間違った要件**は捕まらない。
   * `accent` を誤って 3.0 にしても、検査はどれも 3.0 で判定するので通ってしまい、
   * **保証が静かに緩む**（教訓4）。
   *
   * 要件は解いた役割から導ける。参照している段が text / colorText なら 4.5、
   * colorMark / series なら 3.0 である。**食い違っていたら落とす。**
   */
  it('要件は、その役割が参照している段と一致する', () => {
    const g = tokens.color.guarantees;
    for (const mode of ['light', 'dark'] as const) {
      const roles = surfaceRolesFor(palette, mode)[0]!;
      /*
       * **ランプごと**に対応を作る。段の番号だけでは足りない——
       * 明色では chart-2 の段（series-2 の 600）と text-muted の段（neutral の 600）が
       * たまたま同じ数字になり、要件が違うのに区別できない
       */
      const byRef = new Map<string, number>();
      for (const k of ['default', 'muted', 'faint'] as const) {
        byRef.set(`--sg-neutral-${roles.text[k]}`, g.textMin);
      }
      for (const ramp of ['primary', ...statusNames]) {
        byRef.set(`--sg-${ramp}-${roles.colorText}`, g.textMin);
        byRef.set(`--sg-${ramp}-${roles.colorMark}`, g.markMin);
      }
      (roles.series ?? []).forEach((step, i) => byRef.set(`--sg-series-${i + 1}-${step}`, g.markMin));

      const lines = colorSemanticVars(mode, palette);
      for (const [name, min] of colorRequirements(mode, palette)) {
        const line = lines.find((l) => l.trimStart().startsWith(`${name}:`));
        const ref = /var\((--sg-[a-z0-9-]+)\)/.exec(line ?? '')?.[1];
        expect(ref, `${mode} / ${name}: 参照している段を読めない`).toBeDefined();
        expect(byRef.get(ref!), `${mode} / ${name}: ${ref} は役割のどれでもない`).toBeDefined();
        expect(min, `${mode} / ${name}: ${ref} は ${byRef.get(ref!)} の段`).toBe(byRef.get(ref!));
      }
    }
  });

  /**
   * **分類漏れを捕まえる。** 要件の表に載っていない色が「要件無し」として
   * 明示されていなければ落ちる。役割を足したときに、静かに保証の外へ出ることを防ぐ
   */
  it('すべての色のセマンティックが、要件あり／要件無しのどちらかに分類されている', () => {
    for (const mode of ['light', 'dark'] as const) {
      const required = colorRequirements(mode, palette);
      const names = Object.keys(values[mode]).filter((n) => n.startsWith('--sg-color-'));
      const unclassified = names.filter(
        (n) => !required.has(n) && !colorWithoutRequirement(n),
      );
      expect(unclassified, `${mode}: 分類されていない色の役割`).toEqual([]);
    }
  });
});
