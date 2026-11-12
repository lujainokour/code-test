/* Company workspace pages are guarded like student and admin pages: a guest is sent to
   pages/auth/company-login.html with a return target, and a signed-in company still opens them. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('js/access-guard.js', 'utf8');
const base = 'http://localhost:8765/app/';
const student = JSON.stringify({ role: 'student', isDemo: true, name: 'Student', email: 'student@example.com' });
const company = JSON.stringify({ role: 'company', isDemo: true, name: 'Company workspace', email: 'company@example.com' });
const pages = fs.readdirSync('pages/company').filter(file => /^company-[a-z0-9-]+\.html$/.test(file));
let count = 0;
function check(name, body) { body(); count++; console.log('PASS ' + name); }
function run(page, { profile = null, employer = null } = {}) {
    const events = {};
    const location = { href: base + page, replace(url) { this.redirect = url; } };
    const style = { removeProperty(key) { delete this[key]; } };
    const window = { cmStorage: { getItem() { return profile; } }, addEventListener(type, listener) { events[type] = listener; } };
    vm.runInNewContext(source, { URL, location, document: { currentScript: { src: base + 'js/access-guard.js' }, documentElement: { style } },
        localStorage: { getItem() { return employer; } }, sessionStorage: { getItem() { return null; } }, window });
    return { window, location, style, events, setEmployer(value) { employer = value; } };
}

check('All six company workspace pages are covered', () => assert.equal(pages.length, 6));
for (const page of pages) {
    check(`Guest is sent to company sign-in from ${page}, with a return target`, () => {
        const { location, style } = run(`pages/company/${page}?tab=open#top`);
        const url = new URL(location.redirect);
        assert.equal(url.pathname, '/app/pages/auth/company-login.html');
        assert.equal(url.searchParams.get('next'), `pages/company/${page}?tab=open#top`);
        assert.equal(style.visibility, 'hidden');
    });
    check(`A signed-in company still opens ${page}`, () => {
        const { location, window } = run(`pages/company/${page}`, { employer: company });
        assert.equal(location.redirect, undefined);
        assert.equal(window.cmAccess.check(), true);
    });
}
check('A student session alone does not open the company workspace', () => {
    const { location } = run('pages/company/company-dashboard.html', { profile: student });
    assert.equal(new URL(location.redirect).pathname, '/app/pages/auth/company-login.html');
});
check('Signing out of the company in another tab re-checks and redirects', () => {
    const view = run('pages/company/company-dashboard.html', { employer: company });
    view.setEmployer(null); view.events.storage({ key: 'codementor-company-session' });
    assert.equal(new URL(view.location.redirect).pathname, '/app/pages/auth/company-login.html');
});
check('Student and admin guarding is unchanged', () => {
    assert.equal(new URL(run('pages/student/dashboard.html').location.redirect).pathname, '/app/pages/auth/login.html');
    assert.equal(new URL(run('pages/admin/admin-dashboard.html').location.redirect).pathname, '/app/pages/auth/admin-login.html');
    assert.equal(run('index.html').location.redirect, undefined);
    assert.equal(run('pages/auth/company-login.html').location.redirect, undefined);
});
check('Every company page loads the guard in <head>, before rendering, with a no-JavaScript fallback', () => {
    for (const page of pages) {
        const html = fs.readFileSync(`pages/company/${page}`, 'utf8');
        const guard = html.indexOf('<script src="../../js/access-guard.js"></script>');
        assert.ok(guard > html.indexOf('platform-store.js') && guard < html.indexOf('</head>') && guard < html.indexOf('company-workspace.js'), page);
        assert.ok(html.includes('<noscript><meta http-equiv="refresh" content="0;url=../auth/company-login.html">'), page + ' noscript');
    }
});
check('After company sign-in, only a company workspace page can be the return target', () => {
    const js = fs.readFileSync('js/demo-account.js', 'utf8');
    const match = js.match(/location\.href = next && (\/\^pages.*?\$\/)\.test\(next\)/);
    assert.ok(match, 'return-target check present');
    const pattern = vm.runInNewContext(match[1]);
    for (const ok of ['pages/company/company-jobs.html', 'pages/company/company-talent.html?skill=python#list']) assert.ok(pattern.test(ok), ok);
    for (const bad of ['https://evil.example/pages/company/company-jobs.html', '//evil.example/x', 'pages/admin/admin-dashboard.html', 'pages/company/../admin/admin-dashboard.html', 'javascript:alert(1)'])
        assert.ok(!pattern.test(bad), bad);
    assert.match(js, /const next = role === "company" \? new URLSearchParams\(location\.search\)\.get\("next"\) : null;/);
});
check('Company dashboard: accurate wording and empty states for empty lists', () => {
    const html = fs.readFileSync('pages/company/company-dashboard.html', 'utf8');
    assert.ok(!/verified university/i.test(html));
    assert.ok(!/verified university/i.test(fs.readFileSync('pages/auth/company-login.html', 'utf8')));
    assert.ok(!/All Verified Skills/.test(fs.readFileSync('pages/company/company-talent.html', 'utf8')));
    const js = fs.readFileSync('js/company-workspace.js', 'utf8');
    for (const root of ['activeJobsRoot', 'recentAppsRoot', 'talentPreviewRoot'])
        assert.match(js, new RegExp(`if \\(!${root}\\.children\\.length\\) ${root}\\.innerHTML = \`<p class="workspace-empty">`), root);
    assert.match(js, /profile\.name\?\.trim\(\) \? `Welcome back, \$\{profile\.name\}` : "Welcome back"/);
});
console.log(`${count} company guard checks passed.`);
