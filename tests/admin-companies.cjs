/* Part 4: admin company directory - filters, funnel counts, suspension enforcement, no sensitive output, SAMPLE removal. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { makeDocument, memory, eventWindow } = require('./helpers/fake-dom.cjs');
let count = 0;
async function check(name, body) { await body(); count++; console.log('PASS ' + name); }
const plain = v => JSON.parse(JSON.stringify(v));
const STORE = 'codementor-company-store-v1', DIR = 'codementor-company-directory-v1', SESSION = 'codementor-company-session';

function tab(shared, { admin = false, students = [], student = null } = {}) {
    const session = memory();
    if (admin) session.setItem('codementor-admin-session', JSON.stringify({ role: 'admin', isDemo: true, signedInAt: Date.now() - 1000 }));
    const dom = makeDocument();
    const window = eventWindow({
        platformStore: {
            getStudents: () => students.map(s => ({ ...s })),
            publishedTalent: () => [],
            student(expected) { if (!student) throw new Error('Sign in to a student account to continue.'); if (expected !== undefined && expected !== student.email) throw new Error('Your student account changed.'); return student; },
            repository: v => v
        }
    });
    const context = { window, localStorage: shared, sessionStorage: session, crypto: globalThis.crypto, URL, Event: class { constructor(t) { this.type = t; } }, document: dom.document, console };
    vm.createContext(context);
    vm.runInContext(fs.readFileSync('js/company-store.js', 'utf8'), context, { filename: 'company-store.js' });
    return { window, dom, store: window.companyStore, api: window.companyStore.admin, runUI() { vm.runInContext(fs.readFileSync('js/admin-companies.js', 'utf8'), context, { filename: 'admin-companies.js' }); } };
}
const now = Date.now(), daysAgo = d => new Date(now - d * 86400000).toISOString();
const PUBLISHED = { id: 'local-1', name: 'Published Learner', email: 'published@example.test', status: 'enabled', publicProfile: { bio: 'b', skills: ['Python'], projects: [] }, createdAt: daysAgo(30) };
const PRIVATE = { id: 'local-2', name: 'Private Learner Name', email: 'private@example.test', status: 'enabled', publicProfile: null, createdAt: daysAgo(30) };
const portalData = () => ({
    profile: { name: 'Portal Test Co', email: 'hr@portal.example', industry: 'Software', phone: '+000', location: 'Remote', website: 'https://portal.example', size: '10-20', about: 'A test company.', localCredential: { hash: 'private-test-hash', salt: 'private-test-salt' } },
    opportunities: [
        { id: 'p-o1', title: 'Python intern', status: 'Active', department: 'Eng', location: 'Remote', duration: '3 months', stipend: '300', skillsRequired: ['Python'], description: 'Build things.', postedAt: daysAgo(20) },
        { id: 'p-o2', title: 'Old project', status: 'Closed', department: 'Data', location: 'Remote', duration: '1 month', stipend: '100', skillsRequired: [], description: 'Done.', postedAt: daysAgo(90) }
    ],
    talentPool: [],
    applications: [
        { id: 'pa1', opportunityId: 'p-o1', studentEmail: 'published@example.test', studentName: 'Published Learner', coverNote: 'PRIVATE COVER NOTE', gpa: '3.9', university: 'Secret University', status: 'Under Review', appliedAt: daysAgo(2), linkedStudent: true },
        { id: 'pa2', opportunityId: 'p-o1', studentEmail: 'private@example.test', studentName: 'Private Learner Name', coverNote: 'PRIVATE COVER NOTE', status: 'Interview Scheduled', appliedAt: daysAgo(3), linkedStudent: true },
        { id: 'pa3', opportunityId: 'p-o1', studentEmail: 'demo@example.com', studentName: 'Portal Demo Person', status: 'Accepted', appliedAt: daysAgo(10), training: { review: { status: 'Completed' } } },
        { id: 'pa4', opportunityId: 'p-o2', studentEmail: 'demo2@example.com', studentName: 'Portal Demo Two', status: 'Declined', appliedAt: daysAgo(60) }
    ],
    messages: [{ id: 'm1', studentEmail: 'private@example.test', studentName: 'Private Learner Name', lastUpdated: daysAgo(1), thread: [{ sender: 'company', text: 'PRIVATE MESSAGE TEXT', time: daysAgo(1) }, { sender: 'student', text: 'PRIVATE REPLY TEXT', time: daysAgo(1) }] }],
    talentViews: 4
});

(async () => {
    const shared = memory();
    const admin = tab(shared, { admin: true, students: [PUBLISHED, PRIVATE] });

    await check('Only an administrator can open the directory; reading never seeds data', async () => {
        const guest = tab(shared);
        assert.throws(() => guest.api.companies(), /administrator/);
        assert.throws(() => guest.api.loadSample(), /administrator/);
        deq(plain(admin.api.companies()), []);
        assert.equal(shared.getItem(DIR), null); assert.equal(shared.getItem(STORE), null);
    });
    await check('SAMPLE companies: explicit load, six labelled fictional companies, idempotent', async () => {
        assert.equal(admin.api.loadSample(), 6);
        const before = shared.getItem(DIR);
        assert.equal(admin.api.loadSample(), 0);
        assert.equal(shared.getItem(DIR), before);
        const list = admin.api.companies();
        assert.equal(list.length, 6);
        assert.ok(list.every(c => c.sample && /\(SAMPLE\)$/.test(c.profile.name) && c.contact.email.endsWith('.sample.invalid') && c.profile.website.endsWith('.example') && /SAMPLE/.test(c.profile.description)));
        deq([...new Set(list.map(c => c.verification.status))].sort(), ['Suspended', 'Under review', 'Unverified', 'Verified']);
        assert.ok(list.some(c => c.flag));
        assert.ok(list.flatMap(c => c.opportunities).every(o => o.title.startsWith('[SAMPLE] ')));
        assert.ok(list.flatMap(c => c.opportunities.flatMap(o => o.applications)).every(a => /\(SAMPLE\)$/.test(a.applicant)));
    });
    await check('Portal company is included with whitelisted fields only', async () => {
        shared.setItem(STORE, JSON.stringify(portalData()));
        const raw = shared.getItem(STORE);
        const portal = admin.api.companies().find(c => !c.sample);
        assert.equal(portal.profile.name, 'Portal Test Co'); assert.equal(portal.contact.email, 'hr@portal.example');
        assert.equal(portal.talentViews, 4);
        assert.equal(shared.getItem(STORE), raw, 'listing never edits the portal record');
        const json = JSON.stringify(admin.api.companies());
        for (const secret of ['private-test-hash', 'private-test-salt', 'PRIVATE MESSAGE TEXT', 'PRIVATE REPLY TEXT', 'PRIVATE COVER NOTE', 'Secret University', '3.9', 'private@example.test', 'published@example.test', 'Private Learner Name', 'Portal Demo Person', 'localCredential', 'password'])
            assert.ok(!json.includes(secret), 'admin view excludes ' + secret);
    });
    await check('Student data appears only as the student consented to publish', async () => {
        const apps = admin.api.companies().find(c => !c.sample).opportunities[0].applications;
        deq(apps.map(a => a.applicant), ['Published Learner', 'Private applicant (profile not published)', 'Portal demo applicant (not a real student)']);
        deq(apps.map(a => a.messages), [0, 2, 0], 'message counts only');
    });
    await check('Funnel counts match the underlying records', async () => {
        const companies = admin.api.companies();
        const portal = companies.find(c => !c.sample);
        deq(plain(portal.opportunities[0].funnel), { applied: 1, interview: 1, accepted: 0, rejected: 0, completed: 1 });
        deq(plain(portal.opportunities[1].funnel), { applied: 0, interview: 0, accepted: 0, rejected: 1, completed: 0 });
        const dir = JSON.parse(shared.getItem(DIR));
        for (const company of companies.filter(c => c.sample)) {
            const rawCompany = dir.samples.find(s => s.id === company.id);
            for (const o of company.opportunities) {
                const rawApps = rawCompany.opportunities.find(x => x.id === o.id).applications;
                for (const stage of ['applied', 'interview', 'accepted', 'rejected', 'completed']) assert.equal(o.funnel[stage], rawApps.filter(a => a.stage === stage).length, `${o.id} ${stage}`);
                assert.equal(Object.values(o.funnel).reduce((a, b) => a + b, 0), o.applications.length);
            }
            assert.equal(company.applicationsTotal, rawCompany.opportunities.reduce((n, o) => n + o.applications.length, 0));
            deq(plain(company.funnel), ['applied', 'interview', 'accepted', 'rejected', 'completed'].reduce((f, k) => ({ ...f, [k]: rawCompany.opportunities.flatMap(o => o.applications).filter(a => a.stage === k).length }), {}));
        }
    });
    await check('Summary cards are computed from records', async () => {
        const companies = admin.api.companies(), s = admin.api.summary(companies, now);
        assert.equal(s.total, 7);
        assert.equal(s.verified, companies.filter(c => c.verification.status === 'Verified').length);
        assert.equal(s.activeOpportunities, companies.flatMap(c => c.opportunities).filter(o => o.status === 'Active').length);
        const week = companies.flatMap(c => c.opportunities.flatMap(o => o.applications)).filter(a => a.appliedAt && now - Date.parse(a.appliedAt) <= 7 * 86400000 && Date.parse(a.appliedAt) <= now).length;
        assert.equal(s.applicationsThisWeek, week);
        assert.ok(s.applicationsThisWeek >= 2);
    });
    await check('Search, verification filter, flagged filter, sample filter and sorting', async () => {
        const companies = admin.api.companies();
        deq(admin.api.filter(companies, { search: 'robotics' }).map(c => c.id), ['sample-company-4']);
        deq(admin.api.filter(companies, { search: 'irbid' }).map(c => c.id), ['sample-company-3']);
        assert.ok(admin.api.filter(companies, { status: 'Verified' }).every(c => c.verification.status === 'Verified'));
        deq(admin.api.filter(companies, { flagged: true }).map(c => c.id), ['sample-company-3']);
        deq(admin.api.filter(companies, { sample: 'real' }).map(c => c.sample), [false]);
        const byApps = admin.api.filter(companies, { sort: 'applications' });
        assert.ok(byApps.every((c, i) => i === 0 || byApps[i - 1].applicationsTotal >= c.applicationsTotal));
        const byName = admin.api.filter(companies, { sort: 'name' }).map(c => c.profile.name);
        deq(byName, [...byName].sort((a, b) => a.localeCompare(b)));
        const byNewest = admin.api.filter(companies.filter(c => c.createdAt), { sort: 'newest' });
        assert.ok(byNewest.every((c, i) => i === 0 || Date.parse(byNewest[i - 1].createdAt) >= Date.parse(c.createdAt)));
    });

    // Suspension enforcement in the company portal
    const company = tab(shared, { students: [PUBLISHED, PRIVATE], student: { name: 'Published Learner', email: 'published@example.test', role: 'student', isDemo: true } });
    shared.setItem(SESSION, JSON.stringify({ role: 'company', isDemo: true, email: 'hr@portal.example' }));
    const portalId = 'portal:hr@portal.example';
    await check('Before suspension the company can post and message', async () => {
        company.store.addOpportunity({ title: 'New role', description: 'Allowed while active.', skillsRequired: ['Python'] });
        company.store.sendMessage('private@example.test', 'Private Learner Name', 'Hello again');
    });
    await check('Suspension needs a reason and explicit confirmation', async () => {
        assert.throws(() => admin.api.setVerification(portalId, 'Suspended', '', { confirmed: true }), /reason for suspending/);
        assert.throws(() => admin.api.setVerification(portalId, 'Suspended', 'Reported spam postings.'), /Confirm/);
        assert.equal(admin.api.companies().find(c => c.id === portalId).verification.status, 'Unverified');
        assert.throws(() => company.api.setVerification(portalId, 'Suspended', 'Self suspend', { confirmed: true }), /administrator/);
        admin.api.setVerification(portalId, 'Suspended', 'Reported spam postings.', { confirmed: true });
    });
    await check('A suspended company cannot post, edit, reopen or message; it may close a listing', async () => {
        const before = shared.getItem(STORE);
        assert.throws(() => company.store.addOpportunity({ title: 'Blocked', description: 'x' }), /suspended/);
        assert.throws(() => company.store.updateOpportunity('p-o1', { title: 'Edited' }), /suspended/);
        assert.throws(() => company.store.updateOpportunity('p-o2', { status: 'Active' }), /suspended/);
        assert.throws(() => company.store.sendMessage('private@example.test', 'Private Learner Name', 'Blocked'), /suspended/);
        assert.throws(() => company.store.openConversation('published@example.test'), /suspended/);
        assert.throws(() => company.store.applyToOpportunity('p-o1', 'Please consider me.', 'published@example.test'), /paused/);
        assert.equal(shared.getItem(STORE), before, 'blocked actions write nothing');
        company.store.updateOpportunity('p-o1', { status: 'Closed' });
        assert.equal(JSON.parse(shared.getItem(STORE)).opportunities.find(o => o.id === 'p-o1').status, 'Closed');
    });
    await check('Restore needs confirmation, returns the previous status and re-enables posting', async () => {
        assert.throws(() => admin.api.restore(portalId, 'Spam removed by company.'), /Confirm/);
        assert.throws(() => admin.api.restore(portalId, '', { confirmed: true }), /reason for restoring/);
        assert.equal(admin.api.restore(portalId, 'Spam removed by company.', { confirmed: true }), 'Unverified');
        company.store.updateOpportunity('p-o1', { status: 'Active' });
        company.store.addOpportunity({ title: 'Allowed again', description: 'Restored.' });
        const history = admin.api.companies().find(c => c.id === portalId).verification.history;
        deq(history.map(h => [h.from, h.status]), [['Unverified', 'Suspended'], ['Suspended', 'Unverified']]);
        assert.ok(history.every(h => h.note && h.at && h.by === 'admin'));
    });
    await check('Verify and flag actions are recorded in history and the timeline', async () => {
        admin.api.setVerification(portalId, 'Under review', 'Checking documents.');
        admin.api.setVerification(portalId, 'Verified', 'Documents checked.');
        assert.throws(() => admin.api.setVerification(portalId, 'Verified', ''), /already Verified/);
        assert.throws(() => admin.api.flag(portalId, ''), /Explain why/);
        admin.api.flag(portalId, 'Unusual compensation wording.');
        assert.throws(() => admin.api.flag(portalId, 'Again please.'), /already flagged/);
        admin.api.flag(portalId, 'Wording fixed by company.', false);
        const c = admin.api.companies().find(x => x.id === portalId);
        assert.equal(c.flag, null);
        const texts = c.timeline.map(e => e.text).join('\n');
        for (const t of ['Verification set to Verified', 'Flagged for review — Unusual compensation wording.', 'Review flag cleared — Wording fixed by company.', 'Opportunity published: Python intern', 'Conversation updated (3 messages)']) assert.ok(texts.includes(t), t);
        assert.ok(c.timeline.every((e, i) => i === 0 || Date.parse(c.timeline[i - 1].at) >= Date.parse(e.at)));
        assert.equal(c.lastActivityAt, c.timeline[0].at);
    });
    await check('Rendered admin page shows details as text and never sensitive fields', async () => {
        const page = tab(shared, { admin: true, students: [PUBLISHED, PRIVATE] });
        page.runUI();
        const s = page.api.summary(page.api.companies());
        assert.equal(page.dom.document.querySelector('[data-stat=total]').textContent, 'Total companies' + s.total);
        assert.equal(page.dom.document.querySelector('[data-stat=week]').textContent, 'Applications this week' + s.applicationsThisWeek);
        const card = page.dom.document.querySelector(`[data-company-id="${portalId}"]`);
        const toggle = card.children.find(n => n.tagName === 'BUTTON');
        await toggle.fire('click');
        const opened = page.dom.document.querySelector(`[data-company-id="${portalId}"]`);
        for (const t of ['Verification', 'Contact person', 'Application funnel', 'Candidates', 'Timeline', 'Published talent profiles viewed', 'Private applicant (profile not published)', 'Mark verified'.replace('Mark verified', 'Suspend company')]) assert.ok(opened.textContent.includes(t), t);
        const text = page.dom.walk().map(n => n.children.length ? '' : n._text).join('\n') + page.dom.walk().map(n => n.value || '').join('\n');
        for (const secret of ['private-test', 'PRIVATE MESSAGE', 'PRIVATE REPLY', 'PRIVATE COVER', 'private@example.test', 'published@example.test', 'Private Learner Name', 'Secret University', 'password', 'salt'])
            assert.ok(!text.toLowerCase().includes(secret.toLowerCase()), 'page excludes ' + secret);
        assert.ok(!page.dom.walk().some(n => ['SCRIPT', 'IMG', 'IFRAME'].includes(n.tagName)));
        const search = page.dom.document.querySelector('#company-search');
        search.value = 'no-such-company'; await search.fire('input');
        assert.ok(page.dom.walk().filter(n => n.dataset.companyId).every(n => n.hidden));
        const flagged = page.dom.document.querySelector('#company-flagged');
        search.value = ''; await search.fire('input'); flagged.checked = true; await flagged.fire('change');
        deq(page.dom.walk().filter(n => n.dataset.companyId && !n.hidden).map(n => n.dataset.companyId), ['sample-company-3']);
    });
    await check('Removing sample data deletes only samples; the portal record and its admin state stay', async () => {
        const portalRaw = shared.getItem(STORE);
        const portalBefore = admin.api.companies().find(c => c.id === portalId);
        assert.equal(admin.api.removeSample(), 6);
        const after = admin.api.companies();
        deq(after.map(c => c.id), [portalId]);
        deq(plain(after[0].verification), plain(portalBefore.verification));
        assert.equal(shared.getItem(STORE), portalRaw);
        assert.ok(!Object.keys(JSON.parse(shared.getItem(DIR)).records).some(id => id.startsWith('sample-')));
        deq(plain(admin.api.sampleStatus()), { loaded: false, companies: 0 });
    });
    await check('Corrupt admin records fail closed: listing errors, posting pauses, nothing is overwritten', async () => {
        shared.setItem(DIR, '{broken');
        assert.throws(() => admin.api.companies(), /could not be read/);
        assert.throws(() => company.store.addOpportunity({ title: 'x', description: 'y' }), /could not be checked/);
        assert.throws(() => admin.api.loadSample(), /could not be read/);
        assert.equal(shared.getItem(DIR), '{broken');
    });
    console.log(`${count} admin company checks passed.`);
})().catch(error => { console.error(error); process.exit(1); });
function deq(a, b, m) { assert.deepEqual(plain(a), plain(b), m); }
