/* The workspace shell (js/workspace-shell.js) removes page footers and moves page headers when a
   student, admin or company is signed in. A page script that writes into those elements without a
   null check throws and leaves the page empty (this broke placement-question and placement-results:
   "Cannot set properties of null (setting 'textContent')"). */
const assert = require('node:assert/strict');
const fs = require('node:fs');
let count = 0;
function check(name, body) { body(); count++; console.log('PASS ' + name); }
const shell = fs.readFileSync('js/workspace-shell.js', 'utf8');
const REMOVED = ['workspace-footer', 'services-footer', 'onboarding-footer', 'services-header'];

check('The shell still removes the elements this suite guards', () => {
    assert.match(shell, /querySelectorAll\("\.workspace-footer, \.services-footer, \.onboarding-footer"\)\.forEach\(footer => footer\.remove\(\)\)/);
    assert.match(shell, /\.services-header"\); oldHeader\?\.remove\(\)/);
});
check('No page script dereferences a shell-removed element without a null check', () => {
    const offenders = [];
    for (const file of fs.readdirSync('js').filter(f => f.endsWith('.js') && f !== 'workspace-shell.js')) {
        const source = fs.readFileSync('js/' + file, 'utf8');
        for (const cls of REMOVED) {
            const direct = new RegExp(`querySelector\\(["'\`]\\.${cls}["'\`]\\)\\.(?!\\?)`, 'g');
            if (direct.test(source)) offenders.push(`${file}: .${cls}`);
        }
    }
    assert.deepEqual(offenders, []);
});
check('Placement question and results update their footer only when it exists', () => {
    for (const file of ['js/placement-question.js', 'js/placement-results.js']) {
        const source = fs.readFileSync(file, 'utf8');
        assert.match(source, /const footer = document\.querySelector\("\.onboarding-footer"\); if \(footer\) footer\.textContent = /, file);
    }
});
console.log(`${count} shell-safety checks passed.`);
