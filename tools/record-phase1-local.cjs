const fs = require('node:fs'), crypto = require('node:crypto');
const source = [
    'README.md', 'index.html', 'css/learning-language.css',
    'js/admin-course-create.js', 'js/admin-level-content.js', 'js/code-review.js', 'js/dashboard.js',
    'js/language-catalog.js', 'js/languages.js', 'js/learning-context.js', 'js/learning-path.js',
    'js/learning-report.js', 'js/learning-storage.js', 'js/learning-language.js', 'js/learning-support.js',
    'js/lesson-content.js', 'js/lesson.js', 'js/level-assessment.js', 'js/mentor.js', 'js/module.js',
    'js/module-challenge.js', 'js/onboarding.js', 'js/placement-intro.js', 'js/placement-review.js',
    'js/platform-store.js', 'js/portfolio-publishing.js', 'js/practice.js', 'js/profile.js', 'js/progress.js',
    'js/project.js', 'js/python-curriculum.js', 'js/student-journey.js', 'js/workspace.js',
    'js/workspace-completion.js', 'js/curriculum-registry.js', 'js/javascript-runner.js',
    'js/javascript-worker.js', 'js/curricula/python.js', 'js/curricula/javascript.js',
    'pages/admin/admin-level-content.html', 'tools/curriculum-summary.cjs', 'tools/record-phase1-local.cjs', 'tools/verify-phase1-local.cjs',
    'tests/language-storage.cjs', 'tests/curriculum-migration.cjs', 'tests/language-publishing.cjs',
    'tests/language-page-guards.cjs', 'tests/language-switch-browser.ps1',
    'docs/CURRENT-IMPLEMENTATION.md', 'docs/WORKFLOWS-AND-USER-MAP.md',
    'docs/LEARNING-UPGRADE.md', 'docs/PHASE-1.md'
];
source.push(...fs.readdirSync('pages/student').filter(file => file.endsWith('.html')).map(file => 'pages/student/' + file));
const artifacts = [
    'docs/phase1-current-results.json', 'docs/language-switch-results.json',
    'docs/phase1-initial-language-results.json', 'docs/phase1-local-results.json',
    'docs/phase1-2026-11-11-reference-results.json', 'docs/phase1-2026-11-11-js-errors.json',
    'docs/archive/phase1/phase1-before-copy-fix-1440.png', 'docs/archive/phase1/phase1-before-copy-fix-390.png', 'docs/phase1-files.json',
    'docs/phase1-closure-results.json', 'docs/phase1-git-status.txt', 'docs/phase1-git-diff-stat.txt'
];
const records = [...new Set(source)].sort().map(file => ({ file, sha256: crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex') }));
fs.writeFileSync('docs/phase1-files.json', JSON.stringify({
    phase: 1, status: 'browser recheck pending manual verification; user authorized a conditional commit and continuation', baselineCommit: 'b68a34b',
    note: 'The working tree already contained unrelated uncommitted work. This manifest lists Phase 1 source files and their current hashes; it is not a claim that all pre-existing changes belong to this phase. This local recording tool only reads source and writes this manifest; it never stages or commits files.',
    files: records, artifacts
}, null, 2) + '\n');
console.log(`Recorded ${records.length} source files and ${artifacts.length} artifacts; final browser verification is pending.`);
