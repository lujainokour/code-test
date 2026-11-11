/* Part 3: peer-teaching application states, ownership, duplicate prevention, SAMPLE seed and live studio updates. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { makeDocument, memory, eventWindow } = require('./helpers/fake-dom.cjs');
let count = 0;
async function check(name, body) { await body(); count++; console.log('PASS ' + name); }
const plain = v => JSON.parse(JSON.stringify(v));
const KEY = 'codementor-peer-mentoring-v1';

function tab(shared, account, { admin = false, page = null } = {}) {
    const session = memory();
    if (admin) session.setItem('codementor-admin-session', JSON.stringify({ role: 'admin', isDemo: true, signedInAt: Date.now() - 1000 }));
    const state = { account };
    const dom = makeDocument();
    if (page) dom.body.dataset.peerPage = page;
    const window = eventWindow({
        cmStorage: { getItem: key => key === 'codementor-demo-session' && state.account ? JSON.stringify(state.account) : null },
        languageCatalog: { names: ['Python', 'JavaScript'] },
        platformStore: { assertAccess() {} }
    });
    dom.document.currentScript = { src: 'http://localhost/js/peer-mentoring-ui.js' };
    const context = { window, localStorage: shared, sessionStorage: session, navigator: globalThis.navigator, crypto: globalThis.crypto, URL, Intl, CustomEvent: class { constructor(type, o) { this.type = type; this.detail = o?.detail; } }, document: dom.document, console, setTimeout };
    vm.createContext(context);
    vm.runInContext(fs.readFileSync('js/peer-mentoring-store.js', 'utf8'), context, { filename: 'peer-mentoring-store.js' });
    return { window, state, dom, store: window.peerMentoringStore, runUI() { vm.runInContext(fs.readFileSync('js/peer-mentoring-ui.js', 'utf8'), context, { filename: 'peer-mentoring-ui.js' }); } };
}
const student = (email, name = 'Test Student') => ({ name, email, role: 'student', isDemo: true });
const DEMO = student('student@example.com', 'Demo Student');
const REAL = student('real-tutor@example.test', 'Real Tutor');
const OTHER = student('other@example.test', 'Other Learner');
const appValues = { language: 'Python', topics: 'Python loops and functions', bio: 'I explain beginner programming concepts with small examples and practice.', experience: 'I built several small Python projects and helped classmates understand loops.', portfolio: 'https://example.com/real-portfolio', outline: 'Explain one loop, trace it together, then let the learner write a similar loop alone.', agreement: true };
const sessionValues = { title: 'Loops for beginners', language: 'Python', description: 'We will trace for and while loops with small, clear examples together.', outcome: 'Write a loop independently.', requirements: 'Basic variables', level: 'Beginner', duration: 45, price: 0 };

(async () => {
    const shared = memory();
    const admin = tab(shared, null, { admin: true }), real = tab(shared, REAL), demo = tab(shared, DEMO), other = tab(shared, OTHER);

    // A real application exists before any sample data.
    await real.store.apply(appValues, REAL.email);
    const realOnly = shared.getItem(KEY);

    await check('Only an administrator can load sample data; nothing is seeded automatically', async () => {
        await assert.rejects(demo.store.loadSample(), /Admin/);
        assert.throws(() => demo.store.sampleStatus(), /Admin/);
        assert.equal(shared.getItem(KEY), realOnly);
        assert.ok(!fs.readFileSync('js/peer-mentoring-ui.js', 'utf8').includes('prepareSampleApplication()'), 'admin page no longer seeds on load');
    });
    await check('Loading sample data adds the four demo states, all labelled', async () => {
        const added = await admin.store.loadSample();
        assert.deepEqual(plain(added), { applications: 3, sessions: 1, bookings: 2, reviews: 1 });
        const data = JSON.parse(shared.getItem(KEY));
        const samples = ['applications', 'sessions', 'bookings', 'reviews'].flatMap(k => data[k].filter(x => x.sample));
        assert.equal(samples.length, 7);
        const byStatus = Object.fromEntries(data.applications.filter(a => a.sample).map(a => [a.status, a]));
        assert.deepEqual(Object.keys(byStatus).sort(), ['Approved', 'Pending', 'Rejected']);
        assert.equal(byStatus.Pending.owner, 'student@example.com');
        assert.ok(byStatus.Rejected.feedback.length >= 10, 'rejected sample carries a reviewer reason');
        assert.ok(data.applications.filter(a => a.sample).every(a => /\(SAMPLE\)$/.test(a.name) && /SAMPLE/.test(a.bio)));
        const s = data.sessions.find(x => x.sample);
        assert.ok(s.title.startsWith('[SAMPLE]') && s.status === 'Published' && s.owner === byStatus.Approved.owner);
        assert.deepEqual(data.bookings.filter(b => b.sample).map(b => b.status).sort(), ['Completed', 'Confirmed']);
        assert.equal(data.reviews.filter(r => r.sample)[0].rating, 5);
        assert.ok(samples.every(x => !/@(?!example\.com|sample\.invalid)/.test(JSON.stringify(x).match(/"(owner|student|mentor)":"[^"]+"/g)?.join('') || '')), 'only reserved example/sample addresses');
        assert.ok(!shared.getItem(KEY).includes('Lujain'), 'no real names in sample data');
    });
    await check('Loading again is idempotent', async () => {
        const before = shared.getItem(KEY);
        assert.deepEqual(plain(await admin.store.loadSample()), { applications: 0, sessions: 0, bookings: 0, reviews: 0 });
        assert.equal(shared.getItem(KEY), before);
        const both = await Promise.all([admin.store.loadSample(), admin.store.loadSample()]);
        assert.ok(both.every(r => Object.values(r).every(v => v === 0)));
        assert.equal(shared.getItem(KEY), before);
    });
    await check('The demo student sees only their own Pending sample application', async () => {
        const mine = demo.store.application();
        assert.equal(mine.status, 'Pending'); assert.equal(mine.sample, true); assert.equal(mine.owner, 'student@example.com');
        assert.equal(other.store.application(), null);
        assert.equal(real.store.application().owner, REAL.email);
        assert.throws(() => demo.store.applications(), /Admin/);
        assert.throws(() => demo.store.adminSnapshot(), /Admin/);
    });
    await check('A student never edits another student\'s application or acts as them', async () => {
        await assert.rejects(other.store.apply(appValues, DEMO.email), /account changed/);
        await assert.rejects(demo.store.reviewApplication('mentor-sample-student', 'Approved', 'Approving myself here.', 1), /Admin/);
        await assert.rejects(demo.store.apply(appValues, DEMO.email, 1), /already pending or approved/);
        assert.equal(demo.store.application().status, 'Pending');
    });
    await check('The published sample session is public, labelled and cannot be booked', async () => {
        const pub = other.store.publicSessions().find(s => s.sample);
        assert.ok(pub && pub.title.startsWith('[SAMPLE]'));
        assert.equal(pub.reviewCount, 1); assert.equal(pub.rating, 5);
        assert.ok(!JSON.stringify(pub).includes('@'));
        const slot = pub.slots.find(x => x.available);
        await assert.rejects(other.store.book(pub.id, slot.id, 'Please help me with return values.', OTHER.email), /SAMPLE session/);
    });

    // Application state transitions
    let app;
    await check('Pending → Rejected requires a reason; the student sees it', async () => {
        app = real.store.application();
        await assert.rejects(admin.store.reviewApplication(app.id, 'Rejected', 'short', app.revision), /reason for rejecting/);
        await admin.store.reviewApplication(app.id, 'Rejected', 'Lesson plan gives full answers instead of hints.', app.revision);
        app = real.store.application();
        assert.equal(app.status, 'Rejected'); assert.match(app.feedback, /full answers/);
        await assert.rejects(real.store.saveSession(sessionValues, REAL.email), /approved before creating sessions/);
    });
    await check('Rejected cannot jump to Approved; the student may submit a new application', async () => {
        await assert.rejects(admin.store.reviewApplication(app.id, 'Approved', 'Approving without a new review.', app.revision), /not available/);
        await real.store.apply(appValues, REAL.email, app.revision);
        app = real.store.application();
        assert.equal(app.status, 'Pending'); assert.equal(app.feedback, '');
    });
    await check('Pending → Changes requested → resubmitted → Approved', async () => {
        await admin.store.reviewApplication(app.id, 'Changes requested', 'Please add a beginner exercise.', app.revision);
        app = real.store.application(); assert.equal(app.status, 'Changes requested');
        await real.store.apply(appValues, REAL.email, app.revision);
        app = real.store.application();
        await assert.rejects(admin.store.reviewApplication(app.id, 'Approved', 'Stale review note.', app.revision - 1), /changed/);
        await admin.store.reviewApplication(app.id, 'Approved', 'Reviewed portfolio and lesson plan.', app.revision);
        assert.equal(real.store.application().status, 'Approved');
    });
    await check('Approval enables session creation and publishing', async () => {
        const draft = await real.store.saveSession(sessionValues, REAL.email);
        const withSlot = await real.store.addSlot(draft.id, new Date(Date.now() + 5 * 3600000).toISOString(), REAL.email);
        const published = await real.store.publish(draft.id, true, REAL.email, withSlot.revision);
        assert.equal(published.status, 'Published');
        assert.ok(other.store.publicSessions().some(s => s.id === draft.id && !s.sample));
    });
    await check('Approved → Rejected is not a valid transition; Approved → Changes requested hides listings', async () => {
        app = real.store.application();
        await assert.rejects(admin.store.reviewApplication(app.id, 'Rejected', 'Trying to reject after approval.', app.revision), /not available/);
        await admin.store.reviewApplication(app.id, 'Changes requested', 'Please update your portfolio link.', app.revision);
        assert.ok(!other.store.publicSessions().some(s => s.mentorName === 'Real Tutor'));
        app = real.store.application();
        await real.store.apply(appValues, REAL.email, app.revision);
        app = real.store.application();
        await admin.store.reviewApplication(app.id, 'Approved', 'Updated portfolio reviewed.', app.revision);
    });
    await check('Duplicate prevention: one application per student; sample never replaces a real one', async () => {
        await assert.rejects(real.store.apply(appValues, REAL.email, real.store.application().revision), /already pending or approved/);
        const data = JSON.parse(shared.getItem(KEY));
        assert.equal(new Set(data.applications.map(a => a.owner)).size, data.applications.length);
        const fresh = memory(); const t = tab(fresh, DEMO), adm = tab(fresh, null, { admin: true });
        await t.store.apply(appValues, DEMO.email);
        const added = await adm.store.loadSample();
        assert.equal(added.applications, 2, 'pending sample skipped because student@example.com already applied');
        assert.equal(t.store.application().sample, undefined);
        assert.equal(t.store.application().topics, appValues.topics);
    });

    // Removal
    await check('Removing sample data leaves real records byte-for-byte unchanged', async () => {
        const realRecords = () => { const d = JSON.parse(shared.getItem(KEY)); return JSON.stringify(['applications', 'sessions', 'bookings', 'reviews'].map(k => d[k].filter(x => !x.sample))); };
        const before = realRecords();
        const result = await admin.store.removeSample();
        assert.deepEqual(plain(result.removed), { reviews: 1, bookings: 2, sessions: 1, applications: 3 });
        assert.equal(realRecords(), before);
        assert.equal(admin.store.sampleStatus().loaded, false);
        assert.equal(demo.store.application(), null);
    });
    await check('Removal asks before deleting real records built on top of sample data', async () => {
        await admin.store.loadSample();
        await admin.store.reviewApplication('mentor-sample-student', 'Approved', 'Approved for the demo walkthrough.', 1);
        await demo.store.saveSession(sessionValues, DEMO.email);
        const before = shared.getItem(KEY);
        await assert.rejects(admin.store.removeSample(), error => error.dependents === 1 && /1 session/.test(error.message));
        assert.equal(shared.getItem(KEY), before, 'nothing removed without confirmation');
        const result = await admin.store.removeSample({ includeDependents: true });
        assert.equal(result.dependents, 1);
        const data = JSON.parse(shared.getItem(KEY));
        assert.ok(!data.sessions.some(s => s.owner === DEMO.email));
        assert.ok(data.applications.some(a => a.owner === REAL.email) && data.sessions.some(s => s.owner === REAL.email));
    });

    // Studio page: status, next steps and live updates from another tab
    await check('Studio shows the status and next steps for the student\'s own application', async () => {
        await admin.store.loadSample();
        const page = tab(shared, DEMO, { page: 'studio' });
        page.dom.document.getElementById('peer-workspace');
        page.runUI();
        const status = page.dom.document.querySelector('[data-application-status]');
        assert.equal(status.dataset.applicationStatus, 'Pending');
        assert.match(status.textContent, /SAMPLE APPLICATION/);
        assert.match(status.textContent, /Next steps/);
        assert.match(status.textContent, /updates automatically/);
        assert.ok(!page.dom.text().includes('Real Tutor'), 'no other student\'s application');
        page.test = page;
        globalThis.studio = page;
    });
    await check('An admin decision in another tab updates the studio immediately', async () => {
        const page = globalThis.studio;
        const app = admin.store.applications().find(a => a.id === 'mentor-sample-student');
        await admin.store.reviewApplication(app.id, 'Rejected', 'SAMPLE decision: please add a beginner exercise.', app.revision);
        page.window.fire('storage', { key: KEY });
        const status = page.dom.document.querySelector('[data-application-status]');
        assert.equal(status.dataset.applicationStatus, 'Rejected');
        assert.match(status.textContent, /Reviewer's reason: SAMPLE decision/);
        assert.ok(page.dom.document.querySelector('#mentor-topics'), 'a new application form is offered after rejection');
    });
    await check('Unsaved typing is protected: a change elsewhere shows a refresh prompt instead', async () => {
        const page = globalThis.studio;
        const topics = page.dom.document.querySelector('#mentor-topics');
        topics.value = 'Draft text I am still typing';
        await topics.emit('input');
        await admin.store.removeSample();
        page.window.fire('storage', { key: KEY });
        assert.equal(page.dom.document.querySelector('#mentor-topics').value, 'Draft text I am still typing');
        assert.ok(page.dom.document.querySelector('#peer-refresh'));
    });
    await check('Admin page offers explicit sample buttons and a Rejected decision', async () => {
        await admin.store.loadSample();
        const page = tab(shared, null, { admin: true, page: 'admin' });
        page.dom.document.getElementById('peer-workspace');
        page.runUI();
        const buttons = page.dom.walk().filter(n => n.tagName === 'BUTTON').map(n => n.textContent);
        assert.ok(buttons.includes('Load sample data') && buttons.includes('Remove sample data'));
        const options = page.dom.walk().filter(n => n.tagName === 'OPTION').map(n => n.textContent);
        assert.ok(options.includes('Rejected'));
        assert.match(page.dom.text(), /Rejected: 1/);
        assert.ok(!/password|salt|hash/i.test(page.dom.text()));
        await admin.store.removeSample();
    });
    console.log(`${count} peer teaching checks passed.`);
})().catch(error => { console.error(error); process.exit(1); });
