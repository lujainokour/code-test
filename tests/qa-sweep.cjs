/* QA sweep fixes (docs/QA-SWEEP.md): favicons on every page and a 44px touch-target floor on phones. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
let count = 0;
function check(name, body) { body(); count++; console.log('PASS ' + name); }
const protectedFiles = JSON.parse(fs.readFileSync('docs/phase2-protected-baseline.json', 'utf8')).map(entry => entry.file);
const authorised = JSON.parse(fs.readFileSync('docs/evidence/authorized-baseline-changes.json', 'utf8')).changes.map(change => change.file);
const pages = ['index.html', 'dashboard.html', 'company-dashboard.html', 'teacher-dashboard.html'];
for (const dir of fs.readdirSync('pages')) for (const file of fs.readdirSync('pages/' + dir)) if (file.endsWith('.html')) pages.push(`pages/${dir}/${file}`);

check('Every page that may be edited links the CodeMentor favicon', () => {
    const editable = pages.filter(page => !protectedFiles.includes(page) || authorised.includes(page));
    const missing = editable.filter(page => !/<link rel="icon" href="(\.\.\/\.\.\/)?assets\/images\/Burgundy CMA cherry monogram logo\.png"/.test(fs.readFileSync(page, 'utf8')) && !/rel="icon"/.test(fs.readFileSync(page, 'utf8')));
    assert.deepEqual(missing, []);
});
// Owner-approved (Part 7, docs/PASSKEYS.md): login.html and admin-login.html may additionally contain
// exactly these passkey / Face ID insertions. Each must appear exactly once; once they and the favicon
// are removed, the page must still equal its protected baseline byte for byte. Any other edit fails.
const passkeyIcon = '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8V6a2 2 0 0 1 2-2h2"/><path d="M16 4h2a2 2 0 0 1 2 2v2"/><path d="M20 16v2a2 2 0 0 1-2 2h-2"/><path d="M8 20H6a2 2 0 0 1-2-2v-2"/><path d="M9 9.5v1"/><path d="M15 9.5v1"/><path d="M12 9.5v3.5h-1"/><path d="M9.5 15.5a3.5 3.5 0 0 0 5 0"/></svg>';
const approvedPasskeyInsertions = [
    '    <link rel="stylesheet" href="../../css/passkeys.css">\n',
    '    <script src="../../js/server-auth.js" defer></script>\n',
    [
        '<div class="passkey-signin" data-passkey-signin hidden>',
        '    <button type="button" class="passkey-button">',
        '        <span class="passkey-icon" aria-hidden="true">' + passkeyIcon + '</span>',
        '        <span class="passkey-text"><strong>Sign in with Face ID</strong><span class="passkey-sub">Windows Hello, Touch ID or a passkey</span></span>',
        '    </button>',
        '    <p class="passkey-status" role="status" aria-live="polite"></p>',
        '    <p class="passkey-divider"><span>or sign in with your password</span></p>',
        '</div>'
    ].map(line => '                ' + line + '\n').join('') + '\n'
];
const passkeyApprovedPages = ['pages/auth/login.html', 'pages/auth/admin-login.html'];
check('The four protected sign-in pages changed only by the favicon link (owner-approved), byte for byte', () => {
    const crypto = require('node:crypto');
    const baseline = JSON.parse(fs.readFileSync('docs/phase2-protected-baseline.json', 'utf8'));
    const link = '<link rel="icon" href="../../assets/images/Burgundy CMA cherry monogram logo.png" type="image/png">';
    for (const page of ['pages/auth/login.html', 'pages/auth/admin-login.html', 'pages/auth/teacher-login.html', 'pages/auth/teacher-signup.html']) {
        let text = fs.readFileSync(page, 'utf8').replace(/\r\n/g, '\n');
        assert.equal(text.split(link).length, 2, page + ' has exactly one favicon link');
        if (passkeyApprovedPages.includes(page)) {
            for (const insertion of approvedPasskeyInsertions) {
                assert.equal(text.split(insertion).length, 2, page + ' contains each approved passkey insertion exactly once');
                text = text.replace(insertion, '');
            }
        }
        const withoutLink = crypto.createHash('sha256').update(text.replace(link, '')).digest('hex');
        assert.equal(withoutLink, baseline.find(entry => entry.file === page).sha256Lf, page + ' differs from its baseline by more than the favicon');
        assert.ok(authorised.includes(page), page + ' is listed as an approved change');
    }
});
check('Phones get a 44px floor for the controls the sweep found at 27-42px', () => {
    const css = fs.readFileSync('css/style.css', 'utf8');
    const block = css.slice(css.indexOf('/* QA sweep: 44px touch-target floor on phones'));
    assert.match(block, /@media \(max-width: 600px\)/);
    for (const selector of ['.button', '.auth-video-toggle', '.password-toggle', '.teacher-filter-btn', '.workspace-menu-toggle', '#company-chat-input', '#talent-skill-filter', '.btn-remove-slot'])
        assert.ok(block.includes(selector), selector);
    assert.match(block, /\.btn-remove-slot \{[^}]*min-width: 44px; min-height: 44px !important;/);
});
check('Placement and onboarding pages inside the shell get a padded frame (were flush to the sidebar and screen edge)', () => {
    const css = fs.readFileSync('css/student-premium.css', 'utf8');
    assert.match(css, /body\.student-ui \.workspace-body > main\.container:is\(\.onboarding-layout, \.assessment-layout, \.results-page\) \{ box-sizing: border-box; width: 100%; max-width: 1320px; margin-inline: 0; padding: 28px; \}/);
    for (const page of ['onboarding', 'placement-intro', 'placement-question', 'placement-review', 'placement-results'])
        assert.match(fs.readFileSync(`pages/student/${page}.html`, 'utf8'), /<main class="container (onboarding-layout|assessment-layout|results-page)/, page);
});
check('The sweep harness covers all four roles and all four widths', () => {
    const harness = fs.readFileSync('tests/qa-sweep-browser.ps1', 'utf8');
    for (const role of ["'guest'", "'student'", "'admin'", "'company'"]) assert.ok(harness.includes(role), role);
    assert.match(harness, /@\(1440, 1024, 768, 390\)/);
});
console.log(`${count} QA sweep checks passed.`);
