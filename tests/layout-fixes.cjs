/* Layout audit (Part B) fixes: static checks that each safe fix is in place. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
let count = 0;
function check(name, body) { body(); count++; console.log('PASS ' + name); }
const read = f => fs.readFileSync(f, 'utf8');

check('Community: the channel list stays in view on tall desktop screens, never with nested scrolling', () => {
    const css = read('css/community.css'), block = css.slice(css.indexOf('/* Layout audit (Part B)'));
    assert.match(block, /@media \(min-width: 1200px\) and \(min-height: 860px\) \{\s*\.community-v2 \.community-sidebar:not\(:has\(#community-other-languages:not\(\[hidden\]\)\)\) \{ position: sticky; top: 88px; align-self: start; \}/);
    assert.ok(!/community-sidebar[^{]*\{[^}]*overflow/.test(block), 'no inner scroll container');
});
check('Community: channel labels keep the full width; notes go on a second line', () => {
    const css = read('css/community.css');
    assert.match(css, /\.community-channel \{ display: grid; grid-template-columns: auto minmax\(0, 1fr\) auto;/);
    assert.match(css, /\.community-channel > :is\(\.community-channel-notes, \.community-channel-note, \.community-language-mark\) \{ grid-column: 2; grid-row: 2;/);
});
check('Career and company inbox: honest empty states with a next action inside the panel (no contradiction)', () => {
    const js = read('js/student-career.js');
    assert.ok(js.includes('opportunities.length?"No applications yet. Choose an open opportunity above.":"No applications yet. You can apply as soon as a company publishes an opportunity."'));
    assert.ok(js.includes('link("Prepare my local portfolio","local-portfolio.html")'));
    assert.ok(js.includes('el("h2","No messages yet")') && js.includes('link("Publish my profile","local-portfolio.html")'));
});
check('Student layer fixes: task board columns, placement facts, profile divider, mentor code hint', () => {
    const css = read('css/student-premium.css'), block = css.slice(css.indexOf('/* 20. LAYOUT AUDIT FIXES'));
    for (const rule of ['body.student-ui .internship-board { align-items: start; }', 'body.student-ui .assessment-facts strong { font-family: var(--cm-font);',
        'body.student-ui .dashboard-card > .dashboard-text-link + h2 {', 'body.student-ui .dashboard-card:has(> #code-context-note:empty):has(> #context-code[hidden]) .mentor-code-hint { display: block; }'])
        assert.ok(block.includes(rule), rule);
    const mentor = read('pages/student/mentor.html');
    assert.ok(mentor.indexOf('mentor-code-hint') > mentor.indexOf('id="code-context-note"') && mentor.indexOf('mentor-code-hint') < mentor.indexOf('id="context-code"'));
});
check('Admin and company: one sidebar style on every admin page, 4 KPI columns, a full-width chat input', () => {
    const css = read('css/student-premium.css'), block = css.slice(css.indexOf('/* 20. LAYOUT AUDIT FIXES'));
    assert.ok(block.includes('body.glass-ui.admin-page .admin-nav-group a[aria-current="page"] { border-left-color: #b1d4e1; font-weight: 700; }'));
    assert.ok(read('css/admin-overview.css').includes('.admin-page .admin-nav-group a[aria-current="page"]'), 'original rules kept');
    for (const page of fs.readdirSync('pages/admin').filter(f => f.endsWith('.html'))) assert.ok(read('pages/admin/' + page).includes('css/student-premium.css'), page + ' loads the shared rules');
    assert.match(block, /@media \(min-width: 1200px\) \{ body\.glass-ui \.overview-stats \{ grid-template-columns: repeat\(4, minmax\(0, 1fr\)\); \} \}/);
    assert.match(block, /body\.glass-ui \.company-chat-input-bar #company-chat-input \{ flex: 1 1 auto; min-width: 0; min-height: 44px;/);
});
console.log(`${count} layout fix checks passed.`);
