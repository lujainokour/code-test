/*
 * Browser-free verification for the whole site. Never launches a browser.
 *   node tools/verify-local.cjs                 run everything, print a summary
 *   node tools/verify-local.cjs --record NAME    also write docs/evidence/NAME.json
 *   node tools/verify-local.cjs --tracked       also fail if an HTML reference is not tracked by Git
 * Stops at the first failure (non-zero exit).
 */
const fs = require('node:fs'), path = require('node:path'), cp = require('node:child_process');
const root = path.resolve(__dirname, '..'); process.chdir(root);
const args = process.argv.slice(2);
const recordName = args.includes('--record') ? args[args.indexOf('--record') + 1] : null;
const checkTracked = args.includes('--tracked');
const result = { generatedAt: new Date().toISOString(), browser: 'NOT RUN by this tool', suites: [], syntax: { files: 0, failures: [] }, references: null };

function record() {
    if (!recordName) return;
    fs.mkdirSync('docs/evidence', { recursive: true });
    fs.writeFileSync(path.join('docs/evidence', recordName + '.json'), JSON.stringify(result, null, 2) + '\n');
}
function fail(message) { result.failure = message; record(); console.error('FAIL: ' + message); process.exit(1); }

// 1. Node/VM suites
for (const file of fs.readdirSync('tests').filter(f => f.endsWith('.cjs')).sort()) {
    const run = cp.spawnSync(process.execPath, [path.join('tests', file)], { encoding: 'utf8' });
    const lines = run.stdout.split(/\r?\n/);
    const suite = { suite: file, exitCode: run.status, passed: lines.filter(l => l.startsWith('PASS ')).length, failed: lines.filter(l => l.startsWith('FAIL ')).length };
    result.suites.push(suite);
    console.log(`${file}: ${suite.passed} passed, ${suite.failed} failed; exit ${suite.exitCode}`);
    if (run.status !== 0) { console.error(run.stdout.slice(-4000), run.stderr.slice(-4000)); fail('Suite failed: ' + file); }
}

// 2. Syntax check of every production script
(function walk(dir) {
    for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
        const file = path.join(dir, item.name);
        if (item.isDirectory()) walk(file);
        else if (file.endsWith('.js')) {
            const run = cp.spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' }); result.syntax.files++;
            if (run.status !== 0) { result.syntax.failures.push({ file, error: run.stderr }); fail('Syntax check failed: ' + file); }
        }
    }
})('js');
console.log(`Syntax: ${result.syntax.files} files, 0 failures`);

// 3. Static reference audit: every HTML page in the repo (not only routed ones)
let tracked = null;
if (checkTracked) {
    const ls = cp.spawnSync('git', ['ls-files', '-z'], { encoding: 'utf8' });
    if (ls.status !== 0) fail('--tracked needs a Git checkout');
    tracked = new Set(ls.stdout.split('\0').filter(Boolean));
}
const pages = [];
(function walkHtml(dir) {
    for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
        if (['node_modules', '.git', 'vendor', 'tests'].includes(item.name)) continue;
        const file = path.join(dir, item.name);
        if (item.isDirectory()) walkHtml(file);
        else if (file.endsWith('.html')) pages.push(file.split(path.sep).join('/'));
    }
})('.');
const refs = new Set(), missing = [], untracked = [];
for (const page of pages) {
    const html = fs.readFileSync(page, 'utf8');
    for (const match of html.matchAll(/\b(?:href|src|action|poster)\s*=\s*["']([^"']+)["']/gi)) {
        const raw = match[1];
        if (raw.startsWith('#') || raw.includes('${') || /^(?:data:|blob:|mailto:|tel:|javascript:)/i.test(raw)) continue;
        const url = new URL(raw, 'http://local.test/' + page.replace(/^\.\//, ''));
        if (url.origin !== 'http://local.test') continue;
        const file = decodeURIComponent(url.pathname).replace(/^\//, '');
        refs.add(file);
        const resolved = path.resolve(root, file);
        if (!resolved.startsWith(root + path.sep) || !fs.existsSync(resolved)) missing.push({ page, file });
        else if (tracked && !tracked.has(file)) untracked.push({ page, file });
    }
}
result.references = { scope: 'Declared href/src/action/poster in every repo HTML page (excluding tests/ and vendor/). No runtime DOM.', pages: pages.length, unique: refs.size, missing, untracked: tracked ? untracked : 'not checked' };
console.log(`References: ${pages.length} pages, ${refs.size} unique, ${missing.length} missing` + (tracked ? `, ${untracked.length} untracked` : ''));
if (missing.length) { console.error(missing.slice(0, 20)); fail('Missing references'); }
if (untracked.length) { console.error(untracked.slice(0, 20)); fail('Referenced files not tracked by Git'); }

result.totalPassed = result.suites.reduce((s, x) => s + x.passed, 0);
result.totalFailed = 0;
record();
console.log(`OK: ${result.totalPassed} assertions passed in ${result.suites.length} suites. Browser checks not run.`);
