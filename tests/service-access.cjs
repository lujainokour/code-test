const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('js/access-guard.js', 'utf8');
const base = 'http://localhost:8765/app/';
const student = { role: 'student', isDemo: true, name: 'Student', email: 'student@example.com' };
const company = { role: 'company', isDemo: true, name: 'Company', email: 'company@example.com' };
let count = 0;
function run(page, profile = null, employer = null, unavailable = false) {
    const events = {};
    const location = { href: base + page, replace(url) { this.redirect = url; } };
    const style = { removeProperty(key) { delete this[key]; } };
    const window = {
        cmStorage: { getItem() { if (unavailable) throw Error('Unavailable'); return profile; } },
        addEventListener(type, listener) { events[type] = listener; }
    };
    vm.runInNewContext(source, { URL, location, document: { currentScript: { src: base + 'js/access-guard.js' }, documentElement: { style } },
        localStorage: { getItem() { return employer; } }, window });
    return { window, location, events, style, setProfile(value) { profile = value; } };
}
function check(name, body) { body(); count++; console.log('PASS ' + name); }
for (const page of ['community', 'peer-mentoring', 'showcase', 'freelance-services', 'mentoring-details', 'service-details', 'student-public-profile', 'service-draft']) {
    check('Guest cannot open ' + page, () => {
        const { location, style } = run('pages/services/' + page + '.html?id=sample#details');
        const url = new URL(location.redirect);
        assert.equal(url.pathname, '/app/pages/auth/login.html');
        assert.equal(url.searchParams.get('next'), 'pages/services/' + page + '.html?id=sample#details');
        assert.equal(style.visibility, 'hidden');
    });
}
for (const profile of [null, '{broken', '{}', JSON.stringify(company), JSON.stringify({ ...student, email: '' })]) {
    check('Missing, malformed or wrong role fails closed: ' + profile, () => assert.ok(run('pages/student/dashboard.html', profile).location.redirect));
}
check('Unavailable storage fails closed', () => assert.ok(run('pages/student/profile.html', null, null, true).location.redirect));
check('Student can open the requested private page', () => assert.equal(run('pages/student/requests.html', JSON.stringify(student)).location.redirect, undefined));
check('Company can browse service listings without student identity', () => assert.equal(run('pages/services/freelance-services.html', null, JSON.stringify(company)).location.redirect, undefined));
check('Company cannot enter student workspace', () => assert.ok(run('pages/student/dashboard.html', null, JSON.stringify(company)).location.redirect));
check('Company cannot create a student draft', () => assert.ok(run('pages/services/service-draft.html', null, JSON.stringify(company)).location.redirect));
check('Public landing and catalogue remain accessible', () => {
    for (const page of ['index.html', 'pages/public/languages.html', 'pages/auth/login.html']) assert.equal(run(page).location.redirect, undefined);
});
check('Back and cross-tab logout recheck identity', () => {
    for (const event of ['pageshow', 'storage', 'student-account-changed']) {
        const app = run('pages/student/dashboard.html', JSON.stringify(student));
        app.setProfile(null);
        app.events[event]({ key: 'codementor-profile-v1' });
        assert.ok(app.location.redirect);
        assert.equal(app.style.visibility, 'hidden');
    }
});
check('Return target preserves valid query and fragment', () => assert.equal(run('pages/auth/login.html').window.cmAccess.returnTarget('pages/services/service-details.html?id=one#request'), base + 'pages/services/service-details.html?id=one#request'));
check('Return target rejects external, script, admin and sibling-app paths', () => {
    const access = run('pages/auth/login.html').window.cmAccess;
    for (const value of ['https://evil.example/pages/student/dashboard.html', '//evil.example', 'javascript:alert(1)', '../pages/student/dashboard.html', 'pages/admin/admin-dashboard.html', 'pages/auth/login.html', 'pages/student/../../admin/admin-dashboard.html']) assert.equal(access.returnTarget(value), null);
});
check('All protected documents install the guard before deferred page code', () => {
    const files = ['pages/auth/change-password.html', ...['student', 'services'].flatMap(dir => fs.readdirSync('pages/' + dir).filter(f => f.endsWith('.html')).map(f => 'pages/' + dir + '/' + f))];
    for (const file of files) {
        const html = fs.readFileSync(file, 'utf8');
        const guard = html.indexOf('<script src="../../js/access-guard.js"></script>');
        assert.ok(guard > html.indexOf('platform-store.js') && guard < html.indexOf('<body'), file);
    }
});
console.log(`${count} access checks passed.`);
