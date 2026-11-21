/* Dashboard / My progress redesign: KPI values, achievement rules, empty state, ring percentage,
   language and account isolation, placed-out exclusion, one Continue action, and the switcher. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { makeDocument, memory, eventWindow } = require('./helpers/fake-dom.cjs');
let count = 0;
function check(name, body) { body(); count++; console.log('PASS ' + name); }
const plain = v => JSON.parse(JSON.stringify(v));
const key = (owner, k, lang = 'python') => `codementor-learning-v1:${encodeURIComponent(owner)}:${lang === 'python' ? k : `${lang}:${k}`}`;
const day = n => new Date(Date.now() - n * 86400000).toISOString();

const CORE = ['learning-storage', 'language-catalog', 'placement-banks', 'placement-engine', 'placement-store', 'placement-data', 'python-lessons', 'python-extension', 'curriculum-registry', 'curricula/python', 'curricula/javascript', 'domain/learning', 'data/learning-repository', 'python-curriculum', 'learning-support', 'progress-insights', 'student-overview', 'student-premium'];
function page({ shared, owner = 'learner-a@example.test', name = 'Test Learner', language = 'python', pathname = '/pages/student/dashboard.html', extra = [], preferences = true, core = CORE } = {}) {
    if (owner) shared.local.setItem('codementor-profile-v1', JSON.stringify({ name, email: owner, role: 'student', isDemo: true }));
    if (owner && preferences) shared.local.setItem(key(owner, 'codementor-demo-onboarding'), JSON.stringify({ language, experience: 'beginner', goal: 'foundations' }));
    const dom = makeDocument();
    dom.document.currentScript = { src: 'http://local.test/js/x.js' };
    const topbar = dom.document.createElement('header'); topbar.className = 'workspace-topbar'; dom.body.append(topbar);
    const pill = dom.document.createElement('a'); pill.className = 'account-pill'; pill.href = 'profile.html'; topbar.append(pill);
    const sidebar = dom.document.createElement('aside'); sidebar.id = 'workspace-sidebar'; sidebar.append(dom.document.createElement('nav')); dom.body.append(sidebar);
    const window = eventWindow({ matchMedia: () => ({ matches: true }) });
    const location = { pathname, search: '', href: '', reloaded: 0, reload() { this.reloaded++; }, assign(v) { this.href = v; }, replace(v) { this.href = v; } };
    class CustomEvent { constructor(type, o = {}) { this.type = type; this.detail = o.detail; } }
    const context = vm.createContext({ window, document: dom.document, location, localStorage: shared.local, sessionStorage: shared.session, crypto: globalThis.crypto, URL, URLSearchParams, CustomEvent, NodeFilter: { SHOW_TEXT: 4 }, setTimeout: () => 0, console });
    window.subscriptionStore = { canAccessLevel: id => id <= 5 };
    window.studentServicesStore = {
        session() { const raw = window.cmStorage.getItem('codementor-demo-session'); if (!raw) throw new Error('No session'); return JSON.parse(raw); },
        ownRecords(type, email) { return (shared.records?.[type] || []).filter(r => r.owner === email); }
    };
    const load = file => vm.runInContext(fs.readFileSync(`js/${file}.js`, 'utf8'), context, { filename: file });
    for (const file of [...core, ...extra]) load(file);
    return { window, dom, location, load, $: id => dom.document.getElementById(id) };
}
const shared = () => ({ local: memory(), session: memory(), records: {} });
const realProgress = { version: 1, lessons: ['variables', 'data-types', 'input-output', 'numbers'], tasks: ['student-profile'], assessments: { 1: { score: 75, lastScore: 75, submittedAt: day(1) } },
    checks: { variables: { correct: true, checkedAt: day(3) }, 'data-types': { correct: false, checkedAt: day(2) }, numbers: { correct: true, checkedAt: day(0) } },
    taskResults: { 'student-profile': { passed: 3, total: 3, submittedAt: day(1) }, receipt: { passed: 1, total: 3, submittedAt: day(0) } } };

// ---- Model: KPI values, ring, unlock text ----
const s1 = shared();
s1.local.setItem(key('learner-a@example.test', 'codementor-demo-learning'), JSON.stringify(realProgress));
const p1 = page({ shared: s1, extra: ['dashboard'] });
const m1 = p1.window.studentOverview.build();
check('KPI values come from saved progress of the active language', () => {
    const total = p1.window.pythonCurriculum.allLessons.length, tasks = p1.window.pythonCurriculum.levels.flatMap(l => l.tasks).length;
    assert.deepEqual(plain(m1.totals), { lessonsDone: 4, lessonsTotal: total, tasksDone: 1, tasksTotal: tasks, levelsDone: 1, levelsTotal: p1.window.pythonCurriculum.levels.length });
    assert.equal(p1.$('recorded-lessons').textContent, `4 / ${total}`);
    assert.equal(p1.$('recorded-tasks').textContent, `1 / ${tasks}`);
    assert.equal(p1.$('kpi-streak').textContent, '4 days', 'activity on 4 consecutive days');
    assert.equal(p1.$('kpi-days').textContent, String(m1.activeDays.thisMonth));
    assert.match(p1.$('kpi-tasks-sub').textContent, /\+1 passed in the last 7 days/);
});
check('Ring percentage = completed lessons / all lessons of the active language', () => {
    const expected = Math.round(4 / p1.window.pythonCurriculum.allLessons.length * 100);
    assert.equal(m1.overallPercent, expected);
    assert.equal(p1.$('progress-ring').dataset.percent, String(expected));
    assert.ok(p1.dom.walk().some(n => n.className === 'ring-value' && n.textContent === `${expected}%`));
    assert.match(p1.$('ring-unlock').textContent, /unlock Level 3/);
    assert.equal(p1.$('ring-levels').textContent, `1 of ${p1.window.pythonCurriculum.levels.length}`);
});
check('"Continue" appears exactly once on the Dashboard (static markup + rendered)', () => {
    const html = fs.readFileSync('pages/student/dashboard.html', 'utf8');
    const staticContinue = (html.match(/>\s*Continue\b/g) || []).length;
    const rendered = p1.dom.walk().filter(n => ['A', 'BUTTON'].includes(n.tagName) && /^\s*Continue\b/.test(n.textContent)).length;
    assert.equal(staticContinue + rendered, 1);
    assert.equal(p1.$('next-actions').children.filter(n => n.className.includes('button-primary')).length, 1, 'one primary button');
    assert.ok(!html.includes('continue-card') && !html.includes('dashboard-next-step'), 'the old duplicate cards are gone');
});
check('Weekly chart has 7 days with labels; recent activity shows at most 5 real events', () => {
    const cols = p1.$('week-chart').children;
    assert.equal(cols.length, 7);
    assert.ok(cols.every(c => /: \d+ activit/.test(c.getAttribute('aria-label'))));
    assert.equal(p1.$('recent-activity').children.length, 5, '6 saved events, newest 5 shown');
    assert.match(p1.$('recent-activity').children[0].textContent, /Ran the tests for “receipt”|Answered the check in “Working with numbers”/);
    assert.ok(p1.$('week-empty').hidden);
});
check('Suggested next is labelled "System suggestion" and never repeats the primary action', () => {
    const text = p1.$('suggested-next').textContent;
    assert.match(text, /^System suggestion/);
    assert.ok(!/\bAI\b/.test(text));
    const suggestion = p1.$('suggested-next').children.find(n => n.tagName === 'A');
    assert.notEqual(suggestion.href, p1.$('next-actions').children[0].href);
});

// ---- Achievement rules (one documented list) ----
check('Achievement rules: one documented list with unique ids and exact unlock rules', () => {
    const rules = p1.window.progressInsights.ACHIEVEMENT_RULES;
    assert.equal(new Set(rules.map(r => r.id)).size, rules.length);
    assert.ok(rules.every(r => r.title && r.description && r.rule && r.art && r.metric));
    const source = fs.readFileSync('js/progress-insights.js', 'utf8');
    assert.match(source, /ACHIEVEMENT RULES — the single documented list/);
});
check('Achievement rules evaluate real progress, dates and encouraging hints', () => {
    const list = Object.fromEntries(m1.achievements.map(a => [a.id, a]));
    assert.ok(list['first-lesson'].earned && list['first-lesson'].earnedAt === null);
    assert.ok(!list['five-lessons'].earned); assert.equal(list['five-lessons'].hint, '1 more lesson');
    assert.ok(list['first-task'].earned && list['first-task'].earnedAt === realProgress.taskResults['student-profile'].submittedAt);
    assert.ok(!list['three-tasks'].earned); assert.equal(list['three-tasks'].hint, '2 more tasks');
    assert.ok(list['streak-3'].earned); assert.equal(p1.window.progressInsights.dayKey(Date.parse(list['streak-3'].earnedAt)), p1.window.progressInsights.dayKey(Date.parse(day(1))));
    assert.ok(!list.placement.earned); assert.equal(list.placement.hint, 'Take the placement check');
    assert.ok(list['level-1'].earned && list['level-1'].earnedAt === realProgress.assessments[1].submittedAt);
    assert.ok(!list['level-2'].earned && list['level-2'].hint.startsWith('4 more lessons'));
    assert.ok(!list['path-complete'].earned);
    const quiz69 = p1.window.progressInsights.achievements({ ...realProgress, assessments: { 1: { score: 69, submittedAt: day(1) } } }, p1.window.pythonCurriculum, null);
    assert.equal(quiz69.find(a => a.id === 'level-1').earned, false, 'a 69% quiz never completes a level');
    const noTime = p1.window.progressInsights.achievements({ ...realProgress, checks: {}, taskResults: {}, assessments: { 1: { score: 80 } } }, p1.window.pythonCurriculum, null);
    assert.equal(noTime.find(a => a.id === 'streak-3').earned, false, 'no timestamps, no streak');
    assert.equal(noTime.find(a => a.id === 'level-1').earnedAt, null, 'no saved time → "date not recorded"');
});

// ---- Empty state for a new student ----
check('New student: empty states, zero KPIs, first lesson as the one action', () => {
    const s = shared();
    const p = page({ shared: s, extra: ['dashboard'] });
    const m = p.window.dashboardModel;
    assert.equal(m.totals.lessonsDone, 0); assert.equal(m.events.length, 0); assert.equal(m.overallPercent, 0);
    assert.equal(p.$('recorded-lessons').textContent, `0 / ${m.totals.lessonsTotal}`);
    assert.equal(p.$('kpi-streak').textContent, '0 days');
    assert.equal(p.$('kpi-days-sub').textContent, 'This calendar month', 'no comparison without earlier history');
    assert.ok(!p.$('week-empty').hidden && /No dated activity yet/.test(p.$('week-empty').textContent));
    assert.ok(!p.$('recent-empty').hidden);
    assert.match(p.$('hero-line').textContent, /starts here/);
    assert.equal(p.$('next-actions').children[0].textContent, 'Continue');
    assert.match(p.$('next-actions').children[0].href, /lesson\.html\?lesson=variables$/);
    assert.ok(m.achievements.every(a => !a.earned));
});
check('Active-days comparison appears only when dated history predates this month', () => {
    const pi = p1.window.progressInsights, now = new Date(2026, 10, 15).getTime();
    const ev = d => ({ at: new Date(2026, 10, d, 12).toISOString() }), old = { at: new Date(2026, 9, 20, 12).toISOString() };
    assert.deepEqual(plain(pi.activeDays([ev(14), ev(10), ev(10)], now)), { thisMonth: 2, previousMonth: 0, hasHistoryBefore: false });
    assert.deepEqual(plain(pi.activeDays([ev(14), old], now)), { thisMonth: 1, previousMonth: 1, hasHistoryBefore: true });
});

// ---- Isolation: language switch and account switch ----
check('Switching language never shows another language\'s numbers', () => {
    const s = shared();
    s.local.setItem(key('learner-a@example.test', 'codementor-demo-learning'), JSON.stringify(realProgress));
    s.local.setItem(key('learner-a@example.test', 'codementor-demo-language'), JSON.stringify('javascript'));
    const p = page({ shared: s, language: 'javascript', extra: ['dashboard'] });
    const m = p.window.dashboardModel;
    assert.equal(p.window.pythonCurriculum.id, 'javascript');
    assert.equal(m.totals.lessonsDone, 0); assert.equal(m.events.length, 0);
    assert.equal(p.$('recorded-lessons').textContent, `0 / ${p.window.pythonCurriculum.allLessons.length}`);
    assert.ok(m.achievements.every(a => !a.earned));
    assert.ok(s.local.getItem(key('learner-a@example.test', 'codementor-demo-learning')).includes('variables'), 'Python progress kept');
});
check('Switching account never shows another student\'s numbers', () => {
    const s = shared();
    s.local.setItem(key('learner-a@example.test', 'codementor-demo-learning'), JSON.stringify(realProgress));
    s.records = { booking: [{ owner: 'learner-a@example.test' }, { owner: 'learner-b@example.test' }] };
    const p = page({ shared: s, owner: 'learner-b@example.test', name: 'Other Learner', extra: ['dashboard'] });
    const m = p.window.dashboardModel;
    assert.equal(m.totals.lessonsDone, 0); assert.equal(m.events.length, 0); assert.equal(m.counts.booking, '1');
    assert.equal(p.$('dashboard-greeting').textContent, 'Welcome back, Other.');
});

// ---- Placed-out exclusion ----
check('Placed-out levels are shown distinctly and never count as completed or earn badges', () => {
    const s = shared();
    const p = page({ shared: s, owner: 'placed@example.test', pathname: '/pages/student/progress.html', extra: [] });
    const store = p.window.placementStore;
    let attempt = store.begin(store.capture());
    attempt = store.save({ answers: store.bank().questions.map(q => q.correct), currentQuestion: store.bank().questions.length - 1 }, JSON.stringify(attempt), store.capture());
    const submitted = store.submit(JSON.stringify(attempt), store.capture());
    store.applyRecommended(JSON.stringify(submitted), store.capture());
    const m = p.window.studentOverview.build();
    const placedOut = m.levels.filter(l => l.state === 'placed-out');
    assert.ok(placedOut.length >= 1, 'earlier levels are placed out');
    assert.equal(m.totals.levelsDone, 0); assert.equal(m.overallPercent, 0);
    assert.ok(m.achievements.filter(a => a.id.startsWith('level-')).every(a => !a.earned));
    assert.ok(m.achievements.filter(a => placedOut.some(l => `level-${l.id}` === a.id)).every(a => a.placedOut));
    assert.ok(m.achievements.find(a => a.id === 'placement').earned, 'taking placement is real');
    p.load('progress-overview');
    const nodes = p.$('level-roadmap').children;
    assert.equal(nodes.length, m.levels.length);
    assert.ok(nodes.filter(n => n.dataset.state === 'placed-out').every(n => /Placed out — not completed/.test(n.textContent)));
    const gallery = p.$('badge-gallery').children;
    assert.ok(gallery.filter(n => n.dataset.achievement?.startsWith('level-') && n.dataset.earned === 'true').length === 0);
    assert.ok(gallery.some(n => /You placed out of this level/.test(n.textContent)));
    assert.match(p.$('skill-snapshot').textContent, /Recommended start: Level \d/);
});
check('My progress renders badges with SVG art, insights and the moved request counts', () => {
    const s = shared();
    s.local.setItem(key('learner-a@example.test', 'codementor-demo-learning'), JSON.stringify(realProgress));
    s.records = { booking: [{ owner: 'learner-a@example.test' }], request: [], draft: [{ owner: 'learner-a@example.test' }, { owner: 'x@example.test' }] };
    const p = page({ shared: s, pathname: '/pages/student/progress.html', extra: ['progress-overview'] });
    const cards = p.$('badge-gallery').children;
    assert.equal(cards.length, p.window.progressModel.achievements.length);
    assert.ok(cards.every(c => c.children[0].tagName === 'SVG'));
    assert.ok(cards.filter(c => c.dataset.earned === 'false').every(c => /Almost there|placed out|Take the placement/i.test(c.textContent) || c.dataset.achievement === 'placement'));
    assert.ok(!cards.some(c => /fail|shame|only\b/i.test(c.textContent)), 'locked badges encourage, never shame');
    assert.match(p.$('insight-list').textContent, /Strongest topic/);
    assert.match(p.$('insight-list').textContent, /Recent quiz.*Level 1: 75%/);
    assert.ok(p.$('dashboard-review').textContent.includes('Data types'), 'topics to revisit come from saved answers');
    assert.equal(p.$('booking-count').textContent, '1'); assert.equal(p.$('request-count').textContent, '0'); assert.equal(p.$('draft-count').textContent, '1');
});

// ---- Language switcher ----
check('Switcher: compact, lists every catalog language with status, keyboard and ARIA', () => {
    const s = shared();
    const p = page({ shared: s, extra: ['learning-language'] });
    const button = p.dom.walk().find(n => n.className === 'lang-switch-button' && n.parent.dataset.where === 'topbar');
    const list = p.dom.document.getElementById(button.getAttribute('aria-controls'));
    assert.equal(p.$('selected-language').textContent, 'Python');
    assert.equal(list.children.length, p.window.languageCatalog.entries.length);
    assert.ok(list.children.every(o => o.getAttribute('role') === 'option' && /Ready|Coming soon|Preview/.test(o.textContent)));
    assert.equal(list.getAttribute('role'), 'listbox');
    assert.ok(p.dom.walk().some(n => n.className === 'lang-switch' && n.dataset.where === 'sidebar'), 'same component in the sidebar drawer');
    button.fire('keydown', { key: 'ArrowDown' });
    assert.equal(button.getAttribute('aria-expanded'), 'true'); assert.equal(list.hidden, false);
    assert.equal(list.getAttribute('aria-activedescendant'), list.children.find(o => o.dataset.language === 'python').id);
    list.fire('keydown', { key: 'ArrowDown' });
    assert.equal(list.getAttribute('aria-activedescendant'), list.children[1].id);
    list.fire('keydown', { key: 'Escape' });
    assert.equal(button.getAttribute('aria-expanded'), 'false'); assert.equal(list.hidden, true);
});
check('Switcher: a ready language switches in one click with a toast; coming soon opens availability', () => {
    const s = shared();
    s.local.setItem(key('learner-a@example.test', 'codementor-demo-learning'), JSON.stringify(realProgress));
    const p = page({ shared: s, extra: ['learning-language'] });
    const list = p.dom.walk().find(n => n.getAttribute?.('role') === 'listbox' && n.id.startsWith('lang-switch-topbar'));
    list.children.find(o => o.dataset.language === 'rust').fire('click');
    assert.equal(p.window.cmStorage.activeLanguage(), 'python', 'coming soon is never made active');
    const dialog = p.dom.walk().find(n => n.tagName === 'DIALOG');
    assert.ok(dialog && /Rust: coming soon/.test(dialog.textContent) && /Notify me on this device/.test(dialog.textContent));
    list.children.find(o => o.dataset.language === 'javascript').fire('click');
    assert.equal(p.window.cmStorage.activeLanguage(), 'javascript');
    assert.equal(p.location.reloaded, 1, 'switches immediately, no extra confirm button');
    assert.deepEqual(plain(JSON.parse(s.session.getItem('codementor-language-toast'))), { to: 'javascript', from: 'Python', owner: 'learner-a@example.test' });
    assert.ok(s.local.getItem(key('learner-a@example.test', 'codementor-demo-learning')).includes('variables'), 'Python progress kept');
    const after = page({ shared: s, language: 'javascript', extra: ['learning-language'] });
    const toast = after.dom.walk().find(n => n.className === 'cm-toast');
    assert.equal(toast.textContent, 'Switched to JavaScript. Your Python progress is saved.');
    assert.equal(s.session.getItem('codementor-language-toast'), null);
});
check('Switcher: a stale page cannot switch another account\'s language', () => {
    const s = shared();
    const p = page({ shared: s, extra: ['learning-language'] });
    s.local.setItem('codementor-profile-v1', JSON.stringify({ name: 'B', email: 'learner-b@example.test', role: 'student', isDemo: true }));
    const list = p.dom.walk().find(n => n.getAttribute?.('role') === 'listbox' && n.id.startsWith('lang-switch-topbar'));
    list.children.find(o => o.dataset.language === 'javascript').fire('click');
    assert.equal(s.local.getItem(key('learner-b@example.test', 'codementor-demo-language')), null);
    assert.equal(p.location.reloaded, 0);
    assert.ok(p.dom.walk().some(n => n.className === 'lang-switch-message' && /account changed/i.test(n.textContent)));
});
check('Switcher states: no preference and unreadable preference are never shown as Python', () => {
    const none = page({ shared: shared(), preferences: false, extra: ['learning-language'] });
    assert.equal(none.$('selected-language').textContent, 'Not selected');
    const bad = shared(); bad.local.setItem(key('learner-a@example.test', 'codementor-demo-onboarding'), '{broken');
    const p = page({ shared: bad, preferences: false, core: ['learning-storage', 'language-catalog'], extra: ['learning-language'] });
    assert.equal(p.$('selected-language').textContent, 'Unavailable');
});

check('Unreadable preferences: the dashboard shows a clear error state instead of crashing', () => {
    const bad = shared(); bad.local.setItem(key('learner-a@example.test', 'codementor-demo-onboarding'), '{broken');
    const p = page({ shared: bad, preferences: false, core: ['learning-storage', 'language-catalog', 'student-premium'], extra: ['dashboard'] });
    assert.equal(p.$('next-title').textContent, 'Preferences unavailable');
    const actions = p.$('next-actions').children;
    assert.equal(actions.length, 1); assert.match(actions[0].href, /profile\.html$/);
    assert.ok(!p.dom.walk().some(n => n.tagName === 'A' && /lesson\.html/.test(n.href || '')), 'no lesson inferred');
    assert.equal(p.$('recorded-lessons').textContent, '—');
    assert.equal(bad.local.getItem(key('learner-a@example.test', 'codementor-demo-onboarding')), '{broken', 'record kept');
});

// ---- Data integrity ----
check('No invented statistics: no random numbers, no hours, styles in one dedicated file', () => {
    for (const file of ['js/dashboard.js', 'js/student-overview.js', 'js/progress-overview.js', 'js/progress-insights.js', 'js/student-premium.js']) assert.ok(!/Math\.random/.test(fs.readFileSync(file, 'utf8')), file);
    const html = fs.readFileSync('pages/student/dashboard.html', 'utf8');
    assert.ok(!/\bhours?\b/i.test(html.replace(/hours are not shown/, '')), 'no learning-hours metric');
    assert.match(fs.readFileSync('css/student-premium.css', 'utf8'), /1\. TOKENS[\s\S]*--cm-ink: var\(--color-action\)[\s\S]*prefers-reduced-motion/);
    assert.ok(!/bookings? &amp; service|booking-count/i.test(html), 'bookings moved off the dashboard');
    assert.match(fs.readFileSync('pages/student/progress.html', 'utf8'), /id="booking-count"/);
});
console.log(`${count} dashboard redesign checks passed.`);
