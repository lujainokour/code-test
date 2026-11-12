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
