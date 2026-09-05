/**
 * AI 駆動開発の実践を計測する（development-process.md の「計測」、Issue #79）。
 *
 * **このリポジトリは AI 駆動開発の実践例を兼ねている**（CLAUDE.md）。
 * 動いたコードだけでなく、**どう進んだか**が成果物である。
 *
 * ## 出典は GitHub API だけ
 *
 * PR・Issue・workflow run から取る。**値をファイルに残さない。**
 * API が履歴そのものなので、走らせ直せば同じ数が出る。
 * 生成物をコミットしない（原則1）のと同じ扱いにする。
 *
 * ## 機械で取れないもの
 *
 * **「人間が介入した理由」は取れない。** 回数は
 * `Co-Authored-By: Claude` を持たないコミットとして数えられるが、
 * なぜ介入したかはコミットメッセージを人が読むしかない。
 * **回数だけ出し、理由は取れないと申告する。**（教訓5）
 *
 * ## 「落ちた」と「動かなかった」を混ぜない
 *
 * 2026-08-26 の Actions 障害では、run が作られない PR と `queued` のまま
 * 固まる PR が実際に出た。**これを失敗として数えると最重要指標が歪む。**
 * `未実行` を独立した区分として出す。
 */
import { execFileSync } from 'node:child_process';

const REPO = 'shun2218-dev/sashigane';

const gh = (args) => JSON.parse(execFileSync('gh', args, { encoding: 'utf8', maxBuffer: 32 << 20 }));

/**
 * マージ済みの PR。**リリース PR も取るが、集計には入れない**（Issue #180）。
 *
 * リリース PR（`base === 'main'`）の中身は、**すでに個別の PR で数えたコミット
 * そのもの**である。同じ枠で数えると、コミットが二重に数えられ、マージコミットが
 * 「人手」に化け、先頭コミットが古すぎて CI の分類も外れる。
 *
 * **「落ちた」と「動かなかった」を混ぜないのと同じ形である**（development-process.md）。
 * 混ぜずに、別の節へ並べる。**黙って外さない。**
 *
 * **一覧では commits を取らない。** GraphQL が PR 数 × コミット数 × 著者数まで
 * 展開しようとして上限に当たる（実測）。1本ずつ取り直す。
 */
const pulls = gh([
  'pr',
  'list',
  '--repo',
  REPO,
  '--state',
  'merged',
  '--limit',
  '200',
  '--json',
  'number,title,createdAt,mergedAt,baseRefName,headRefName,body',
]).map((pr) => ({
  ...pr,
  ...gh(['pr', 'view', String(pr.number), '--repo', REPO, '--json', 'commits,reviews']),
}));

/** `Closes #12` / `closes #12`。無ければ Issue に紐づいていない PR である */
const closedIssue = (body) => Number(/(?:closes|fixes|resolves)\s+#(\d+)/i.exec(body ?? '')?.[1]);

const issueCache = new Map();
const issueCreatedAt = (n) => {
  if (!issueCache.has(n)) {
    try {
      issueCache.set(n, gh(['issue', 'view', String(n), '--repo', REPO, '--json', 'createdAt']).createdAt);
    } catch {
      issueCache.set(n, null);
    }
  }
  return issueCache.get(n);
};

/**
 * 初回コミットに対する CI の結果。
 *
 * **run が無い場合と落ちた場合を区別する。** 障害で run が作られないことが実際にあった。
 */
/*
 * **`--paginate` は1ページごとに JSON を吐く。** `--jq` と併せると配列が並んだ
 * 壊れた JSON になるので、`--slurp` でページの配列として受け取ってから畳む
 */
const runs = gh(['api', `repos/${REPO}/actions/runs?per_page=100`, '--paginate', '--slurp'])
  .flatMap((page) => page.workflow_runs)
  .map(({ head_sha, head_branch, status, conclusion, id, created_at }) => ({
    head_sha,
    head_branch,
    status,
    conclusion,
    id,
    created_at,
  }));
/** CI が導入された時刻。これより前の PR は「動かなかった」のではなく「まだ無かった」 */
const ciBornAt = (() => {
  const commits = gh([
    'api',
    `repos/${REPO}/commits?path=.github/workflows/ci.yml&per_page=100`,
    '--paginate',
    '--slurp',
  ]).flat();
  return commits.at(-1)?.commit?.committer?.date ?? null;
})();

/**
 * その PR の初回コミットに対する CI の結果。
 *
 * **sha だけで引かない。** 同じコミットに複数の PR がぶら下がることが実際にあった
 * （`chore/branch-strategy` は develop 宛と main 宛の2本を同時に開いており、
 * main 宛だけが `branch-flow` で落ちている）。**取り違えると最重要指標が汚れる。**
 * ブランチ名でも絞り、それでも複数残って結論が割れるなら**判定不能として出す。**
 */
const firstCommitCi = (pr, sha) => {
  const rs = runs
    .filter((r) => r.head_sha === sha && r.head_branch === pr.headRefName)
    .sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));

  if (rs.length === 0) {
    if (ciBornAt && Date.parse(pr.mergedAt) < Date.parse(ciBornAt)) {
      return { kind: 'CI 導入前' };
    }
    return { kind: '未実行', detail: 'run が作られていない' };
  }
  const stuck = rs.find((r) => r.status !== 'completed');
  if (stuck) return { kind: '未実行', detail: `${stuck.status} のまま` };

  const conclusions = new Set(rs.map((r) => r.conclusion));
  if (conclusions.size > 1) {
    return { kind: '判定不能', detail: '同じコミットに複数の PR がぶら下がっている' };
  }
  // **最初の試行を見る。** 直したあとの再実行で成功しても「初回は通らなかった」
  const first = rs[0];
  if (first.conclusion === 'success') return { kind: '成功' };
  if (first.conclusion === 'failure') return { kind: '失敗', detail: failedStep(first.id) };
  return { kind: '未実行', detail: String(first.conclusion) };
};

/**
 * 落ちた段階の名前をそのまま分類に使う。
 *
 * **ログを読まない。** `ci.yml` の step 名が既に意味を持っている
 * （`typecheck` / `test` / `トークンの使い方` / `決定文書との一致` …）。
 * 分類表を別に持つと、CI を変えたときにずれる。
 */
const failedStep = (runId) => {
  try {
    const jobs = gh(['api', `repos/${REPO}/actions/runs/${runId}/jobs`, '--jq', '[.jobs[]]']);
    for (const job of jobs) {
      const step = job.steps?.find((s) => s.conclusion === 'failure');
      if (step) return step.name;
    }
  } catch {
    /* ジョブが消えている（保持期間切れ）。分類できないことを隠さない */
  }
  return '不明';
};

/** エージェントが書いていないコミット。**理由は取れない**ので数だけ */
const humanCommits = (commits) =>
  commits.filter((c) => !/Co-Authored-By:\s*Claude/i.test(c.messageBody ?? ''));

/**
 * `gh pr view --json commits` は **100 件で切る。**
 *
 * 切られたことは戻り値に現れない。**ちょうど 100 なら切られたと見なす。**
 * 本当に 100 だった場合も「切られたかもしれない」と出るが、
 * **切られたのに気づかないより良い**（教訓2）。
 */
const COMMIT_PAGE_LIMIT = 100;
const maybeTruncated = (commits) => commits.length === COMMIT_PAGE_LIMIT;

const rows = pulls
  .map((pr) => {
    const first = pr.commits[0];
    const issue = closedIssue(pr.body);
    const opened = issue ? issueCreatedAt(issue) : null;
    return {
      number: pr.number,
      base: pr.baseRefName,
      head: pr.headRefName,
      issue,
      leadHours: opened ? (Date.parse(pr.mergedAt) - Date.parse(opened)) / 3_600_000 : null,
      reviews: pr.reviews.length,
      commits: pr.commits.length,
      truncated: maybeTruncated(pr.commits),
      human: humanCommits(pr.commits).length,
      ci: first ? firstCommitCi(pr, first.oid) : { kind: '未実行', detail: 'コミットが取れない' },
      title: pr.title,
    };
  })
  .sort((a, b) => a.number - b.number);

/* ============================================================
   出力
   ============================================================ */

const pct = (n, d) => (d === 0 ? '—' : `${((n / d) * 100).toFixed(0)}%`);
const hours = (h) => (h === null ? '—' : h < 48 ? `${h.toFixed(1)}h` : `${(h / 24).toFixed(1)}d`);

/**
 * **リリース PR は作業 PR ではない**（Issue #180）。
 *
 * develop に積んだものをまとめて `main` へ移す操作であり、
 * 中身は**すでに個別の PR で数えたコミット**である。同じ表に混ぜると、
 * 数としては出るのに**何を数えているかが変わる。**
 *
 * **base だけで判定しない。** ブランチ戦略ができる前は作業ブランチが直接 `main` を
 * 向いていた（#2 #4 #6 #8。branching.md の「経緯」）。**あれは作業 PR である。**
 * base で切ると、リポジトリで最初に書かれた4本が集計から消える。
 *
 * head で見る。`release/vX.Y.Z`（決定4-7）と、それ以前の形である `develop` の2つ。
 */
const RELEASE_HEAD = /^(develop|release\/v\d+\.\d+\.\d+)$/;
const isRelease = (r) => r.base === 'main' && RELEASE_HEAD.test(r.head);
const work = rows.filter((r) => !isRelease(r));
const releases = rows.filter(isRelease);

console.log(`# sashigane の開発計測（作業 PR ${work.length} 本）\n`);

console.log('| PR | Issue | リードタイム | 自己レビュー | コミット | 人手 | 初回コミットの CI |');
console.log('|---|---|---|---|---|---|---|');
for (const r of work) {
  console.log(
    `| #${r.number} | ${r.issue ? `#${r.issue}` : '—'} | ${hours(r.leadHours)} | ${r.reviews} | ${r.commits} | ${r.human} | ${r.ci.kind}${r.ci.detail ? `（${r.ci.detail}）` : ''} |`,
  );
}

const ran = work.filter((r) => r.ci.kind === '成功' || r.ci.kind === '失敗');
const passed = ran.filter((r) => r.ci.kind === '成功');
const excluded = work.length - ran.length;
const withIssue = work.filter((r) => r.leadHours !== null);
const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length === 0 ? null : s[Math.floor(s.length / 2)];
};

console.log('\n## 集計\n');
console.log(
  `**エージェントの初回コミットが CI を通った割合: ${pct(passed.length, ran.length)}**` +
    `（${passed.length} / ${ran.length}）`,
);
console.log(
  '\n  ※ **この数が測っているのは「push 前に検査を走らせているか」である。**' +
    '\n     CI が走らせるのは手元と同じ検査（pnpm test / typecheck / check:*）なので、' +
    '\n     全部緑にしてから push すれば通るのは半ば同語反復である。' +
    '\n     **「正しいコードを書けるか」は測っていない。** それを測るには、' +
    '\n     手元で検出できない失敗（実ブラウザの見え方、視覚回帰）を CI が持つ必要がある',
);
{
  const why = new Map();
  for (const r of work.filter((x) => !ran.includes(x))) {
    why.set(r.ci.kind, (why.get(r.ci.kind) ?? 0) + 1);
  }
  console.log(
    `  ※ 母数から ${excluded} 本を除いている（${[...why].map(([k, n]) => `${k} ${n}`).join(' / ')}）。` +
      '\n     **落ちたのではなく動かなかった**ものを失敗に数えると、この指標が歪む',
  );
}
console.log(`\nリードタイム（Issue 作成 → マージ）の中央値: ${hours(median(withIssue.map((r) => r.leadHours)))}`);
console.log(`  Issue に紐づいた PR: ${withIssue.length} / ${work.length} 本`);
{
  const zero = work.filter((r) => r.reviews === 0);
  console.log(`\n自己レビューの回数: 中央値 ${median(work.map((r) => r.reviews))}`);
  console.log(
    `  ※ 数えているのは**レビュー投稿の件数**であって、レビュー → 修正の往復回数ではない。` +
      '\n     開発者が1人で「1回投稿 → 修正コミット」という運用なので近い値になっている。' +
      '\n     **人が増えたら意味が変わる**',
  );
  if (zero.length) {
    console.log(`\n  自己レビューが 0 回の PR（${zero.length} 本）:`);
    for (const r of zero) console.log(`    #${r.number}  ${r.title}`);
    console.log(
      '    ※ **違反かどうかは判定しない。** 手順5 は「実装したら自己レビューする」であり、' +
        '\n      実装でない PR（Issue を立てる、記録を紐づける）もある。**読む人が決める**',
    );
  }
}

const failures = ran.filter((r) => r.ci.kind === '失敗');
console.log(`\n## CI 失敗の原因（${failures.length} 件）\n`);
if (failures.length === 0) {
  /*
   * **「0 件」を成功として出さない**（教訓2）。分類器が動いていないのか、
   * 本当に落ちていないのかを区別する。履歴の中から落ちた run を1つ拾い、
   * 分類器を当てて**発火することを確かめてから**0 件と言う。
   */
  const anyFailure = runs.find((r) => r.conclusion === 'failure');
  if (!anyFailure) {
    console.log('  無し（**リポジトリの履歴に落ちた run が1つも無く、分類器は一度も動かしていない**）');
  } else {
    const step = failedStep(anyFailure.id);
    console.log(`  初回コミットでは無し。`);
    console.log(
      `  陰性対照: 履歴の落ちた run（${anyFailure.head_branch}）に分類器を当てると「${step}」。` +
        (step === '不明'
          ? '\n  **分類できていない。0 件という結果は信用できない**'
          : '\n  **分類器は動いている。** そのうえでの 0 件である'),
    );
  }
} else {
  const byStep = new Map();
  for (const r of failures) byStep.set(r.ci.detail, (byStep.get(r.ci.detail) ?? 0) + 1);
  for (const [step, n] of [...byStep].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(n).padStart(2)} 件  ${step}`);
  }
  console.log('\n  ※ 分類は ci.yml の step 名そのもの。**分類表を別に持たない**（持つとずれる）');
}

/**
 * **外したものを黙って消さない。** 何本を、なぜ外したかを出す。
 *
 * リリース PR は「作業が速かった／遅かった」を語らない。語るのは
 * **1回のリリースにどれだけ積んだか**だけなので、その1列だけを出す。
 */
console.log(`\n## リリース PR（集計から外している ${releases.length} 本）\n`);
if (releases.length === 0) {
  console.log('  無し。**まだ `main` へ入れていない**');
} else {
  console.log('| PR | 積んだコミット | 自己レビュー |');
  console.log('|---|---|---|');
  for (const r of releases) {
    console.log(`| #${r.number} | ${r.commits}${r.truncated ? ' 以上' : ''} | ${r.reviews} |`);
  }
  console.log(
    '\n  ※ **中身は個別の PR で既に数えたコミットである。** 同じ枠に入れると' +
      '\n     コミットが二重に数えられ、マージコミットが「人手」に化け、' +
      '\n     先頭コミットが古すぎて CI の分類も外れる（Issue #180）',
  );
  if (releases.some((r) => r.truncated)) {
    console.log(
      `  ※ 「以上」は **API が ${COMMIT_PAGE_LIMIT} 件で切っている**ことを表す。` +
        '\n     切られたことは戻り値に現れないので、ちょうど上限のときはそう出す',
    );
  }
}

console.log(`\n## 人手のコミット\n`);
const humanTotal = work.reduce((a, r) => a + r.human, 0);
console.log(`  ${humanTotal} 件 / 作業 PR の ${work.reduce((a, r) => a + r.commits, 0)} コミット`);
console.log('  ※ `Co-Authored-By: Claude` を持たないコミットを数えている。');
console.log('  **理由は機械では取れない。** 知りたい場合はコミットメッセージを読むこと');
console.log(
  '  ※ **リポジトリ全体のコミット数ではない。** PR ごとの数の総和である。' +
    '\n     リリース PR を混ぜると同じコミットを二度数えるので、外してある（Issue #180）',
);
