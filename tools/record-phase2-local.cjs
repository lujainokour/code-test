/* Records explicit Phase 2 files only. Does not stage or commit. */
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), cp = require('node:child_process');
process.chdir(path.resolve(__dirname, '..'));
const sources = ['README.md', 'docs/CURRENT-IMPLEMENTATION.md', 'docs/WORKFLOWS-AND-USER-MAP.md', 'docs/PLACEMENT-RULES.md', 'docs/PHASE-2.md',
    ...['dashboard', 'learning-context', 'learning-path', 'learning-report', 'learning-storage', 'module', 'placement-data', 'placement-intro', 'placement-question', 'placement-results', 'placement-review', 'python-curriculum', 'skill-analysis', 'placement-banks', 'placement-engine', 'placement-store'].map(name => 'js/' + name + '.js'),
    ...['career', 'certificates', 'code-review', 'dashboard', 'learning-path', 'learning-report', 'lesson', 'level-assessment', 'local-portfolio', 'messages', 'module', 'onboarding', 'placement-intro', 'placement-question', 'placement-results', 'placement-review', 'practice', 'progress', 'project-evaluation', 'project', 'requests', 'skill-analysis', 'subscription', 'virtual-internship', 'workspace'].map(name => 'pages/student/' + name + '.html'),
    'tests/placement-fixture.js', 'tests/placement-policy.cjs', 'tests/placement-store.cjs', 'tools/curriculum-summary.cjs', 'tools/verify-phase2-local.cjs', 'tools/record-phase2-local.cjs'];
function git(args) { const run = cp.spawnSync('git', args, { encoding: 'utf8' }); if (run.status !== 0) throw Error(run.stderr); return run.stdout; }
fs.writeFileSync('docs/phase2-git-status.txt', git(['status', '--short']));
fs.writeFileSync('docs/phase2-git-diff-stat.txt', git(['diff', '--stat']));
const artifacts = ['docs/phase2-results.json', 'docs/phase2-protected-baseline.json', 'docs/phase2-git-status.txt', 'docs/phase2-git-diff-stat.txt', 'docs/phase2-files.json'];
const manifest = { phase: 2, baselineCommit: git(['rev-parse', 'HEAD']).trim(), browserVerification: 'pending manual verification', files: sources.map(file => ({ file, sha256: crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex') })), artifacts };
fs.writeFileSync('docs/phase2-files.json', JSON.stringify(manifest, null, 2) + '\n');
console.log(`${sources.length} explicit Phase 2 source/doc/test files, ${artifacts.length} artifacts. Nothing staged.`);
