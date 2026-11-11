/* Part 5: dashboard insights use only real saved timestamps; placed-out levels never grant achievements;
   mentor quick actions build honest, bounded questions. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { fixture } = require('./placement-fixture.js');
let count = 0;
function check(name, body) { body(); count++; console.log('PASS ' + name); }
const plain = v => JSON.parse(JSON.stringify(v));

function insightsIn(f) { f.load('js/progress-insights.js'); return f.window.progressInsights; }
const local = (y, m, d, h = 12) => new Date(y, m - 1, d, h).getTime();
const NOW = local(2026, 11, 11, 15);
const iso = ms => new Date(ms).toISOString();

const f = fixture({ owner: 'insights@example.com' });
const pi = insightsIn(f);

check('Activity comes only from saved timestamps; lessons without a time are not counted', () => {
    const progress = { version: 1, lessons: ['variables', 'data-types'], tasks: [], assessments: { 1: { score: 50, submittedAt: iso(local(2026, 11, 10)) }, 2: { score: 80 } },
        checks: { variables: { correct: true, checkedAt: iso(local(2026, 11, 11, 9)) }, broken: { checkedAt: 'not-a-date' } },
        taskResults: { 'student-profile': { passed: 1, total: 3, submittedAt: iso(local(2026, 11, 9)) } } };
    const events = pi.events(progress, { status: 'submitted', submittedAt: iso(local(2026, 11, 5)) });
    assert.deepEqual(plain(events.map(e => e.type)), ['lesson-check', 'quiz', 'task-run', 'placement']);
    assert.equal(pi.events(progress, { status: 'in-progress', submittedAt: iso(local(2026, 11, 5)) }).length, 3, 'unsubmitted placement is not activity');
    assert.equal(pi.events({ version: 1, lessons: ['a', 'b', 'c'], tasks: ['x'], assessments: {} }, null).length, 0, 'no fabricated activity');
});
check('Weekly chart counts real events per local day for the last 7 days', () => {
    const events = [local(2026, 11, 11, 8), local(2026, 11, 11, 9), local(2026, 11, 8), local(2026, 11, 4, 23), local(2026, 11, 5, 1)].map(ms => ({ type: 'quiz', at: iso(ms) }));
    const days = pi.weekly(events, NOW);
    assert.equal(days.length, 7);
    assert.equal(days[6].date, '2026-11-11'); assert.equal(days[0].date, '2026-11-05');
    assert.deepEqual(plain(days.map(d => d.count)), [1, 0, 0, 1, 0, 0, 2], 'Nov 4 is outside the window');
    assert.ok(pi.weekly([], NOW).every(d => d.count === 0));
});
check('Streak counts consecutive active days and survives until the day ends', () => {
    const at = (...days) => days.map(d => ({ at: iso(local(2026, 11, d)) }));
    assert.equal(pi.streak(at(11, 10, 9), NOW).current, 3);
    assert.equal(pi.streak(at(10, 9), NOW).current, 2, 'yesterday still counts before today ends');
    assert.equal(pi.streak(at(9, 8, 7), NOW).current, 0, 'a missed day resets the streak');
    assert.equal(pi.streak(at(11, 9, 8, 7, 6), NOW).longest, 4);
    assert.deepEqual(plain(pi.streak([], NOW)), { current: 0, longest: 0, lastActive: null });
});

check('Achievements come from real progress only', () => {
    const course = f.course;
    const level1 = course.levels[0];
    const none = pi.achievements({ version: 1, lessons: [], tasks: [], assessments: {} }, course, null);
    assert.ok(none.every(a => !a.earned));
    const real = { version: 1, lessons: level1.lessons.map(l => l.id), tasks: [level1.tasks[0]], assessments: { [level1.id]: { score: 75, submittedAt: iso(NOW) } },
        taskResults: { [level1.tasks[0]]: { passed: 2, total: 2, submittedAt: iso(NOW - 1000) } } };
    const earned = Object.fromEntries(pi.achievements(real, course, { status: 'submitted', submittedAt: iso(NOW) }).map(a => [a.id, a]));
    assert.ok(earned['first-lesson'].earned && earned['first-lesson'].earnedAt === null, 'lesson completion has no saved time, so none is shown');
    assert.ok(earned['first-task'].earned && earned['first-task'].earnedAt === iso(NOW - 1000));
    assert.ok(earned['level-1'].earned && !earned['level-2'].earned);
    assert.ok(earned.placement.earned);
    const lowQuiz = { ...real, assessments: { [level1.id]: { score: 69, submittedAt: iso(NOW) } } };
    assert.equal(pi.achievements(lowQuiz, course, null).find(a => a.id === 'level-1').earned, false, 'a failed quiz does not complete the level');
});
check('Placed-out levels never grant achievements (real placement flow)', () => {
    const g = fixture({ owner: 'placed-out@example.com' });
    const gi = insightsIn(g);
    const submitted = g.finish(g.store.bank().questions.map(q => q.correct));
    g.store.applyRecommended(JSON.stringify(submitted), g.store.capture());
    const progress = g.course.read();
    assert.ok(g.course.levels.some(level => g.course.placedOut(level, progress)), 'fixture really placed out of earlier levels');
    const list = gi.achievements(progress, g.course, JSON.parse(g.storage.getItem('codementor-demo-placement')));
    assert.ok(list.filter(a => a.id.startsWith('level-')).every(a => !a.earned));
    assert.ok(!list.find(a => a.id === 'first-lesson').earned && !list.find(a => a.id === 'first-task').earned);
    assert.ok(list.find(a => a.id === 'placement').earned, 'taking placement is the only milestone');
});
check('Continue target follows the latest unfinished activity, else the next lesson', () => {
    const course = f.course, level1 = course.levels[0];
    const base = { version: 1, lessons: [], tasks: [], assessments: {} };
    const fresh = pi.continueTarget(base, course, []);
    assert.equal(fresh.kind, 'lesson'); assert.match(fresh.href, new RegExp(level1.lessons[0].id)); assert.equal(fresh.at, null);
    const taskRun = { ...base, taskResults: { [level1.tasks[0]]: { passed: 0, total: 2, submittedAt: iso(NOW) } } };
    const t = pi.continueTarget(taskRun, course, pi.events(taskRun, null));
    assert.equal(t.kind, 'task'); assert.match(t.href, new RegExp(level1.tasks[0]));
    const solved = { ...taskRun, tasks: [level1.tasks[0]] };
    assert.equal(pi.continueTarget(solved, course, pi.events(solved, null)).kind, 'lesson', 'a passed task is not offered again');
});
check('Insights never write storage', () => {
    const before = JSON.stringify([...f.shared.local.entries()]);
    pi.achievements(f.course.read(), f.course, null); pi.continueTarget(f.course.read(), f.course, []); pi.weekly([], NOW); pi.streak([], NOW);
    assert.equal(JSON.stringify([...f.shared.local.entries()]), before);
    assert.ok(!/setItem|removeItem/.test(fs.readFileSync('js/progress-insights.js', 'utf8')));
});
check('Dashboard markup says what is counted and keeps a text view of the chart', () => {
    const html = fs.readFileSync('pages/student/dashboard.html', 'utf8');
    assert.match(html, /Lesson completions have no saved time and are not counted here/);
    assert.match(html, /Levels you placed out of do not count/);
    assert.ok(html.indexOf('progress-insights.js') < html.indexOf('dashboard-insights.js'));
    assert.ok(!/Math\.random/.test(fs.readFileSync('js/dashboard-insights.js', 'utf8')), 'no random or placeholder numbers');
});

// Mentor quick actions
const qaWindow = {};
require('node:vm').runInNewContext(fs.readFileSync('js/mentor-quick-actions.js', 'utf8'), { window: qaWindow, document: { getElementById: () => null }, location: { search: '' }, URLSearchParams, sessionStorage: { getItem: () => null } });
const qa = qaWindow.mentorQuickActions;
check('Quick actions prefill code and the last saved test failure', () => {
    const failure = qa.failureText({ passed: 1, total: 3, cases: [{ passed: true }, { passed: false, input: '5', expected: '25', output: '10', error: '' }] });
    assert.match(failure, /1\/3 passed/); assert.match(failure, /Expected: 25/); assert.match(failure, /Got: 10/);
    const q = qa.buildQuestion('explain', { code: 'x = 5\nprint(x * 2)', failure, taskTitle: 'Square a number', language: 'Python' });
    assert.match(q, /explain this error/); assert.match(q, /Task: Square a number/); assert.match(q, /Expected: 25/); assert.match(q, /My Python code:\nx = 5\nprint\(x \* 2\)/);
    const errorFailure = qa.failureText({ passed: 0, total: 1, cases: [{ passed: false, error: 'NameError: name y is not defined' }] });
    assert.match(errorFailure, /Error: NameError/);
    assert.equal(qa.failureText({ passed: 2, total: 2, cases: [{ passed: true }] }), '');
});
check('Quick actions stay honest and within the 2,000-character limit', () => {
    assert.match(qa.buildQuestion('explain', { code: 'print(1)' }), /No failed test is saved yet/);
    assert.ok(!/Expected/.test(qa.buildQuestion('review', { code: 'print(1)', failure: 'Expected: 2' })), 'review does not include failures');
    const long = qa.buildQuestion('hint', { code: 'x'.repeat(5000), failure: 'Last test run: 0/1 passed.' });
    assert.ok(long.length <= 2000); assert.match(long, /code shortened to fit/); assert.match(long, /Last test run/);
    assert.throws(() => qa.buildQuestion('solve-it-for-me', {}), /Unknown/);
    const source = fs.readFileSync('js/mentor-quick-actions.js', 'utf8');
    assert.match(source, /no live AI/); assert.ok(!/fetch\(|XMLHttpRequest|sendBeacon/.test(source), 'nothing is sent anywhere');
    for (const page of ['pages/student/workspace.html', 'pages/student/mentor.html']) assert.ok(fs.readFileSync(page, 'utf8').includes('mentor-quick-actions.js'));
    assert.match(fs.readFileSync('pages/student/mentor.html', 'utf8'), /Prepared responses · No live AI connection/, 'the honest badge is kept');
});
check('Demo tour is admin-guarded, only reads sample status and never seeds', () => {
    assert.ok(fs.existsSync('pages/admin/admin-demo-tour.html'));
    assert.match('pages/admin/admin-demo-tour.html', /^pages\/admin\/admin-[a-z0-9-]+\.html$/, 'matches the access-guard admin pattern');
    const tour = fs.readFileSync('js/demo-tour.js', 'utf8');
    assert.ok(/sampleStatus\(\)/.test(tour) && !/loadSample|removeSample|setItem/.test(tour));
    assert.match(tour, /The tour opens once all sample data sets are loaded/);
    assert.match(fs.readFileSync('pages/admin/admin-dashboard.html', 'utf8'), /href="admin-demo-tour.html"/);
});
console.log(`${count} progress insight checks passed.`);
