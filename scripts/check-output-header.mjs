/**
 * 生成物が**落ちた先で意味を成す**ことを検査する（原則6、Issue #34）。
 *
 * レジストリ方式では生成物が利用側リポジトリへ落ちる。そこには `docs/decisions.md` も
 * 「原則3」の定義も無い。Phase 2 で ichirizuka にコミットした `app/tokens.css` が
 * 実際にその状態だった（docs/experiments/phase2-ichirizuka.md の穴9）。
 *
 * 対象は **dist/ にあるもの全部**で、除外だけを理由つきで列挙する（教訓5）。
 * 手書きの一覧にすると、次に足した出力が黙って検査を素通りする
 * （自己レビュー B1 で、実際に素通りすることを確かめた）。
 *
 * 検査できる範囲:
 *   - 全生成物が共通ヘッダで始まること（1つだけ書き忘れる、が起きる）
 *   - 規則の在り処が絶対 URL で書かれていること
 *   - **リポジトリ相対のパスが本文に残っていないこと。** これが穴9 そのもの
 *   - 生成のたびに変わる値（日時）が入っていないこと。入ると内容が同じでも
 *     diff が出て、利用側が「更新された」と誤認する
 *
 * 検査できない範囲（教訓5）:
 *   - リンク先が実在するか（ネットワークを見に行かない）
 *   - ヘッダの説明が正しいか。文面の意味は機械では読めない
 *   - 「原則3」のような番号参照そのもの。ヘッダが在り処を説明していることで足りるとみなす
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { UNRELEASED, VERSION, docsUrl } from '../packages/tokens/src/output/header.ts';

const DIST = 'packages/tokens/dist';
if (!existsSync(DIST)) {
  console.error(`${DIST} がありません。先に pnpm build:tokens を実行してください。`);
  process.exit(1);
}

/**
 * 対象から外すもの。**理由の書けない除外を足さない。**
 * 対象は dist の中身すべてであり、ここに列挙したものだけを引く。
 * 新しく足した出力は自動的に検査に入る。
 */
const EXCLUDED = [
  {
    re: /^tokens\.layers\.json$/,
    why:
      '配布物ではなく検査用の名前表（scripts/check-token-usage.mjs が読む）。' +
      'JSON にコメントは書けず、利用側リポジトリへも落ちない',
  },
];

const FILES = readdirSync(DIST).filter((f) => !EXCLUDED.some((e) => e.re.test(f)));

// 対象が無いのに緑を返すと、空の dist を検査した結果と区別がつかない（教訓2）
if (FILES.length === 0) {
  console.error(`${DIST} に検査対象がありません。生成が空か、除外が広すぎます。`);
  process.exit(1);
}

/* ============================================================
   検出器（フィクスチャにも実ファイルにも同じものを当てる）
   ============================================================ */

/** リポジトリ相対のパス。URL の一部として現れるものは除いてから当てる */
const REPO_PATH = /(?:^|[^\w/:])(?:\.{1,2}\/|(?:docs|packages|scripts|apps)\/)[\w./-]+/g;

/** 生成のたびに変わる値。日付・時刻・ISO 文字列 */
const VOLATILE = /\d{4}-\d{2}-\d{2}(?:T[\d:.]+Z?)?|\d{1,2}:\d{2}:\d{2}/g;

/** URL を伏せる。URL の中の docs/ は相対パスではない */
const withoutUrls = (text) => text.replace(/https?:\/\/\S+/g, (m) => ' '.repeat(m.length));

const REQUIRED = [
  { what: 'ツール名', re: /@sashigane\/tokens/ },
  { what: '手で編集しない旨', re: /手で編集しない/ },
  { what: '規則の在り処（絶対 URL）', re: new RegExp(docsUrl().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) },
  {
    /**
     * 落ちた先で「どのスナップショットを持っているか」を知る唯一の手がかり（決定4-6）。
     *
     * **ツール名に続く形で見る。** バージョンだけを探すと、リリース済みのときに
     * 在り処の URL（`.../tree/v0.1.0/docs`）へ一致してしまい、
     * **ヘッダからバージョンの行が落ちても検査が通る。**
     * 陰性対照が実際にこれを捕まえた。
     */
    what: 'バージョン',
    re: new RegExp(
      `@sashigane/tokens${
        VERSION === UNRELEASED ? '（未リリース）' : ` v${VERSION.replace(/\./g, '\\.')}`
      }`,
    ),
  },
  { what: '見出し番号が何を指すかの説明', re: /decisions\.md|principles\.md/ },
];

/** 1ファイル分の検査。フィクスチャにも同じものを当てる */
const findViolations = (name, text) => {
  const out = [];
  // ヘッダは先頭に無ければ意味が無い。最初の30行だけを見る
  const head = text.split('\n').slice(0, 30).join('\n');
  for (const { what, re } of REQUIRED) {
    if (!re.test(head)) out.push(`${name}: ヘッダに${what}が無い`);
  }
  const bare = withoutUrls(text);
  for (const m of bare.matchAll(REPO_PATH)) {
    out.push(`${name}: リポジトリ相対のパスが残っている「${m[0].trim()}」— 配布先には存在しない`);
  }
  for (const m of bare.matchAll(VOLATILE)) {
    out.push(`${name}: 生成のたびに変わる値が入っている「${m[0]}」— 内容が同じでも diff が出る`);
  }
  return out;
};

/* ============================================================
   陰性対照 — 検出器が発火することを毎回確かめる（教訓2）
   ============================================================ */

const VERSION_LABEL =
  VERSION === UNRELEASED ? '（未リリース）' : ` v${VERSION}`;

const OK_HEADER = [
  '// sashigane — 何か。',
  `// 生成物。手で編集しない。@sashigane/tokens${VERSION_LABEL}が生成する。`,
  `// 規則と根拠: ${docsUrl()}`,
  '// 「決定1-2」は decisions.md の見出し。principles.md も同じ場所にある。',
].join('\n');

const FIXTURES = [
  { name: '相対パス', text: `${OK_HEADER}\n// 詳細は docs/decisions.md を参照`, expect: /相対のパス/ },
  { name: '親ディレクトリ', text: `${OK_HEADER}\n// ../decisions.md`, expect: /相対のパス/ },
  { name: '生成日時', text: `${OK_HEADER}\n// 生成: 2026-08-24T10:00:00Z`, expect: /変わる値/ },
  { name: 'ヘッダ欠落', text: '// 生成物\n--sg-space-0: 0;', expect: /ヘッダに/ },
  {
    // バージョンが落ちても、他の行があるので**見た目には気づけない**（決定4-6）
    name: 'バージョン欠落',
    text: `${OK_HEADER.replace(VERSION_LABEL, ' ')}\n// 決定1-2 に従う`,
    expect: /バージョン/,
  },
  { name: '正しいもの', text: `${OK_HEADER}\n// 決定1-2 に従う`, expect: null },
];

const selfTest = [];
for (const f of FIXTURES) {
  const found = findViolations(f.name, f.text);
  const ok = f.expect === null ? found.length === 0 : found.some((v) => f.expect.test(v));
  if (!ok) {
    selfTest.push(`${f.name}: 期待 ${f.expect ?? '検出なし'} / 実際 ${found.join(' / ') || '検出なし'}`);
  }
}
if (selfTest.length) {
  console.error('陰性対照に失敗しました。**この検査は機能していません。**\n');
  for (const m of selfTest) console.error(`  ✗ ${m}`);
  process.exit(1);
}

/* ============================================================
   本体
   ============================================================ */

const violations = FILES.flatMap((f) => findViolations(f, readFileSync(`${DIST}/${f}`, 'utf8')));

if (violations.length) {
  console.error('生成物が配布先で意味を成しません。\n');
  for (const v of violations) console.error(`  ✗ ${v}`);
  console.error('\nヘッダは packages/tokens/src/output/header.ts に1箇所で持っています。');
  process.exit(1);
}

console.log(`✓ 陰性対照 ${FIXTURES.length} 件が期待どおり発火した`);
console.log(
  `✓ 生成物 ${FILES.length} 件が共通ヘッダを持ち、規則の在り処を絶対 URL で示している` +
    `（dist の全ファイルが対象。除外 ${EXCLUDED.length} 規則）`,
);
console.log('✓ リポジトリ相対のパスと、生成のたびに変わる値が残っていない');
