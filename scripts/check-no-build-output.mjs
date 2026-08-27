/**
 * 生成物がコミットされていないことを検査する（原則1）。
 *
 * 経緯: 最初この検査を CI に直接 grep で書き、dist と public/r の2パターンだけを
 * 見ていた。その検査を書いた同じコミットで packages/tokens/tsconfig.tsbuildinfo を
 * コミットしており、検査は緑のまま通った。
 *
 * 既知のパスを列挙する方式は、列挙し忘れたものを黙って通す。
 * docs/agent-failures.md の教訓4「静かに失敗するものを疑う」より、
 * 拡張子・ディレクトリ名の両面から広く拾う形に変えた。
 */
import { execSync } from 'node:child_process';

/** 生成物であることが名前から分かるもの */
const PATTERNS = [
  { re: /(^|\/)dist\//, why: 'ビルド出力' },
  { re: /(^|\/)build\//, why: 'ビルド出力' },
  { re: /(^|\/)\.next\//, why: 'Next.js のビルド出力' },
  { re: /(^|\/)storybook-static\//, why: 'Storybook のビルド出力' },
  { re: /(^|\/)coverage\//, why: 'カバレッジ出力' },
  { re: /^apps\/[^/]+\/public\/r\//, why: 'レジストリ配布物（保留 4-5）' },
  { re: /\.tsbuildinfo$/, why: 'TypeScript のインクリメンタルビルド情報' },
  { re: /\.d\.ts$/, why: '型定義の生成物', unless: /(^|\/)(src|types)\// },
  { re: /(^|\/)node_modules\//, why: '依存' },
];

/*
 * **追跡下のファイルだけを見る。** この検査に限っては、それが目的そのものである
 * （見たいのは「コミットされているか」であって、作業ツリーに何があるかではない）。
 * `dist/` が未追跡のまま存在していても、ここは緑でよい。
 *
 * ただし同じ性質が check:token-usage では見逃しになった（Issue #63）。
 * **「手元で緑」と「CI で緑」がずれる**ので、性質としてここに書いておく。
 */
const files = execSync('git ls-files', { encoding: 'utf8' }).split('\n').filter(Boolean);
const hits = [];

for (const f of files) {
  for (const p of PATTERNS) {
    if (p.re.test(f) && !(p.unless && p.unless.test(f))) hits.push({ f, why: p.why });
  }
}

if (hits.length) {
  console.error('生成物がコミットされています。原則1「生成物はコミットしない」に反します。\n');
  for (const h of hits) console.error(`  ✗ ${h.f}  (${h.why})`);
  console.error('\n.gitignore に追加し、git rm --cached で追跡を外してください。');
  process.exit(1);
}

console.log(`✓ 生成物は含まれていない（${files.length} ファイルを検査）`);
