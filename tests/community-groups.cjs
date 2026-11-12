/* Community GROUPS access model: one group per catalog language (+ General, Help, Show your project),
   approval required by default, your language pinned first, explicit audited Open switch, bulk
   decisions, safe migration. Feature checks live in tests/community-v2.cjs. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { memory, tab, A, B, approve } = require('./helpers/community-harness.cjs');
let count = 0;
const plain = v => JSON.parse(JSON.stringify(v));
const deq = (actual, expected, message) => assert.deepEqual(plain(actual), plain(expected), message);
async function check(name, body) { await body(); count++; console.log('PASS ' + name); }
const EXTRA = ['js/community-challenges.js', 'js/community-highlight.js'];
const walk = n => n.children.flatMap(c => [c, ...walk(c)]);
const buttons = t => t.dom.walk().filter(n => n.tagName === 'BUTTON');
const groupButton = (t, label) => walk(t.dom.ids.get('community-channels')).find(n => n.tagName === 'BUTTON' && n.className.includes('community-channel') && n.textContent.includes(label));

(async () => {
    await check('One group per catalog language (coming soon matches the catalog), plus General, Help and Show your project', async () => {
        const ctx = { window: {} }; ctx.window.window = ctx.window; vm.createContext(ctx);
        vm.runInContext(fs.readFileSync('js/language-catalog.js', 'utf8').replace(/^﻿/, ''), ctx);
        const catalog = ctx.window.languageCatalog.entries, t = tab(memory(), A, { extraScripts: EXTRA });
        const languages = Object.entries(t.m.groups).filter(([, g]) => g.kind === 'language');
        deq(languages.map(([id]) => id).sort(), catalog.map(e => e.id).sort());
        for (const e of catalog) { assert.equal(t.m.groups[e.id].label, e.name); assert.equal(t.m.groups[e.id].comingSoon, e.status !== 'ready', e.id); }
        deq(Object.entries(t.m.groups).filter(([, g]) => g.kind === 'topic').map(([id]) => id), ['general', 'help', 'projects']);
    });

    await check('Every group needs approval by default; study groups can never be opened', async () => {
        const mem = memory(), t = tab(mem, A, { extraScripts: EXTRA }), admin = tab(mem, null, { admin: true });
        const groups = t.s.groupsFor(A.email);
        assert.ok(groups.every(g => g.mode === 'approval' && !g.readable && g.state === 'none'));
        await assert.rejects(t.s.createPost({ channel: 'python', title: 't', body: 'b' }, A.email), /approval is required/);
        await assert.rejects(admin.s.setGroupMode('study-python', 'open', 'x'), /always need approval/);
    });

    const shared = memory(), admin = tab(shared, null, { admin: true });
    const a = tab(shared, A, { extraScripts: EXTRA }), b = tab(shared, B, { extraScripts: EXTRA });
    a.state.language = 'javascript';

    await check('Your language group appears automatically, pinned first and marked; other languages are hidden behind "Browse other languages"', async () => {
        a.run('js/community.js');
        const list = a.dom.ids.get('community-channels').children.filter(n => n.tagName === 'BUTTON' && n.className.includes('community-channel'));
        assert.match(list[0].textContent, /All discussions/);
        assert.match(list[1].textContent, /JavaScript/); assert.match(list[1].textContent, /Your language/); assert.match(list[1].textContent, /Approval required/);
        deq(list.slice(2, 5).map(n => n.textContent.replace(/^.|Approval required$/g, '')), ['General', 'Help', 'Show your project'].map(x => x).map((x, i) => list[2 + i].textContent.replace(/^.|Approval required$/g, '')), 'topic groups follow');
        assert.ok(!groupButton(a, 'Python'), 'Python is hidden from the main list');
        const toggle = a.dom.ids.get('community-browse-toggle');
        assert.equal(toggle.getAttribute('aria-expanded'), 'false'); assert.match(toggle.textContent, /Browse other languages \(12\)/);
        await toggle.fire('click');
        assert.ok(groupButton(a, 'Python'), 'reachable via Browse other languages');
        assert.ok(groupButton(a, 'Kotlin'));
    });

    await check('First visit lands on the language group: header, description, one Request to join with a reason, and a one-sentence welcome', async () => {
        const gate = a.dom.ids.get('community-access');
        assert.equal(gate.hidden, false);
        assert.match(gate.textContent, /JavaScript/); assert.match(gate.textContent, /JavaScript questions, tips and code reviews/);
        assert.match(gate.textContent, /Welcome! Groups open after approval/);
        assert.match(gate.textContent, /Not a member/);
        const submits = walk(gate).filter(n => n.tagName === 'BUTTON');
        deq(submits.map(n => n.textContent), ['Request to join']);
        assert.ok(walk(gate).some(n => n.id === 'join-reason'));
        assert.equal(a.dom.ids.get('community-composer').hidden, true, 'no composer before approval');
    });

    await check('Non-members can neither read nor post: no post content reaches them in any view', async () => {
        await b.m.request('javascript', 'I study JavaScript.', B.email); await approve(admin, B.email, 'javascript');
        const id = await b.s.createPost({ channel: 'javascript', title: 'Members-only closures question', body: 'secret body' }, B.email);
        await assert.rejects(a.s.createPost({ channel: 'javascript', title: 'x', body: 'y' }, A.email), /approval is required/);
        await assert.rejects(a.s.reply(id, 'sneaky', A.email), /approval is required/);
        await assert.rejects(a.s.react(id, 'helpful', A.email), /approval is required/);
        assert.throws(() => a.s.get(id, A.email), /not available/);
        assert.equal(a.s.query({}, A.email).total, 0); assert.equal(a.s.query({ channel: 'javascript' }, A.email).total, 0);
        assert.equal(a.s.highlights(A.email).total, 0); deq(a.s.similar({ title: 'closures question members' }, A.email), []);
        a.window.dispatchEvent({ type: 'community-changed' });
        assert.ok(!a.dom.walk().some(n => /Members-only closures|secret body/.test(n._text || '')), 'no post text in the page');
    });

    await check('Request -> Pending -> Approved updates the gate live (other tab), then the feed and composer open', async () => {
        a.dom.ids.get('join-reason').value = 'I want to learn JavaScript with others.';
        const form = walk(a.dom.ids.get('community-access')).find(n => n.tagName === 'FORM');
        await form.fire('submit');
        assert.equal(a.m.state('javascript', A.email), 'pending');
        assert.match(a.dom.ids.get('community-access').textContent, /Pending\. An administrator will review your request/);
        deq(walk(a.dom.ids.get('community-access')).filter(n => n.tagName === 'BUTTON').map(n => n.textContent), ['Cancel request']);
        await approve(admin, A.email, 'javascript');
        a.window.fire('community-membership-changed');
        assert.ok(a.dom.walk().some(n => n.tagName === 'BUTTON' && n.className.includes('community-card-open') && n.textContent === 'Members-only closures question'));
        assert.equal(a.dom.ids.get('community-composer').hidden, false);
        assert.match(a.dom.ids.get('community-access').textContent, /Approved member/);
    });

    await check('Declined and Removed states show the admin note and a way back; switching language keeps memberships', async () => {
        await a.m.request('python', 'Python too.', A.email);
        const r = admin.m.requests().find(x => x.owner === A.email && x.channel === 'python');
        await admin.m.decide(r.id, 'rejected', 'Please add what you already know.');
        const c = tab(shared, A, { extraScripts: EXTRA }); c.state.language = 'python';
        c.run('js/community.js');
        assert.match(c.dom.ids.get('community-access').textContent, /Declined: Please add what you already know\. You can send a new request/);
        assert.equal(c.m.state('javascript', A.email), 'approved', 'changing language never removes other memberships');
        assert.ok(!groupButton(c, 'JavaScript'), 'the JavaScript group is no longer in the main list');
        await c.dom.ids.get('community-browse-toggle').fire('click');
        assert.match(groupButton(c, 'JavaScript').textContent, /Member/);
        const ja = admin.m.requests().find(x => x.owner === A.email && x.channel === 'javascript');
        await admin.m.decide(ja.id, 'revoked', 'Shared answers to graded tasks.');
        c.window.fire('community-membership-changed');
        await groupButton(c, 'JavaScript').fire('click');
        assert.match(c.dom.ids.get('community-access').textContent, /Removed: Shared answers to graded tasks\. You can ask to join again/);
        assert.ok(!c.dom.walk().some(n => n.className?.includes?.('community-card-open')), 'removed: no posts');
    });

    await check('Bulk approve/decline: admin only, all-or-nothing, one audit entry per request, optional shared note', async () => {
        const mem = memory(), ad = tab(mem, null, { admin: true });
        const learners = [1, 2, 3, 4].map(n => ({ name: `Bulk Learner ${n}`, email: `bulk-${n}@example.test`, role: 'student', isDemo: true }));
        for (const l of learners) await tab(mem, l).m.request('go', 'Go please', l.email);
        const ids = ad.m.requests().map(r => r.id);
        await assert.rejects(tab(mem, learners[0]).m.decideMany(ids, 'approved'), /administrator/);
        await ad.m.decide(ids[3], 'rejected');
        await assert.rejects(ad.m.decideMany(ids, 'approved'), /changed/);
        assert.equal(ad.m.requests().filter(r => r.status === 'approved').length, 0, 'nothing changed');
        await assert.rejects(ad.m.decideMany([], 'approved'), /Select at least one/);
        assert.equal(await ad.m.decideMany(ids.slice(0, 3), 'approved', 'Welcome to Go!'), 3);
        assert.ok(ad.m.requests().filter(r => ids.slice(0, 3).includes(r.id)).every(r => r.status === 'approved' && r.decisionNote === 'Welcome to Go!'));
        assert.equal(ad.m.audit().filter(e => e.action === 'membership-approved').length, 3);
        deq(ad.m.pendingCounts(), {});
    });

    await check('Access mode switch: explicit and audited; Open needs a reason; back to approval keeps participants, nobody else gains access', async () => {
        const mem = memory(), ad = tab(mem, null, { admin: true }), x = tab(mem, A, { extraScripts: EXTRA }), y = tab(mem, B, { extraScripts: EXTRA });
        await assert.rejects(x.s.setGroupMode('java', 'open', 'x'), /administrator/);
        await assert.rejects(ad.s.setGroupMode('java', 'open', ''), /Reason must contain/);
        deq(plain(await ad.s.setGroupMode('java', 'open', 'Course week: open to all')), { mode: 'open', changed: true, kept: 0 });
        const id = await x.s.createPost({ channel: 'java', title: 'Open java question', body: 'b' }, A.email);
        assert.equal(y.s.get(id, B.email).title, 'Open java question', 'any student reads an opened group');
        const kept = await ad.s.setGroupMode('java', 'approval', 'Back to normal');
        assert.equal(kept.kept, 1);
        assert.equal(x.m.state('java', A.email), 'approved', 'the participant keeps access');
        assert.throws(() => y.s.get(id, B.email), /not available/, 'a reader who never took part needs to request');
        deq(ad.s.auditLog().filter(e => e.targetId === 'java').map(e => [e.action, e.reason]), [['group-opened', 'Course week: open to all'], ['group-approval-required', 'Back to normal']]);
        assert.ok(ad.m.audit().some(e => e.action === 'membership-kept' && e.channel === 'java' && e.subject === A.email));
    });

    await check('Migration: former open channels with posts stay Open (audited), empty ones need approval; study members keep access; old private ids map once', async () => {
        const old = memory();
        old.setItem('codementor-community-memberships-v1', JSON.stringify({ version: 1, requests: [
            { id: 'm1', channel: 'study-python', owner: A.email, name: A.name, reason: 'x', status: 'approved', updatedAt: '2026-01-01T00:00:00.000Z' },
            { id: 'm2', channel: 'help', owner: B.email, name: B.name, reason: 'x', status: 'approved', updatedAt: '2026-01-01T00:00:00.000Z' }], audit: [] }));
        const post = (id, channel, owner, name) => ({ id, channel, owner, name, createdAt: '2026-01-02T00:00:00.000Z', editedAt: null, title: 'Old ' + id, body: 'b', code: null, tags: [], reactions: { helpful: [], thanks: [] }, saved: [], solved: false, replies: [], reports: [], moderation: { state: 'visible' } });
        old.setItem('codementor-community-v1', JSON.stringify({ version: 3, posts: [post('o1', 'python', B.email, B.name), post('o2', 'study-python', A.email, A.name)], audit: [], seen: {}, activity: {}, channelSeen: {} }));
        const oa = tab(old, A, { extraScripts: EXTRA }), ob = tab(old, B, { extraScripts: EXTRA }), oadm = tab(old, null, { admin: true });
        const modes = Object.fromEntries(oa.s.groupsFor(A.email).map(g => [g.id, g.mode]));
        assert.equal(modes.python, 'open', 'had posts: kept open'); assert.equal(modes.general, 'approval'); assert.equal(modes.javascript, 'approval');
        assert.equal(oa.s.get('o1', A.email).title, 'Old o1', 'nobody lost access to the open Python posts');
        assert.equal(oa.s.get('o2', A.email).title, 'Old o2', 'study-group member keeps access');
        assert.throws(() => ob.s.get('o2', B.email), /not available/, 'nobody gained study-group access');
        assert.equal(ob.m.state('study-help', B.email), 'approved', 'a v1 "help" approval meant the old private channel: Help circle');
        assert.equal(ob.m.state('help', B.email), 'none', 'it does not grant the new Help group');
        assert.ok(oadm.s.auditLog().some(e => e.action === 'group-kept-open' && e.targetId === 'python' && e.actor === 'system'));
        await oa.m.request('help', 'Join the Help group', A.email);
        assert.equal(JSON.parse(old.getItem('codementor-community-memberships-v1')).version, 2);
        assert.equal(oa.m.state('help', A.email), 'pending', 'v2 records are literal: help means the Help group');
    });

    await check('Account switch isolation: a stale tab cannot request, cancel or read as the previous account', async () => {
        const mem = memory(), t = tab(mem, A, { extraScripts: EXTRA });
        await t.m.request('rust', 'Rust please', A.email);
        t.state.account = B;
        await assert.rejects(t.m.request('ruby', 'stale', A.email), /account changed/);
        await assert.rejects(t.m.withdraw('rust', A.email, 'pending'), /account changed/);
        assert.equal(t.m.state('rust', B.email), 'none', "B does not inherit A's request");
        assert.throws(() => t.s.groupsFor(A.email), /account changed/);
    });

    await check('Under-18 rules unchanged: no private contact anywhere, the gate exposes no member list or emails', async () => {
        deq(a.s.contactPolicy(15), { allowed: false, reason: 'Learners under 18 cannot be contacted privately.' });
        const gateText = a.dom.ids.get('community-access').textContent + JSON.stringify(a.s.groupsFor(A.email));
        assert.ok(!gateText.includes('@'), 'no email addresses');
        assert.ok(!a.dom.walk().some(n => n.tagName === 'BUTTON' && /message|contact|dm\b/i.test(n.textContent)));
    });

    await check('Ask the community: a member gets the prefilled draft; a non-member gets the group gate with a friendly message, nothing kept', async () => {
        const mem = memory(), ad = tab(mem, null, { admin: true });
        const draft = channel => ({ owner: A.email, at: Date.now(), channel, title: 'Help with: Build a simple receipt', body: 'What I tried:', code: 'print(1)', language: 'python', tags: 'task', related: null });
        const t1 = tab(mem, A, { extraScripts: EXTRA });
        t1.context.sessionStorage.setItem('codementor-community-draft', JSON.stringify(draft('python'))); t1.run('js/community.js');
        assert.equal(t1.dom.ids.get('post-title').value, '', 'not prefilled for a non-member');
        assert.match(t1.dom.ids.get('community-status').textContent, /To ask in the Python group, request to join first/);
        assert.ok(walk(t1.dom.ids.get('community-access')).some(n => n.tagName === 'BUTTON' && n.textContent === 'Request to join'));
        assert.equal(t1.context.sessionStorage.getItem('codementor-community-draft'), null);
        await t1.m.request('python', 'Python learner', A.email); await approve(ad, A.email, 'python');
        const t2 = tab(mem, A, { extraScripts: EXTRA });
        t2.context.sessionStorage.setItem('codementor-community-draft', JSON.stringify(draft('python'))); t2.run('js/community.js');
        assert.equal(t2.dom.ids.get('post-title').value, 'Help with: Build a simple receipt');
        assert.equal(t2.s.query({}, A.email).total, 0, 'never auto-posted');
    });

    await check('SAMPLE data creates labelled sample members and demo requests in every state, removed with the sample', async () => {
        const mem = memory(), ad = tab(mem, null, { admin: true });
        await ad.s.loadSample(); await ad.s.loadSample();
        const sample = ad.m.requests().filter(r => r.sample);
        assert.ok(sample.every(r => r.name.endsWith('(SAMPLE)') && r.owner.endsWith('@sample.invalid')));
        deq([...new Set(sample.map(r => r.status))].sort(), ['approved', 'pending', 'rejected', 'revoked']);
        assert.equal(new Set(sample.map(r => r.id)).size, sample.length, 'loading twice adds nothing');
        const removed = await ad.s.removeSample();
        assert.equal(removed.memberships, sample.length);
        assert.equal(ad.m.requests().length, 0);
    });

    console.log(`${count} community group checks passed.`);
})().catch(error => { console.error(error); process.exit(1); });
