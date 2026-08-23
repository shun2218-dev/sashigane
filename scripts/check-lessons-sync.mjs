/**
 * docs/agent-failures.md の「教訓」が CLAUDE.md に届いているかを検査する。
 *
 * 理由: CLAUDE.md は agent-failures.md の教訓を要約して埋め込んでいる。
 * 参照ではなく要約なのは、リンク先を読むかどうかに依存させないため。
 * その代償として二重管理になり、教訓を追加したときにドリフトする。
 *
 * これは同じ構造の失敗を2度起こしている（スケール定義の3重複、README との規則重複）。
 * 「機械的に検査できるものは文書ではなく検査にする」（教訓3）の適用として、
 * 見出しの一致を機械的に検査する。
 */
import { readFileSync } from 'node:fs';

const failures = readFileSync('docs/agent-failures.md', 'utf8');
const claude = readFileSync('CLAUDE.md', 'utf8');

const section = failures.split('## 教訓（ルールとして残す）')[1];
if (!section) {
  console.error('docs/agent-failures.md に「## 教訓（ルールとして残す）」節が見つかりません');
  process.exit(1);
}

const lessons = [...section.matchAll(/^### \d+\.\s*(.+)$/gm)].map((m) => m[1].trim());
if (lessons.length === 0) {
  console.error('教訓が1件も抽出できませんでした。見出しの形式が変わった可能性があります');
  process.exit(1);
}

const missing = lessons.filter((l) => !claude.includes(l));

for (const l of lessons) {
  console.log(`  ${missing.includes(l) ? '✗' : '✓'} ${l}`);
}

if (missing.length) {
  console.error(
    `\nCLAUDE.md に届いていない教訓が ${missing.length} 件あります。\n` +
      '教訓を追加したら CLAUDE.md にも要約を入れてください。\n' +
      '（参照ではなく要約を埋め込むのは、リンク先を読むかどうかに依存させないため）',
  );
  process.exit(1);
}

console.log(`\n教訓 ${lessons.length} 件すべてが CLAUDE.md に届いています`);
