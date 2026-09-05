/**
 * tokens.css の構造。
 *
 * 明色モード・暗色モードの切り替え方は、**利用側が固定できることまで含めて**規則である
 * （決定5-10）。Phase 2 で ichirizuka（明色専用の紙のデザイン）へ導入したとき、
 * OS が暗色設定だと写像した変数だけが暗色へ飛び、生値のまま残った箇所と混ざって壊れた。
 * `[data-theme="dark"]` はあるのに `[data-theme="light"]` が無く、固定する手段が無かった。
 *
 * ここで検査するのは「出ていること」と「順序でメディアクエリに勝てること」。
 * **実ブラウザでの解決は別途目視で確認する**（記録は PR）。詳細度と順序の話なので
 * 静的検査だけでは効くことを証明できない。
 */
import { describe, expect, it } from 'vitest';
import {
  colorSemanticVars,
  densityLevels,
  hoverMirrorVars,
  generatePalette,
  spaceRoles,
  spacingSemanticVars,
  toTokensCss,
} from '../src/index.ts';

const palette = generatePalette({ L: 0.6, C: 0.1, H: 220 });
const css = toTokensCss(palette);

const blockOf = (selector: string) => {
  const start = css.indexOf(`${selector} {`);
  if (start === -1) return null;
  return { at: start, body: css.slice(start, css.indexOf('\n}', start)) };
};

describe('tokens.css のテーマ切り替え', () => {
  it('両方向の固定手段が出ている', () => {
    expect(blockOf('[data-theme="light"]')).not.toBeNull();
    expect(blockOf('[data-theme="dark"]')).not.toBeNull();
  });

  it('固定用のブロックはメディアクエリより後にある（同じ詳細度なので順序で勝つ）', () => {
    const media = css.indexOf('@media (prefers-color-scheme: dark)');
    expect(media).toBeGreaterThan(-1);
    expect(blockOf('[data-theme="light"]')!.at).toBeGreaterThan(media);
    expect(blockOf('[data-theme="dark"]')!.at).toBeGreaterThan(media);
  });

  it('どのテーマブロックも color-scheme を伴う', () => {
    // CSS 変数はスクロールバーやフォームコントロールへ届かない。
    // これが無いと、暗色に切り替えても明色のスクロールバーが暗い面の上に出る（自己レビュー B1）
    expect(blockOf('[data-theme="light"]')!.body).toContain('color-scheme: light;');
    expect(blockOf('[data-theme="dark"]')!.body).toContain('color-scheme: dark;');

    const root = css.slice(css.indexOf(':root {'), css.indexOf('\n}'));
    expect(root).toContain('color-scheme: light;');

    const media = css.slice(css.indexOf('@media (prefers-color-scheme: dark)'));
    expect(media.slice(0, media.indexOf('\n}'))).toContain('color-scheme: dark;');
  });

  it('固定用のブロックの中身が :root / メディアクエリと一致する', () => {
    const declarations = (body: string) =>
      body
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.startsWith('--sg-'));

    // 控え（--sg-color-hover-*）も面の文脈の一部なので、固定用のブロックにも要る。
    // 落ちていると、テーマを固定した瞬間に hover だけ OS 設定側の値を指す
    for (const mode of ['light', 'dark'] as const) {
      expect(declarations(blockOf(`[data-theme="${mode}"]`)!.body)).toEqual(
        [...colorSemanticVars(mode, palette), ...hoverMirrorVars(mode, palette, 0)].map((l) =>
          l.trim(),
        ),
      );
    }
  });
});

describe('tokens.css の密度（決定1-12）', () => {
  it('3段すべての固定手段が出ている', () => {
    for (const level of densityLevels) {
      expect(css, level).toContain(`[data-sg-density="${level}"] {`);
    }
  });

  it('固定用のブロックはメディアクエリより後にある（同じ詳細度なので順序で勝つ）', () => {
    const media = css.indexOf('@media (width <');
    expect(media, '密度のメディアクエリが無い').toBeGreaterThan(-1);
    for (const level of densityLevels) {
      expect(css.indexOf(`[data-sg-density="${level}"] {`), level).toBeGreaterThan(media);
    }
  });

  it('固定用のブロックの中身が生成器と一致する', () => {
    for (const level of densityLevels) {
      const block = blockOf(`[data-sg-density="${level}"]`);
      expect(block, level).not.toBeNull();
      const declarations = block!.body
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.startsWith('--'));
      expect(declarations, level).toEqual(
        spacingSemanticVars(level).map((l) => l.trim()),
      );
    }
  });

  it('狭い画面の既定が compact と一致する（２つの経路が食い違わない）', () => {
    const start = css.indexOf('@media (width <');
    const body = css.slice(start, css.indexOf('\n}', start));
    for (const line of spacingSemanticVars('compact')) {
      expect(body, line.trim()).toContain(line.trim());
    }
  });

  it('骨格の役割だけが出ている（コンポーネント内部の余白は密度で動かさない）', () => {
    expect(spaceRoles).toEqual(['page', 'section', 'surface']);
  });
});

/**
 * hover の面（決定5-13）。
 *
 * 値は面が控えた `--sg-color-hover-*` から**継承で**届く。控えが1つでも欠けると、
 * hover したときにその変数が無効になり、**エラーにならないまま**役割が消える（教訓4）。
 * ここで見るのは「規則が参照する控えを、面を作るブロックが全部持っていること」。
 */
describe('tokens.css の hover（決定5-13）', () => {
  /**
   * 入れ子の無いブロックだけを拾う。@media は中に波括弧を含むので当たらない。
   *
   * **先にコメントを落とす。** コメントの中に `{` や `}`（`--sg-{カテゴリ}-{数字}` など）や
   * セレクタの説明が入っており、落とさないと構文の一部として拾ってしまう
   */
  const bare = css.replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, ' '));
  const rules = [...bare.matchAll(/([^{}]*)\{([^{}]*)\}/g)].map((m) => ({
    selector: m[1]!.trim(),
    body: m[2]!,
    at: m.index!,
  }));
  const hoverRules = rules.filter((r) => r.selector.includes('[data-sg-interactive]'));

  it('規則は1本だけ（面ごとに書き分けていない）', () => {
    expect(hoverRules.map((r) => r.selector)).toEqual(['[data-sg-interactive]:hover']);
  });

  it('触る画面で張り付かないよう (hover: hover) の中にある', () => {
    const at = hoverRules[0]!.at;
    const media = bare.lastIndexOf('@media (hover: hover)', at);
    expect(media, '(hover: hover) の外に出ている').toBeGreaterThan(-1);
    // 間に別のブロックの終わりが挟まっていないこと（本当にその中にいる）
    expect(css.slice(media, at)).not.toContain('\n}');
  });

  it('面のブロックより後にある（背景色の指定が順序で勝つ）', () => {
    const lastSurface = bare.lastIndexOf('[data-sg-surface=');
    expect(hoverRules[0]!.at).toBeGreaterThan(lastSurface);
  });

  it('規則が参照する控えを、面を作るブロックがすべて持っている', () => {
    const referenced = [...hoverRules[0]!.body.matchAll(/var\((--sg-color-hover-[\w-]+)\)/g)].map(
      (m) => m[1]!,
    );
    expect(referenced.length, '控えを1つも参照していない').toBeGreaterThan(0);

    // 面を作るブロック = 前景の役割を決めているブロック（:root・面・テーマ固定の全部）
    const contexts = rules.filter(
      (r) =>
        r.body.includes('--sg-color-text-default:') &&
        !r.selector.includes('[data-sg-interactive]'),
    );
    expect(contexts.length, '面を作るブロックが見つからない').toBeGreaterThan(0);
    for (const ctx of contexts) {
      const missing = referenced.filter((n) => !ctx.body.includes(`${n}:`));
      expect(missing, `${ctx.selector} が控えていない`).toEqual([]);
    }
  });

  it('面が控えた値は、規則が漏れなく現在の役割へ移している（逆向き）', () => {
    // 上の検査は「規則が参照する控えがあるか」しか見ない。**逆は別の壊れ方をする。**
    // 控えだけがあって規則が移していない役割は、hover 中に古い段のまま残る。
    // 背景だけが1段深くなった状態になり、決定5-13 が消したはずの穴が戻る
    const moved = new Set(
      [...hoverRules[0]!.body.matchAll(/var\((--sg-color-hover-[\w-]+)\)/g)].map((m) => m[1]!),
    );
    const contexts = rules.filter(
      (r) =>
        r.body.includes('--sg-color-text-default:') &&
        !r.selector.includes('[data-sg-interactive]'),
    );
    for (const ctx of contexts) {
      const held = [...ctx.body.matchAll(/(--sg-color-hover-[\w-]+):/g)]
        .map((m) => m[1]!)
        // 背景は変数ではなく background-color として移すので、対応は名前で取れない
        .filter((n) => n !== '--sg-color-hover-bg');
      expect(
        held.filter((n) => !moved.has(n)),
        `${ctx.selector} が控えているのに規則が移していない`,
      ).toEqual([]);
    }
  });

  it('bg-hover というセマンティックは出さない（塗るだけの道を作らない）', () => {
    expect(css).not.toContain('--sg-color-bg-hover');
  });
});

/**
 * 骨組み表示の動き（決定1-14）。
 *
 * **素の CSS の利用者にも届くこと**と、**動きを減らす設定を尊重すること**を見る。
 * どちらも欠けてもエラーにならない——前者は何も動かず、後者は動きすぎるだけである（教訓4）。
 */
describe('tokens.css の動き（決定1-14）', () => {
  it('keyframes と、それを使う規則が対で出ている', () => {
    expect(css).toMatch(/@keyframes\s+skeleton\s*\{/);
    const rule = blockOf('[data-sg-skeleton]');
    expect(rule, '[data-sg-skeleton] が無い').not.toBeNull();
    expect(rule!.body).toMatch(/\bskeleton\b/);
  });

  it('周期はループスケールから引いている（素の秒数を書いていない）', () => {
    expect(blockOf('[data-sg-skeleton]')!.body).toMatch(/var\(--sg-duration-loop-\d+\)/);
  });

  it('動きを減らす設定で止まる', () => {
    const found = reducedMotionFor('[data-sg-skeleton]');
    expect(found, '骨組み表示を止めるブロックが無い').not.toBeNull();
    expect(found!.block).toMatch(/animation:\s*none/);
  });

  it('止める規則は、動かす規則より後にある（同じ詳細度なので順序で勝つ）', () => {
    const on = css.indexOf('[data-sg-skeleton] {');
    expect(reducedMotionFor('[data-sg-skeleton]')!.at).toBeGreaterThan(on);
  });
});

/**
 * 回り続ける表示（決定6-18）。**骨組み表示と同じ形で出している。**
 *
 * ここで測るのは**規則の側**である。
 * コンポーネントはプリミティブを参照できない（原則3）ので、
 * 「周期がスケールから来ていること」を測れるのはここだけである。
 */
/**
 * 覆いと、その出入りの動き（決定6-40）。
 *
 * ここで測るのは**規則の側**である。コンポーネントはプリミティブを参照できない
 * （原則3）ので、「時間がスケールから来ていること」を測れるのはここだけである。
 */
/**
 * 「動きを減らす」の塊を、**中に入っているセレクタで探す。**
 *
 * 塊は1つとは限らない。以前は最初の1つを見ていたが、
 * **別の塊が先に増えた瞬間に、別のものを見て緑になる**形だった。
 */
const reducedMotionFor = (selector: string): { at: number; block: string } | null => {
  const re = /@media \(prefers-reduced-motion: reduce\)/g;
  for (let m = re.exec(css); m; m = re.exec(css)) {
    const block = css.slice(m.index, css.indexOf('\n}', m.index));
    if (block.includes(selector)) return { at: m.index, block };
  }
  return null;
};

describe('tokens.css の覆い（決定6-40）', () => {
  it('宣言した要素の覆いだけを塗る', () => {
    const rule = blockOf('[data-sg-scrim]::backdrop');
    expect(rule, '[data-sg-scrim]::backdrop が無い').not.toBeNull();
    expect(rule!.body).toContain('--sg-color-scrim');
  });

  it('覆いの濃さは宣言していない差し込み口である', () => {
    // 宣言すると var() のフォールバックが効かず、差していない口が空で解決される
    expect(/^\s*--sg-color-scrim\s*:/m.test(css)).toBe(false);
    expect(css).toContain('var(--sg-color-scrim,');
  });

  it('閉じるときも動けるように、display と overlay を遷移させる', () => {
    // **`close()` は表示を即座に消す。** allow-discrete が無いと、
    // 消えてから動くことになり、動きが見えない
    const at = css.indexOf('[data-sg-scrim],');
    expect(at, '出入りの規則が無い').toBeGreaterThan(-1);
    const block = css.slice(at, css.indexOf('\n}', at));
    expect(block).toMatch(/display[^;]*allow-discrete/);
    expect(block).toMatch(/overlay[^;]*allow-discrete/);
  });

  it('時間はスケールから引いている（素の秒数を書いていない）', () => {
    const at = css.indexOf('[data-sg-scrim],');
    const block = css.slice(at, css.indexOf('\n}', at));
    expect(block).toMatch(/var\(--sg-duration-\d+\)/);
    expect(block).not.toMatch(/\d+ms/);
  });

  it('開くときの始点がある', () => {
    // **無いと、開くときだけ動かない**——表示され始めた要素には遷移の始点が無い
    expect(css).toMatch(/@starting-style\s*\{[\s\S]*?\[data-sg-scrim\]\[open\]/);
  });

  it('動きを減らす設定で止まる', () => {
    const found = reducedMotionFor('[data-sg-scrim]');
    expect(found, '覆いを止めるブロックが無い').not.toBeNull();
    expect(found!.block).toMatch(/transition:\s*none/);
  });

  it('止める規則は、動かす規則より後にある（同じ詳細度なので順序で勝つ）', () => {
    expect(reducedMotionFor('[data-sg-scrim]')!.at).toBeGreaterThan(
      css.indexOf('[data-sg-scrim],'),
    );
  });
});

describe('tokens.css の回転（決定6-18）', () => {
  it('keyframes と、それを使う規則が対で出ている', () => {
    expect(css).toMatch(/@keyframes\s+sg-spin\s*\{/);
    const rule = blockOf('[data-sg-spinner]');
    expect(rule, '[data-sg-spinner] が無い').not.toBeNull();
    expect(rule!.body).toMatch(/\bsg-spin\b/);
  });

  it('周期はループスケールから引いている（素の秒数を書いていない）', () => {
    expect(blockOf('[data-sg-spinner]')!.body).toMatch(/var\(--sg-duration-loop-\d+\)/);
  });

  it('遷移のスケールを借りていない', () => {
    // **回り続けるものは「>500ms は鈍重」の制約の外にある。**
    // 遷移の段を借りると、別スケールにした理由が消える
    expect(blockOf('[data-sg-spinner]')!.body).not.toMatch(/--sg-duration-transition-/);
  });

  it('加減速を付けていない', () => {
    // 回り続けるものに始点と終点は無い
    expect(blockOf('[data-sg-spinner]')!.body).toMatch(/\blinear\b/);
  });

  it('動きを減らす設定で止まる', () => {
    const on = css.indexOf('[data-sg-spinner] {');
    const off = css.indexOf('[data-sg-spinner]', on + 1);
    expect(off, '止める規則が無い').toBeGreaterThan(on);
    const block = css.slice(css.lastIndexOf('@media', off), css.indexOf('\n}', off));
    expect(block).toContain('prefers-reduced-motion');
    expect(block).toMatch(/animation:\s*none/);
  });
});
