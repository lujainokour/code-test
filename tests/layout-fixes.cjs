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
console.log(`${count} layout fix checks passed.`);
