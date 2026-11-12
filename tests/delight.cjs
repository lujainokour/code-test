/* Delight layer: interaction kit (toasts/Undo, count-up, stagger, reduced motion, seen store),
   getting-started checklist, achievement unlock seen-lists, completion moments, admin polish,
   certificate reveal. Real saved state only; account-switch isolation. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { makeDocument, memory, eventWindow } = require('./helpers/fake-dom.cjs');
let count = 0;
const pending = [];
async function check(name, body) { await body(); count++; console.log('PASS ' + name); }
const plain = v => JSON.parse(JSON.stringify(v));
const deq = (a, b, m) => assert.deepEqual(plain(a), plain(b), m);

// A page context with controllable timers and a reduced-motion switch.
function kitPage({ reduced = false, local = memory(), session = memory(), owner = 'learner-a@example.test', extra = {} } = {}) {
    const dom = makeDocument();
    dom.document.documentElement = dom.document.createElement('html');
    dom.document.currentScript = { src: 'http://local.test/js/x.js' };
    const timers = [];
    const window = eventWindow({ matchMedia: q => ({ matches: reduced && /reduce/.test(q) }), ...extra });
    const frames = [];
    window.requestAnimationFrame = fn => frames.push(fn);
    const context = vm.createContext({ window, document: dom.document, localStorage: local, sessionStorage: session, crypto: globalThis.crypto, structuredClone,
        setTimeout: (fn, ms) => { timers.push({ fn, ms }); return timers.length; }, clearTimeout: id => { if (timers[id - 1]) timers[id - 1].fn = null; },
        requestAnimationFrame: fn => frames.push(fn), performance: { now: () => 0 }, URL, URLSearchParams, Event: class { constructor(t) { this.type = t; } }, CustomEvent: class { constructor(t, o = {}) { this.type = t; this.detail = o.detail; } }, console, innerWidth: 1000, innerHeight: 800, location: { pathname: '/pages/student/dashboard.html', search: '' } });
    if (owner) local.setItem('codementor-profile-v1', JSON.stringify({ name: 'Test Learner', email: owner, role: 'student', isDemo: true }));
    const load = file => vm.runInContext(fs.readFileSync(`js/${file}.js`, 'utf8'), context, { filename: file });
    return { window, dom, timers, frames, load, local, session, runTimers(ms = Infinity) { for (const t of timers) if (t.fn && t.ms <= ms) { const f = t.fn; t.fn = null; f(); } } };
}
const tick = () => new Promise(r => setImmediate(r));

(async () => {
    // ================= 1. INTERACTION KIT =================
    await check('Kit: toasts live in an aria-live region and expire after their window', async () => {
        const p = kitPage(); p.load('interaction-kit');
        let expired = 0;
        const t = p.window.interactionKit.toast('Saved.', { onExpire: () => expired++ });
        const region = p.dom.document.getElementById('ik-toasts');
        assert.equal(region.getAttribute('aria-live'), 'polite'); assert.equal(region.getAttribute('role'), 'status');
        assert.match(region.textContent, /Saved\./);
        assert.ok(p.dom.document.documentElement.classList.contains('ik'));
        p.runTimers(5000);
        assert.equal(expired, 1); assert.equal(t.settled, true);
    });
    await check('Kit: Undo runs the real restore once and cancels expiry; an expired toast cannot undo', async () => {
        const p = kitPage(); p.load('interaction-kit');
        let restored = 0, expired = 0;
        const t = p.window.interactionKit.toast('Deleted.', { undo: async () => { restored++; }, onExpire: () => expired++ });
        const button = t.element.children.find(n => n.tagName === 'BUTTON');
        assert.equal(button.textContent, 'Undo');
        await button.fire('click'); await button.fire('click');
        assert.equal(restored, 1); assert.equal(t.undone, true); assert.equal(expired, 0);
        p.runTimers(); assert.equal(expired, 0, 'expiry never runs after an undo');
        const late = p.window.interactionKit.toast('Deleted.', { undo: async () => { restored++; }, onExpire: () => expired++ });
        p.runTimers(p.window.interactionKit.UNDO_MS);
        const lateButton = late.element.children.find(n => n.tagName === 'BUTTON');
        await lateButton.fire('click');
        assert.equal(restored, 1, 'no undo after the window closed'); assert.equal(expired, 1);
    });
    await check('Kit: a failing restore is reported, never shown as restored', async () => {
        const p = kitPage(); p.load('interaction-kit');
        const t = p.window.interactionKit.toast('Deleted.', { undo: async () => { throw new Error('The undo window has closed. The post stays deleted.'); } });
        await t.element.children.find(n => n.tagName === 'BUTTON').fire('click');
        assert.equal(t.undone, false); assert.match(t.element.textContent, /window has closed/); assert.equal(t.element.dataset.tone, 'error');
    });
    await check('Kit: count-up animates only on first render and shows the final value under reduced motion', async () => {
        const p = kitPage(); p.load('interaction-kit');
        const el = p.dom.document.createElement('p');
        p.window.interactionKit.countUp(el, 4, { format: v => `${v} / 24` });
        assert.equal(el.textContent, '0 / 24'); assert.equal(el.getAttribute('aria-label'), '4 / 24', 'screen readers get the real value at once');
        assert.equal(p.frames.length, 1);
        p.window.interactionKit.countUp(el, 5, { format: v => `${v} / 24` });
        assert.equal(el.textContent, '5 / 24', 'updates never re-animate'); assert.equal(p.frames.length, 1);
        const r = kitPage({ reduced: true }); r.load('interaction-kit');
        const el2 = r.dom.document.createElement('p');
        r.window.interactionKit.countUp(el2, 4, { format: v => `${v} / 24` });
        assert.equal(el2.textContent, '4 / 24'); assert.equal(r.frames.length, 0);
    });
    await check('Kit: reduced motion skips stagger, confetti and rocket but keeps toasts', async () => {
        const r = kitPage({ reduced: true }); r.load('interaction-kit');
        const box = r.dom.document.createElement('div'); box.append(r.dom.document.createElement('p'));
        r.window.interactionKit.stagger(box);
        assert.ok(!box.classList.contains('ik-stagger'));
        assert.equal(r.window.interactionKit.confetti(), false); assert.equal(r.window.interactionKit.rocket(), false);
        r.window.interactionKit.toast('Still announced.');
        assert.match(r.dom.document.getElementById('ik-toasts').textContent, /Still announced/);
        const css = fs.readFileSync('css/interaction-kit.css', 'utf8');
        assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*animation: none !important[\s\S]*transition: none !important|@media \(prefers-reduced-motion: reduce\)[\s\S]*transition: none !important[\s\S]*animation: none !important/);
    });
    await check('Kit: the seen store is per account and refuses writes after an account switch', async () => {
        const local = memory();
        const p = kitPage({ local }); p.load('learning-storage'); p.load('interaction-kit');
        const a = p.window.interactionKit.seenStore('learner-a@example.test');
        assert.equal(a.set('checklistCelebrated', true), true);
        assert.equal(a.get('checklistCelebrated'), true);
        const b = p.window.interactionKit.seenStore('learner-b@example.test');
        assert.equal(b.get('checklistCelebrated'), undefined, 'another account has its own list');
        assert.equal(b.set('x', 1), false, 'not the signed-in account');
        local.setItem('codementor-profile-v1', JSON.stringify({ name: 'B', email: 'learner-b@example.test', role: 'student', isDemo: true }));
        assert.equal(a.set('checklistCelebrated', false), false, 'stale page cannot write after the account changed');
        assert.equal(a.get('checklistCelebrated'), true);
        assert.equal(p.window.interactionKit.seenStore('guest'), null);
        local.setItem(a.key, '{broken');
        local.setItem('codementor-profile-v1', JSON.stringify({ name: 'A', email: 'learner-a@example.test', role: 'student', isDemo: true }));
        assert.equal(a.set('x', 1), false); assert.equal(local.getItem(a.key), '{broken', 'unreadable data is kept');
    });

    // Undo correctness against the real community store
    function communityTab(shared, account, { admin = false } = {}) {
        const session = memory();
        if (admin) session.setItem('codementor-admin-session', JSON.stringify({ role: 'admin', isDemo: true, signedInAt: Date.now() - 1000 }));
        const state = { account };
        const window = eventWindow({ platformStore: { student(expected) { if (!state.account) throw new Error('Sign in'); if (expected !== undefined && state.account.email !== expected) throw new Error('Your student account changed.'); return state.account; } } });
        const ctx = vm.createContext({ window, localStorage: shared, sessionStorage: session, navigator: globalThis.navigator, crypto: globalThis.crypto, structuredClone, Event: class { constructor(t) { this.type = t; } }, console });
        for (const f of ['community-membership', 'community-store']) vm.runInContext(fs.readFileSync(`js/${f}.js`, 'utf8'), ctx);
        return { state, m: window.communityMembership, s: window.communityStore };
    }
    const A = { name: 'Learner A', email: 'learner-a@example.test', role: 'student', isDemo: true }, B = { name: 'Learner B', email: 'learner-b@example.test', role: 'student', isDemo: true };
    const cshared = memory();
    const ca = communityTab(cshared, A), cb = communityTab(cshared, B), cadmin = communityTab(cshared, null, { admin: true });
    // Community v2: 'python' is an open channel, so no join request or approval is needed (intentional model change).
    await check('Undo: deleting your own post is restored exactly (replies, reactions and id)', async () => {
        const id = await ca.s.createPost({ channel: 'python', title: 'Undo me', body: 'Body', code: 'print(1)', language: 'python', tags: 'undo' }, A.email);
        await cb.s.reply(id, 'A reply from B', B.email); await cb.s.react(id, 'helpful', B.email);
        const before = JSON.stringify(JSON.parse(cshared.getItem('codementor-community-v1')).posts.find(p => p.id === id));
        await ca.s.deletePost(id, A.email);
        assert.ok(!cshared.getItem('codementor-community-v1').includes('Undo me'));
        assert.equal(await ca.s.undoDelete(id, A.email), true);
        assert.equal(JSON.stringify(JSON.parse(cshared.getItem('codementor-community-v1')).posts.find(p => p.id === id)), before);
        await assert.rejects(ca.s.undoDelete(id, A.email), /no longer be restored/, 'a second undo does nothing');
    });
    await check('Undo: closed window, another account and another tab can never restore', async () => {
        const id = await ca.s.createPost({ channel: 'python', title: 'Gone', body: 'Body' }, A.email);
        await ca.s.deletePost(id, A.email);
        await assert.rejects(ca.s.undoDelete(id, A.email, Date.now() + ca.s.UNDO_WINDOW_MS + 1), /window has closed/);
        assert.ok(!cshared.getItem('codementor-community-v1').includes('"Gone"'));
        const id2 = await ca.s.createPost({ channel: 'python', title: 'Gone two', body: 'Body' }, A.email);
        await ca.s.deletePost(id2, A.email);
        await assert.rejects(cb.s.undoDelete(id2, B.email), /no longer be restored/, 'another tab or account has no snapshot');
        ca.state.account = B;
        await assert.rejects(ca.s.undoDelete(id2, A.email), /account changed/, 'account switch blocks the restore');
        ca.state.account = A;
        assert.equal(await ca.s.undoDelete(id2, A.email), true, 'the author can still restore within the window');
    });
    await check('Undo is offered only where the restore is real (community post deletion)', async () => {
        const ui = fs.readFileSync('js/community.js', 'utf8');
        assert.match(ui, /deleteWithUndo/); assert.match(ui, /store\.undoDelete\(post\.id, owner\)/);
        for (const file of ['js/peer-mentoring-ui.js', 'js/admin-community.js', 'js/admin-companies.js']) assert.ok(!/undo:/.test(fs.readFileSync(file, 'utf8')), `${file} offers no unsafe Undo`);
    });

    // ================= 2. GETTING-STARTED CHECKLIST =================
    const CORE = ['learning-storage', 'language-catalog', 'placement-banks', 'placement-engine', 'placement-store', 'placement-data', 'python-lessons', 'python-extension', 'curriculum-registry', 'curricula/python', 'curricula/javascript', 'python-curriculum', 'learning-support', 'progress-insights', 'student-overview', 'student-premium', 'interaction-kit', 'community-membership', 'getting-started'];
    const lkey = (owner, k, lang = 'python') => `codementor-learning-v1:${encodeURIComponent(owner)}:${lang === 'python' ? k : `${lang}:${k}`}`;
    function studentPage({ local = memory(), session = memory(), owner = 'learner-a@example.test', language = 'python', reduced = false, extra = [] } = {}) {
        local.setItem(lkey(owner, 'codementor-demo-onboarding'), JSON.stringify({ language, experience: 'beginner', goal: 'foundations' }));
        const p = kitPage({ local, session, owner, reduced });
        p.window.subscriptionStore = { canAccessLevel: id => id <= 5 };
        p.window.studentServicesStore = { session() { return JSON.parse(p.window.cmStorage.getItem('codementor-demo-session')); }, ownRecords: () => [] };
        p.window.platformStore = { assertAccess() {}, registerStudent() {}, student(expected) { const a = JSON.parse(p.window.cmStorage.getItem('codementor-demo-session')); if (expected !== undefined && a.email !== expected) throw new Error('Your student account changed.'); return a; } };
        for (const f of [...CORE, ...extra]) p.load(f);
        p.build = () => p.window.studentOverview.build();
        return p;
    }
    const approve = (local, owner, channel = 'python') => local.setItem('codementor-community-memberships-v1', JSON.stringify({ version: 1, requests: [...(JSON.parse(local.getItem('codementor-community-memberships-v1') || '{"requests":[]}').requests), { id: 'm-' + owner + channel, channel, owner, name: 'Learner', reason: 'Learning', status: 'approved', updatedAt: new Date().toISOString() }] }));
    const done = { version: 1, lessons: ['variables'], tasks: ['student-profile'], assessments: {}, taskResults: { 'student-profile': { passed: 3, total: 3, submittedAt: new Date().toISOString() } } };

    await check('Checklist: a new student sees language done and the first lesson as the current step', async () => {
        const p = studentPage(); const gs = p.window.gettingStarted;
        const r = gs.compute(gs.inputFrom(p.build()));
        deq(r.steps.map(s => [s.id, s.state]), [['language', 'done'], ['placement', 'todo'], ['lesson', 'current'], ['run', 'todo'], ['task', 'todo'], ['community', 'todo']]);
        assert.equal(r.total, 5, 'placement is optional'); assert.equal(r.doneCount, 1); assert.equal(r.percent, 20); assert.equal(r.allDone, false);
    });
    await check('Checklist: pure rules for locked, pending community and all-done states', async () => {
        const p = studentPage(); const gs = p.window.gettingStarted;
        const locked = gs.compute({ ready: false, lessonsDone: 0, tasksDone: 0, ranCode: false, community: 'none', placementAvailable: true });
        deq(locked.steps.filter(s => s.state === 'locked').map(s => s.id), ['placement', 'lesson', 'run', 'task']);
        assert.equal(locked.steps.find(s => s.id === 'language').state, 'current');
        const pending = gs.compute({ ready: true, lessonsDone: 1, tasksDone: 1, ranCode: true, community: 'pending', placementAvailable: true });
        assert.equal(pending.steps.find(s => s.id === 'community').note, 'Request sent, waiting for approval'); assert.equal(pending.allDone, false);
        const all = gs.compute({ ready: true, lessonsDone: 1, tasksDone: 1, ranCode: true, community: 'approved', placementState: 'missing', placementAvailable: true });
        assert.equal(all.allDone, true, 'optional placement is not required');
        const ranOnly = gs.compute({ ready: true, lessonsDone: 1, tasksDone: 0, ranCode: true, community: 'none' });
        assert.equal(ranOnly.steps.find(s => s.id === 'run').state, 'done'); assert.equal(ranOnly.steps.find(s => s.id === 'task').state, 'current');
    });
    await check('Checklist: placed-out levels never complete a step', async () => {
        const p = studentPage({ owner: 'placed@example.test' });
        const store = p.window.placementStore;
        let attempt = store.begin(store.capture());
        attempt = store.save({ answers: store.bank().questions.map(q => q.correct), currentQuestion: store.bank().questions.length - 1 }, JSON.stringify(attempt), store.capture());
        store.applyRecommended(JSON.stringify(store.submit(JSON.stringify(attempt), store.capture())), store.capture());
        const r = p.window.gettingStarted.compute(p.window.gettingStarted.inputFrom(p.build()));
        assert.equal(r.steps.find(s => s.id === 'placement').state, 'done');
        for (const id of ['lesson', 'run', 'task']) assert.notEqual(r.steps.find(s => s.id === id).state, 'done', id);
    });
    await check('Checklist: follows the active language (Python progress never completes JavaScript steps)', async () => {
        const local = memory();
        local.setItem(lkey('learner-a@example.test', 'codementor-demo-learning'), JSON.stringify(done));
        local.setItem(lkey('learner-a@example.test', 'codementor-demo-language'), JSON.stringify('javascript'));
        const p = studentPage({ local, language: 'javascript' });
        const r = p.window.gettingStarted.compute(p.window.gettingStarted.inputFrom(p.build()));
        for (const id of ['lesson', 'run', 'task']) assert.notEqual(r.steps.find(s => s.id === id).state, 'done', id);
    });
    await check('Checklist: celebration plays once per account, then collapses to "Setup complete"', async () => {
        const local = memory();
        local.setItem(lkey('learner-a@example.test', 'codementor-demo-learning'), JSON.stringify(done)); approve(local, 'learner-a@example.test');
        const p = studentPage({ local }); const host = p.dom.document.createElement('section');
        const r = p.window.gettingStarted.render(p.build(), host);
        assert.equal(r.allDone, true);
        assert.match(p.dom.document.querySelector('#ik-toasts').textContent, /Setup complete/);
        assert.ok(p.dom.walk().some(n => n.className === 'ik-rocket'), 'rocket launched');
        assert.equal(p.window.interactionKit.seenStore('learner-a@example.test').get('checklistCelebrated'), true);
        p.runTimers(); assert.equal(host.dataset.state, 'complete'); assert.match(host.textContent, /Setup complete/);
        const again = studentPage({ local }); const host2 = again.dom.document.createElement('section');
        again.window.gettingStarted.render(again.build(), host2);
        assert.equal(host2.dataset.state, 'complete'); assert.equal(again.dom.document.querySelector('#ik-toasts'), null, 'never replays');
        local.setItem(lkey('learner-b@example.test', 'codementor-demo-learning'), JSON.stringify(done)); approve(local, 'learner-b@example.test');
        const b = studentPage({ local, owner: 'learner-b@example.test' }); const hostB = b.dom.document.createElement('section');
        b.window.gettingStarted.render(b.build(), hostB);
        assert.match(b.dom.document.querySelector('#ik-toasts').textContent, /Setup complete/, 'another account gets its own first celebration');
    });
    await check('Checklist: reduced motion shows the result without animation; an account switch blocks the celebration', async () => {
        const local = memory();
        local.setItem(lkey('learner-a@example.test', 'codementor-demo-learning'), JSON.stringify(done)); approve(local, 'learner-a@example.test');
        const r = studentPage({ local, reduced: true }); const host = r.dom.document.createElement('section');
        r.window.gettingStarted.render(r.build(), host);
        assert.ok(!r.dom.walk().some(n => n.className === 'ik-rocket'));
        assert.match(r.dom.document.querySelector('#ik-toasts').textContent, /Setup complete/, 'the message is not motion-only');
        r.runTimers(0); assert.equal(host.dataset.state, 'complete');
        const local2 = memory();
        local2.setItem(lkey('learner-a@example.test', 'codementor-demo-learning'), JSON.stringify(done)); approve(local2, 'learner-a@example.test');
        const s = studentPage({ local: local2 }); const model = s.build();
        local2.setItem('codementor-profile-v1', JSON.stringify({ name: 'B', email: 'learner-b@example.test', role: 'student', isDemo: true }));
        const hostS = s.dom.document.createElement('section'); s.window.gettingStarted.render(model, hostS);
        assert.equal(s.dom.document.querySelector('#ik-toasts'), null);
        assert.equal(s.window.interactionKit.seenStore('learner-a@example.test').get('checklistCelebrated'), undefined);
    });
    await check('Checklist: the dashboard keeps exactly one "Continue" with the checklist present', async () => {
        const html = fs.readFileSync('pages/student/dashboard.html', 'utf8');
        assert.match(html, /id="getting-started"/);
        assert.ok(!/Continue/.test(fs.readFileSync('js/getting-started.js', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')), 'checklist links never say Continue');
    });

    // ================= 3. ACHIEVEMENT UNLOCK MOMENTS =================
    await check('Unlocks: pure diff initialises silently, announces new badges once, shines once on My progress', async () => {
        const p = studentPage({ extra: ['achievement-moments'] }); const am = p.window.achievementMoments;
        const first = am.diff(['first-lesson'], undefined);
        assert.equal(first.initialised, true); deq(first.announce, []); deq(first.next, { notified: ['first-lesson'], shined: ['first-lesson'] });
        const second = am.diff(['first-lesson', 'first-task'], first.next);
        deq(second.announce, ['first-task']); deq(second.shine, [], 'no shine outside My progress');
        const onProgress = am.diff(['first-lesson', 'first-task'], second.next, { shineHere: true });
        deq(onProgress.announce, [], 'never announced twice'); deq(onProgress.shine, ['first-task']);
        const later = am.diff(['first-lesson', 'first-task'], onProgress.next, { shineHere: true });
        deq(later.announce, []); deq(later.shine, [], 'shine plays once');
    });
    await check('Unlocks: existing badges are never replayed; a real new unlock gets a toast and a badge shine', async () => {
        const local = memory(); const owner = 'learner-a@example.test';
        local.setItem(lkey(owner, 'codementor-demo-learning'), JSON.stringify({ version: 1, lessons: ['variables'], tasks: [], assessments: {} }));
        const first = studentPage({ local, extra: ['achievement-moments'] });
        first.window.achievementMoments.run(first.build());
        assert.equal(first.dom.document.querySelector('#ik-toasts'), null, 'first visit: old unlocks stay quiet');
        local.setItem(lkey(owner, 'codementor-demo-learning'), JSON.stringify(done));
        const dash = studentPage({ local, extra: ['achievement-moments'] });
        const r = dash.window.achievementMoments.run(dash.build(), { page: 'dashboard' });
        deq(r.announce, ['first-task']);
        assert.match(dash.dom.document.querySelector('#ik-toasts').textContent, /Badge unlocked: First passing code/);
        const prog = studentPage({ local, extra: ['achievement-moments', 'progress-overview'] });
        const card = prog.dom.walk().find(n => n.dataset.achievement === 'first-task');
        assert.ok(card.classList.contains('ik-shine'), 'one-time shine in My progress');
        assert.equal(prog.dom.document.querySelector('#ik-toasts'), null, 'not announced twice');
        prog.window.fire('pageshow');
        assert.ok(prog.dom.walk().find(n => n.dataset.achievement === 'first-task').classList.contains('ik-shine'), 'a re-render in the same view keeps the shine');
        const again = studentPage({ local, extra: ['achievement-moments', 'progress-overview'] });
        assert.ok(!again.dom.walk().find(n => n.dataset.achievement === 'first-task').classList.contains('ik-shine'));
    });
    await check('Unlocks: placed-out levels never fire', async () => {
        const local = memory(); const owner = 'placed@example.test';
        const p = studentPage({ local, owner, extra: ['achievement-moments'] });
        p.window.achievementMoments.run(p.build());
        const store = p.window.placementStore;
        let attempt = store.begin(store.capture());
        attempt = store.save({ answers: store.bank().questions.map(q => q.correct), currentQuestion: store.bank().questions.length - 1 }, JSON.stringify(attempt), store.capture());
        store.applyRecommended(JSON.stringify(store.submit(JSON.stringify(attempt), store.capture())), store.capture());
        const after = studentPage({ local, owner, extra: ['achievement-moments'] });
        const r = after.window.achievementMoments.run(after.build());
        deq(r.announce, ['placement'], 'only the real placement badge');
        assert.ok(!r.announce.some(id => id.startsWith('level-')));
    });
    await check('Unlocks: never fire on another account after an account switch; seen lists are per account and language', async () => {
        const local = memory(); const owner = 'learner-a@example.test';
        local.setItem(lkey(owner, 'codementor-demo-learning'), JSON.stringify({ version: 1, lessons: [], tasks: [], assessments: {} }));
        const a = studentPage({ local, extra: ['achievement-moments'] });
        a.window.achievementMoments.run(a.build());
        local.setItem(lkey(owner, 'codementor-demo-learning'), JSON.stringify(done));
        const stale = studentPage({ local, extra: ['achievement-moments'] }); const model = stale.build();
        local.setItem('codementor-profile-v1', JSON.stringify({ name: 'B', email: 'learner-b@example.test', role: 'student', isDemo: true }));
        assert.equal(stale.window.achievementMoments.run(model), null);
        assert.equal(stale.dom.document.querySelector('#ik-toasts'), null, 'no toast for A shown to B');
        local.setItem(lkey('learner-b@example.test', 'codementor-demo-onboarding'), JSON.stringify({ language: 'python', experience: 'beginner', goal: 'foundations' }));
        const b = studentPage({ local, owner: 'learner-b@example.test', extra: ['achievement-moments'] });
        const rb = b.window.achievementMoments.run(b.build());
        assert.equal(rb.initialised, true, 'B starts its own list');
        const seenA = a.window.interactionKit.seenStore(owner);
        assert.ok(Array.isArray(seenA.get('achievements:python').notified));
        assert.equal(seenA.get('achievements:javascript'), undefined, 'lists are per language');
    });

    // ================= 4. LESSON / LEVEL COMPLETION =================
    function lessonDom(p) {
        const d = p.dom.document;
        const panel = d.createElement('section'); panel.className = 'lesson-next-panel'; panel.append(d.createElement('h2'));
        const actions = d.createElement('div'); actions.className = 'lesson-next-actions';
        const complete = d.createElement('button'); complete.className = 'button button-primary lesson-complete'; complete.id = 'complete-lesson'; complete.hidden = true;
        const next = d.createElement('a'); next.className = 'button button-outline'; next.id = 'next-activity'; next.textContent = 'Next lesson →';
        actions.append(complete, next); panel.append(actions); p.dom.body.append(panel);
        const result = d.createElement('p'); result.id = 'assessment-result'; const wrap = d.createElement('div'); wrap.append(result); p.dom.body.append(wrap);
        return { panel, next, wrap };
    }
    const primaries = root => root.children.flatMap(function walk(n) { return [n, ...n.children.flatMap(walk)]; }).filter(n => n.classList?.contains('button-primary') && !n.hidden);
    await check('Completion: pure diff finds new lessons and really completed levels only', async () => {
        const p = studentPage({ extra: ['completion-moments'] }); const cm = p.window.completionMoments, c = p.window.pythonCurriculum, l1 = c.levels[0];
        const base = { version: 1, lessons: [], tasks: [], assessments: {} };
        deq(cm.diff(base, { ...base, lessons: ['variables'] }), { lessons: ['variables'], levels: [] });
        const allL1 = { ...base, lessons: l1.lessons.map(l => l.id) };
        deq(cm.diff(allL1, { ...allL1, assessments: { 1: { score: 69 } } }).levels, [], 'a failed quiz completes nothing');
        deq(cm.diff(allL1, { ...allL1, assessments: { 1: { score: 75 } } }).levels, [1]);
        deq(cm.diff({ ...base, lessons: ['ghost'] }, { ...base, lessons: ['ghost', 'unknown'] }).lessons, [], 'unknown ids ignored');
    });
    await check('Completion: saving a lesson shows a small moment and keeps exactly one primary action', async () => {
        const p = studentPage({ extra: ['completion-moments'] }); const { panel, next } = lessonDom(p);
        p.window.cmStorage.setItem('codementor-demo-learning', JSON.stringify({ version: 1, lessons: ['variables'], tasks: [], assessments: {} }));
        p.runTimers(0);
        const box = panel.children.find(n => n.className?.includes('cm-moment-lesson'));
        assert.ok(box && /Lesson complete/.test(box.textContent) && box.getAttribute('role') === 'status');
        assert.ok(box.children.some(n => n.tagName === 'SVG'), 'animated check');
        assert.ok(next.classList.contains('button-primary'));
        assert.equal(primaries(panel).length, 1, 'one primary next action only');
    });
    await check('Completion: passing a level quiz shows the larger moment above the existing next step', async () => {
        const local = memory(); const owner = 'learner-a@example.test';
        const l1 = ['variables', 'data-types', 'input-output', 'numbers'];
        local.setItem(lkey(owner, 'codementor-demo-learning'), JSON.stringify({ version: 1, lessons: l1, tasks: [], assessments: {} }));
        const p = studentPage({ local, extra: ['completion-moments'] }); const { wrap } = lessonDom(p);
        const step = p.dom.document.createElement('div'); step.id = 'assessment-next-step';
        const go = p.dom.document.createElement('a'); go.className = 'button button-primary'; go.textContent = 'Continue to Level 2 →'; step.append(go); wrap.append(step);
        p.window.cmStorage.setItem('codementor-demo-learning', JSON.stringify({ version: 1, lessons: l1, tasks: [], assessments: { 1: { score: 75, submittedAt: new Date().toISOString() } } }));
        p.runTimers(0);
        const box = step.children.find(n => n.className?.includes('cm-moment-level'));
        assert.ok(box && /Level 1 complete!/.test(box.textContent));
        assert.equal(primaries(step).length, 1, 'still one primary action');
    });
    await check('Completion: placement never triggers a moment; reduced motion keeps the message', async () => {
        const p = studentPage({ owner: 'placed@example.test', extra: ['completion-moments'] }); const { panel } = lessonDom(p);
        const store = p.window.placementStore;
        let attempt = store.begin(store.capture());
        attempt = store.save({ answers: store.bank().questions.map(q => q.correct), currentQuestion: store.bank().questions.length - 1 }, JSON.stringify(attempt), store.capture());
        store.applyRecommended(JSON.stringify(store.submit(JSON.stringify(attempt), store.capture())), store.capture());
        p.runTimers(0);
        assert.ok(!p.dom.walk().some(n => n.className?.includes?.('cm-moment')), 'placed-out levels never celebrate');
        const r = studentPage({ reduced: true, extra: ['completion-moments'] }); const dom = lessonDom(r);
        r.window.cmStorage.setItem('codementor-demo-learning', JSON.stringify({ version: 1, lessons: ['variables'], tasks: [], assessments: {} }));
        r.runTimers(0);
        assert.ok(dom.panel.children.some(n => /Lesson complete/.test(n.textContent || '')));
        assert.match(fs.readFileSync('css/interaction-kit.css', 'utf8'), /prefers-reduced-motion: reduce\)[\s\S]*\.cm-moment[^{]*\{ animation: none !important/);
    });
    await check('Completion: grading scripts are untouched by the moments layer', async () => {
        const src = fs.readFileSync('js/completion-moments.js', 'utf8');
        assert.ok(!/setItem|removeItem/.test(src), 'never writes storage');
        for (const page of ['pages/student/lesson.html', 'pages/student/level-assessment.html']) assert.match(fs.readFileSync(page, 'utf8'), /completion-moments\.js/);
    });

    // ================= 5. ADMIN DASHBOARD POLISH =================
    const DAY = 86400000, ago = d => new Date(Date.now() - d * DAY).toISOString();
    await check('Admin: ranges need dated records; trends need history before the current period', async () => {
        const p = kitPage({ owner: null }); p.load('admin-insights'); const ai = p.window.adminInsights;
        assert.equal(ai.supportsRanges([], [undefined, 'bad']), false);
        assert.equal(ai.supportsRanges([ago(1)]), true);
        deq(ai.windowCounts([ago(1), ago(2)], 7), { current: 2, previous: 0, hasHistory: false, delta: null }, 'new install: no fake trend');
        deq(ai.windowCounts([ago(1), ago(2), ago(9), ago(30)], 7), { current: 2, previous: 1, hasHistory: true, delta: 1 });
        deq(ai.windowCounts([ago(1), ago(40)], 30), { current: 1, previous: 1, hasHistory: true, delta: 0 });
        const d = ai.distribution([{ status: 'Pending' }, { status: 'Pending' }, { status: 'Approved' }], 'status', ['Pending', 'Approved', 'Rejected']);
        deq(d, { total: 3, rows: [{ label: 'Pending', count: 2, percent: 67 }, { label: 'Approved', count: 1, percent: 33 }, { label: 'Rejected', count: 0, percent: 0 }] });
    });
    function adminPage({ students = [], applications = [] } = {}) {
        const p = kitPage({ owner: null });
        const root = p.dom.document.createElement('div'); root.id = 'admin-overview-content'; p.dom.body.append(root);
        Object.assign(p.window, {
            peerMentoringStore: { admin() {}, applications: () => applications },
            platformStore: { getStudents: () => students },
            courseContentStore: { readContent: () => ({ courses: {} }) },
            companyStore: { getAdminSnapshot: () => null },
            adminSessionsStore: { getBookings: () => [], getSessions: () => [] }
        });
        for (const f of ['interaction-kit', 'admin-insights', 'admin-overview']) p.load(f);
        p.root = root; return p;
    }
    await check('Admin: no dated records means no range tabs and no trend', async () => {
        const p = adminPage();
        assert.ok(!p.dom.walk().some(n => n.className === 'overview-range-tab'));
        assert.ok(!p.dom.walk().some(n => n.className?.includes?.('overview-trend')));
        assert.match(p.root.textContent, /No real teaching applications yet/);
    });
    await check('Admin: tabs switch 7/30 days; trend only with earlier history; sample rows excluded', async () => {
        const students = [{ name: 'A', status: 'enabled', createdAt: ago(1) }, { name: 'B', status: 'enabled', createdAt: ago(3) }];
        const applications = [{ name: 'X', status: 'Pending', createdAt: ago(2), updatedAt: ago(2), language: 'Python' }, { name: 'S', status: 'Approved', createdAt: ago(1), updatedAt: ago(1), language: 'Python', sample: true }];
        const p = adminPage({ students, applications });
        const tabs = p.dom.walk().filter(n => n.className === 'overview-range-tab');
        deq(tabs.map(t => [t.textContent, t.getAttribute('aria-pressed')]), [['7 days', 'true'], ['30 days', 'false']]);
        const reg = () => p.dom.walk().find(n => n.dataset?.trend === 'registrations');
        assert.match(reg().textContent, /last 7 days2No earlier history to compare yet/);
        const app = p.dom.walk().find(n => n.dataset?.trend === 'applications');
        assert.match(app.textContent, /last 7 days1/, 'sample application not counted');
        const bars = p.dom.walk().find(n => n.className === 'overview-bars');
        deq(bars.children.map(li => [li.dataset.status, li.children[1].textContent]), [['Pending', '1 · 100%'], ['Approved', '0 · 0%'], ['Changes requested', '0 · 0%'], ['Rejected', '0 · 0%']]);
        await tabs[1].fire('click');
        assert.equal(p.dom.walk().find(n => n.dataset?.days === '30').getAttribute('aria-pressed'), 'true');
        assert.match(reg().textContent, /last 30 days2/);
        const history = adminPage({ students: [...students, { name: 'Old', status: 'enabled', createdAt: ago(10) }] });
        const regH = history.dom.walk().find(n => n.dataset?.trend === 'registrations');
        assert.match(regH.textContent, /▲ \+1 vs the previous 7 days/);
        assert.equal(regH.children.find(n => n.className === 'overview-delta').dataset.direction, 'up');
    });
    await check('Admin: stat count-up runs only on the first render', async () => {
        const p = adminPage({ students: [{ name: 'A', status: 'enabled', createdAt: ago(1) }] });
        const framesAfterFirst = p.frames.length;
        assert.ok(framesAfterFirst >= 1);
        p.window.fire('storage', { key: 'x' });
        assert.equal(p.frames.length, framesAfterFirst, 'later renders never re-animate');
        const r = kitPage({ owner: null, reduced: true });
        assert.equal(r.window.matchMedia('(prefers-reduced-motion: reduce)').matches, true);
    });
    await check('Admin: grouped sidebar keeps every admin link once; glass cards have a solid fallback', async () => {
        const shell = fs.readFileSync('js/workspace-shell.js', 'utf8');
        const links = [...shell.match(/const adminLinks = (\[[^\n]*\]);/)[1].matchAll(/\["(admin-[a-z-]+\.html)"/g)].map(m => m[1]);
        const groups = [...shell.match(/const groups = (\[\[[^\n]*\]\]);/)[1].matchAll(/"(admin-[a-z-]+\.html)"/g)].map(m => m[1]);
        assert.ok(links.every(l => groups.includes(l)) || /leftovers/.test(shell), 'every link is grouped or placed in More');
        assert.equal(new Set(groups).size, groups.length, 'no duplicates');
        const css = fs.readFileSync('css/admin-overview.css', 'utf8');
        assert.match(css, /background: var\(--card\)[\s\S]*@supports \(\(backdrop-filter: blur\(1px\)\)/);
    });

    // ================= 6. CERTIFICATES =================
    function certPage({ locked, reduced = false } = {}) {
        const p = kitPage({ owner: null, reduced });
        const doc = p.dom.document.createElement('article'); doc.className = 'certificate-document'; p.dom.body.append(doc);
        if (locked) p.dom.body.classList.add('certificate-locked');
        p.load('interaction-kit'); p.load('certificate-reveal');
        return { p, doc };
    }
    await check('Certificate: the locked state is never animated; meeting the requirements prints in once', async () => {
        const { p, doc } = certPage({ locked: true });
        assert.ok(!doc.classList.contains('cm-printing'));
        assert.equal(p.window.certificateReveal.check(), false);
        p.dom.body.classList.remove('certificate-locked');
        assert.equal(p.window.certificateReveal.check(), true);
        assert.ok(doc.classList.contains('cm-printing'));
        assert.equal(p.window.certificateReveal.check(), false, 'plays once per page view');
    });
    await check('Certificate: reduced motion shows the unlocked certificate without the reveal', async () => {
        const { doc } = certPage({ locked: false, reduced: true });
        assert.ok(!doc.classList.contains('cm-printing'));
        assert.match(fs.readFileSync('css/interaction-kit.css', 'utf8'), /prefers-reduced-motion: reduce\)[\s\S]*\.certificate-document\.cm-printing[^{]*\{ animation: none !important/);
    });
    await check('Certificate: eligibility logic and wording are untouched', async () => {
        const src = fs.readFileSync('js/certificate-reveal.js', 'utf8');
        assert.ok(!/setItem|removeItem|textContent\s*=/.test(src), 'no writes and no text changes');
        assert.match(fs.readFileSync('pages/student/certificates.html', 'utf8'), /certificate-reveal\.js/);
    });

    // ===== further sections are appended per item =====
    console.log(`${count} delight checks passed.`);
})().catch(error => { console.error(error); process.exit(1); });
