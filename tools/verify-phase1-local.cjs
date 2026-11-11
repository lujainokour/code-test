/* Browser-free checks only. Never launches Chrome or changes permissions. */
const fs = require('node:fs'), path = require('node:path'), cp = require('node:child_process');
const root = path.resolve(__dirname, '..');
process.chdir(root);
const suites = fs.readdirSync('tests').filter(file => file.endsWith('.cjs')).sort().map(file => {
    const run = cp.spawnSync(process.execPath, [path.join('tests', file)], { encoding: 'utf8' });
    return { suite: file, exitCode: run.status, passed: run.stdout.split('\n').filter(line => line.startsWith('PASS ')).length, stdout: run.stdout, stderr: run.stderr };
});
const syntax = [];
function walk(dir) {
    for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
        const file = path.join(dir, item.name);
        if (item.isDirectory()) walk(file);
        else if (file.endsWith('.js')) { const run = cp.spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' }); syntax.push({ file, exitCode: run.status, error: run.stderr }); }
    }
}
walk('js');
const references = new Set(), missing = [], routes = Object.values(JSON.parse(fs.readFileSync('docs/page-routes.json', 'utf8')));
for (const route of routes) {
    const text = fs.readFileSync(route, 'utf8');
    for (const match of text.matchAll(/\b(?:href|src|action|poster)\s*=\s*["']([^"']+)["']/gi)) {
        const raw = match[1];
        if (raw.startsWith('#') || /^(?:data:|blob:|mailto:|tel:|javascript:)/i.test(raw)) continue;
        const url = new URL(raw, 'http://local.test/' + route);
        if (url.origin !== 'http://local.test') continue;
        const file = decodeURIComponent(url.pathname).replace(/^\//, '');
        const resolved = path.resolve(root, file);
        references.add(file);
        if (!resolved.startsWith(root + path.sep) || !fs.existsSync(resolved)) missing.push({ route, file });
    }
}
const currentSuites = ['learning-upgrade', 'learning-support', 'site-fixes', 'submission-completion', 'kahoot-challenge', 'user-guide', 'certificates', 'services-input', 'services-arrival', 'footer-visual'];
const result = {
    browserAttempt: { attempts: 1, permissions: 'normal only', command: 'powershell -NoProfile -ExecutionPolicy Bypass -File tests/language-switch-browser.ps1', startedChecks: 0, outcome: 'Chrome did not create DevToolsActivePort; no retry or permission change attempted.' },
    pendingManualVerification: ['Python and JavaScript level summary at 1440px and 390px', 'Dashboard and learning-path My language selector at 1440px and 390px', 'Cross-tab account/language change, back/forward and focus guard in the browser'],
    notRun: { currentSuites: currentSuites.map(suite => ({ suite, reason: 'Requires Chrome/CDP; not a browser-free test.' })), referenceAudit: 'Dynamic CDP reference audit not run; static HTML reference check below is a separate, narrower check.' },
    suites, syntax: { files: syntax.length, failures: syntax.filter(item => item.exitCode !== 0) },
    staticReferences: { scope: 'Declared HTML href/src/action/poster in the route manifest only; no runtime DOM, image decoding or JavaScript error checking.', routes: routes.length, references: references.size, missing }
};
fs.writeFileSync('docs/phase1-closure-results.json', JSON.stringify(result, null, 2) + '\n');
for (const suite of suites) console.log(`${suite.suite}: ${suite.passed} passed; exit ${suite.exitCode}`);
console.log(`Syntax: ${syntax.length} files; ${result.syntax.failures.length} failures`);
console.log(`Static HTML references: ${references.size}; missing: ${missing.length}`);
if (suites.some(suite => suite.exitCode !== 0) || result.syntax.failures.length || missing.length) { console.error('Non-browser verification failed. Stop before further work.'); process.exitCode = 1; }
