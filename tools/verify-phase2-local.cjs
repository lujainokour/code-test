/* Browser-free only. Stop at the first non-browser failure; never launches Chrome. */
const fs = require('node:fs'), path = require('node:path'), cp = require('node:child_process');
const root = path.resolve(__dirname, '..'); process.chdir(root);
const result = { phase: 2, browser: 'NOT RUN: the single authorized normal-permission launch failed during Phase 1 closure. No retry.', suites: [], syntax: { files: 0, failures: [] }, staticReferences: null };
function record() { fs.writeFileSync('docs/phase2-results.json', JSON.stringify(result, null, 2) + '\n'); }
function fail(message) { result.failure = message; record(); console.error(message); process.exit(1); }
for (const file of fs.readdirSync('tests').filter(file => file.endsWith('.cjs')).sort()) {
    const run = cp.spawnSync(process.execPath, [path.join('tests', file)], { encoding: 'utf8' });
    const suite = { suite: file, exitCode: run.status, passed: run.stdout.split('\n').filter(line => line.startsWith('PASS ')).length, stdout: run.stdout, stderr: run.stderr };
    result.suites.push(suite); console.log(`${file}: ${suite.passed} passed; exit ${suite.exitCode}`);
    if (run.status !== 0) { console.error(run.stdout, run.stderr); fail('Non-browser suite failed. Stopped without further tests or repairs.'); }
}
function walk(dir) {
    for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
        const file = path.join(dir, item.name);
        if (item.isDirectory()) walk(file);
        else if (file.endsWith('.js')) {
            const run = cp.spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' }); result.syntax.files++;
            if (run.status !== 0) { result.syntax.failures.push({ file, error: run.stderr }); fail('Syntax check failed: ' + file); }
        }
    }
}
walk('js'); console.log(`Syntax: ${result.syntax.files} files; 0 failures`);
const references = new Set(), routes = Object.values(JSON.parse(fs.readFileSync('docs/page-routes.json', 'utf8')));
result.staticReferences = { scope: 'Declared HTML href/src/action/poster only; no runtime DOM, browser errors or image decoding.', routes: routes.length, references: 0, missing: [] };
for (const route of routes) {
    for (const match of fs.readFileSync(route, 'utf8').matchAll(/\b(?:href|src|action|poster)\s*=\s*["']([^"']+)["']/gi)) {
        const raw = match[1]; if (raw.startsWith('#') || /^(?:data:|blob:|mailto:|tel:|javascript:)/i.test(raw)) continue;
        const url = new URL(raw, 'http://local.test/' + route); if (url.origin !== 'http://local.test') continue;
        const file = decodeURIComponent(url.pathname).replace(/^\//, ''), resolved = path.resolve(root, file); references.add(file);
        if (!resolved.startsWith(root + path.sep) || !fs.existsSync(resolved)) { result.staticReferences.missing.push({ route, file }); fail('Static reference missing: ' + file); }
    }
}
result.staticReferences.references = references.size;
console.log(`Static HTML references: ${references.size}; missing: 0`);
result.totalPassed = result.suites.reduce((sum, suite) => sum + suite.passed, 0); result.failures = 0; record();
console.log(`${result.totalPassed} assertions passed in ${result.suites.length} suites. Browser verification remains pending.`);
