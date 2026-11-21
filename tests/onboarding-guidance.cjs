/* Slice 2: the getting-started checklist is experience-aware but never changes for students who gave no (or unconfirmed) answers,
   and the onboarding page / dashboard / placement results load the domain before their scripts. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
let count = 0;
function check(name, body) { body(); count++; console.log('PASS ' + name); }

const window = {}; const context = vm.createContext({ window, document: {} });
vm.runInContext(fs.readFileSync('js/getting-started.js', 'utf8'), context, { filename: 'getting-started.js' });
const gs = window.gettingStarted;
const base = { ready: true, lessonsDone: 0, tasksDone: 0, ranCode: false, community: 'none', placementAvailable: true, placementState: 'missing' };
const placementStep = result => result.steps.find(step => step.id === 'placement');

check('Experienced students see the placement step marked "Recommended for you"; it stays optional and never blocks progress', () => {
    for (const experience of ['basics', 'practising']) {
        const result = gs.compute({ ...base, experience }), step = placementStep(result);
        assert.equal(step.state, 'todo'); assert.match(step.note, /Recommended for you/); assert.equal(step.optional, true);
        assert.equal(result.total, 5, 'placement is still outside the required steps');
        assert.equal(result.steps.find(item => item.state === 'current').id, 'lesson', 'the required path is unchanged');
    }
});

check('Beginners, unknown or unconfirmed experience, and finished or unavailable placement keep the previous checklist exactly', () => {
    const plain = gs.compute({ ...base });
    for (const experience of ['beginner', undefined]) assert.deepEqual(gs.compute({ ...base, experience }), plain);
    assert.equal(placementStep(plain).note, '');
    assert.equal(placementStep(gs.compute({ ...base, experience: 'practising', placementState: 'submitted' })).state, 'done');
    assert.match(placementStep(gs.compute({ ...base, experience: 'practising', placementAvailable: false })).note, /No placement check for this language yet/);
    assert.match(placementStep(gs.compute({ ...base, experience: 'practising', ready: false })).note, /Choose a ready language first/);
});

check('Pages load the onboarding domain before the scripts that use it', () => {
    const rules = [['pages/student/onboarding.html', 'js/domain/onboarding.js', 'js/data/onboarding-repository.js', 'js/onboarding.js'], ['pages/student/dashboard.html', 'js/domain/onboarding.js', 'js/student-overview.js'], ['pages/student/placement-results.html', 'js/domain/onboarding.js', 'js/placement-results.js']];
    for (const [page, ...order] of rules) {
        const html = fs.readFileSync(page, 'utf8'); let last = -1;
        for (const script of order) { const at = html.indexOf(script); assert.ok(at > last, `${page}: ${script} must load after the previous one`); last = at; }
    }
});

check('The onboarding page uses the repository only: no direct storage of the onboarding record or draft', () => {
    const source = fs.readFileSync('js/onboarding.js', 'utf8');
    assert.ok(!/codementor-demo-onboarding/.test(source)); assert.ok(!/\b(localStorage|sessionStorage)\b/.test(source));
    assert.ok(!/cmStorage\.(setItem|removeItem)\(/.test(source), 'writes go through js/data/onboarding-repository.js');
});

check('The onboarding page keeps the elements the previous version and the shell relied on', () => {
    const html = fs.readFileSync('pages/student/onboarding.html', 'utf8');
    for (const id of ['onboarding-form', 'onboarding-language', 'onboarding-message', 'continue-button', 'save-exit', 'welcome-message', 'onboarding-progress', 'onboarding-progress-bar', 'onboarding-resume', 'onboarding-plan', 'plan-title', 'plan-reasons', 'plan-primary', 'plan-secondary', 'plan-edit']) assert.ok(html.includes(`id="${id}"`), id);
    for (const value of ['beginner', 'basics', 'practising', 'foundations', 'problem-solving', 'projects']) assert.ok(html.includes(`value="${value}"`), value);
});

console.log(`${count} onboarding guidance checks passed.`);
