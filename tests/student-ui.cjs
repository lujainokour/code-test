/* Student pages visual pass: shared component layer, opt-in pages, and no removed hooks. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { PAGES, hooks } = require('../tools/student-pages-baseline.cjs');
let count = 0;
function check(name, body) { body(); count++; console.log('PASS ' + name); }
const css = fs.readFileSync('css/student-premium.css', 'utf8');
const section = css.slice(css.indexOf('/* 13. STUDENT UI'), css.indexOf('/* 12. REDUCED MOTION'));
const baseline = JSON.parse(fs.readFileSync('docs/evidence/student-pages/hook-baseline.json', 'utf8'));
// Pages that already opted in (grows batch by batch).
const OPTED = JSON.parse(fs.readFileSync('docs/evidence/student-pages/opted-in.json', 'utf8')).pages;

check('One shared component layer, scoped to body.student-ui, with every component', () => {
    assert.ok(section.length > 1000, 'section 13 exists');
    for (const part of ['13.1 Page header', '13.2 Cards', '13.3 Section titles', '13.4 Buttons', '13.5 Form fields', '13.6 Chips', '13.7 Tabs', '13.8 Lists and tables', '13.9 Progress', '13.10 Empty state, notice', '13.11 Dialog', '13.12 Roadmap nodes'])
        assert.ok(section.includes(part), part);
    assert.ok(section.split('\n').filter(l => /^\s*[^/\s@}].*\{/.test(l)).every(l => /body\.student-ui/.test(l)), 'every rule is opt-in');
    assert.match(section, /\.button \{ min-height: 44px;/, '44px touch targets');
    assert.match(css, /body\.student-premium, body\.student-ui \{\s*--cm-page: var\(--page-bg\);/, 'same original blue palette as the Dashboard');
});
check('The shared layer reuses tokens: no new palette (only white fields and the AA error red)', () => {
    const hexes = [...section.matchAll(/#[0-9a-f]{3,6}\b/gi)].map(m => m[0].toLowerCase());
    assert.ok(hexes.every(h => ['#fff', '#8a1c1c'].includes(h)), 'unexpected colours: ' + hexes.join(', '));
    assert.ok(!fs.existsSync('css/student-ui.css'), 'no parallel stylesheet');
});
check('The hook baseline covers all 25 student pages', () => {
    assert.deepEqual(Object.keys(baseline).sort(), [...PAGES].sort());
    assert.ok(Object.values(baseline).every(list => list.length > 0));
});
check('No id, name, data attribute or class that existed before was removed from any student page', () => {
    for (const page of PAGES) {
        const now = new Set(hooks(fs.readFileSync(`pages/student/${page}.html`, 'utf8')));
        const missing = baseline[page].filter(h => !now.has(h));
        assert.deepEqual(missing, [], `${page} lost: ${missing.join(', ')}`);
    }
});
check('Opted-in pages load the shared layer and the interaction kit', () => {
    for (const page of OPTED) {
        const html = fs.readFileSync(`pages/student/${page}.html`, 'utf8');
        assert.match(html, /<body[^>]*class="[^"]*\bstudent-ui\b/, page + ' body class');
        assert.ok(html.includes('../../css/student-premium.css') && html.includes('../../css/interaction-kit.css') && html.includes('../../js/interaction-kit.js'), page + ' assets');
    }
});
console.log(`${count} student UI checks passed (${OPTED.length} pages opted in).`);
