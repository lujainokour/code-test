/* Layout audit thresholds (tools/layout-audit.js) on synthetic layouts. */
const assert = require('node:assert/strict');
const { THRESHOLDS, findIssues } = require('../tools/layout-audit.js');
let count = 0;
function check(name, body) { body(); count++; console.log('PASS ' + name); }
const box = (tag, x, y, w, h, extra = {}) => ({ tag, id: '', cls: '', x, y, w, h, text: 0, media: false, children: [], ...extra });
const text = (x, y, w, h, n = 20) => box('p', x, y, w, h, { text: n });
const main = (children, w = 1000) => box('main', 0, 0, w, 3000, { id: 'main', children });
const types = issues => issues.map(i => i.type);

check('Thresholds are the documented ones', () => {
    assert.deepEqual({ ...THRESHOLDS }, { gap: 120, narrow: 0.5, narrowMinWidth: 600, columnDiff: 400, columnRatio: 3, emptyMinHeight: 40 });
});
check('Gap: 121px between stacked sections is reported, 119px is not', () => {
    const a = text(0, 0, 1000, 100), b = text(0, 221, 1000, 100), c = text(0, 219, 1000, 100);
    assert.deepEqual(types(findIssues(main([a, b]))), ['gap']);
    assert.equal(findIssues(main([a, b]))[0].px, 121);
    assert.deepEqual(findIssues(main([a, c])), []);
});
check('Gap ignores side-by-side boxes (they are columns, not a stack)', () => {
    assert.deepEqual(findIssues(main([text(0, 0, 400, 100), text(600, 400, 400, 100)])), []);
});
check('Narrow content: under half the available width is reported; over half, or a narrow viewport, is not', () => {
    assert.deepEqual(types(findIssues(main([text(0, 0, 450, 100)]))), ['narrow-content']);
    assert.deepEqual(findIssues(main([text(0, 0, 550, 100)])), []);
    assert.deepEqual(findIssues(main([text(0, 0, 200, 100)], 500)), [], 'not judged below 600px available');
});
check('Unbalanced columns: a column 1000px tall beside one 200px tall is reported; 1000 vs 700 is not', () => {
    const r = findIssues(main([text(0, 0, 300, 1000), text(320, 0, 680, 200)]));
    assert.deepEqual(types(r), ['unbalanced-columns']); assert.equal(r[0].blank, 800);
    assert.deepEqual(findIssues(main([text(0, 0, 300, 1000), text(320, 0, 680, 700)])), []);
});
check('Empty section: a card with no text or controls is reported; one with a button or text is not', () => {
    const empty = box('div', 0, 0, 1000, 200, { cls: 'dashboard-card' });
    assert.deepEqual(types(findIssues(main([empty]))), ['empty-section']);
    assert.deepEqual(findIssues(main([box('div', 0, 0, 1000, 200, { cls: 'dashboard-card', children: [box('button', 10, 10, 100, 44, { media: true })] })])), []);
    assert.deepEqual(findIssues(main([box('div', 0, 0, 1000, 200, { cls: 'dashboard-card', children: [text(10, 10, 300, 40)] })])), []);
    assert.deepEqual(findIssues(main([box('div', 0, 0, 1000, 30, { cls: 'dashboard-card' })])), [], 'tiny boxes are not sections');
});
check('Orphan heading: a heading alone in its container is reported; with content after it, it is not', () => {
    const lonely = box('section', 0, 0, 1000, 120, { children: [box('h2', 0, 0, 1000, 40, { text: 12 })] });
    assert.deepEqual(types(findIssues(main([lonely]))), ['orphan-heading']);
    const fine = box('section', 0, 0, 1000, 120, { children: [box('h2', 0, 0, 1000, 40, { text: 12 }), text(0, 50, 1000, 60)] });
    assert.deepEqual(findIssues(main([fine])), []);
});
console.log(`${count} layout audit checks passed.`);
