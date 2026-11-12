/* Part 2: community membership isolation, XSS-as-text, ownership, moderation, two-tab sync, sample seed.
   Community v2: the formerly private channels are private STUDY GROUPS (study-*); open channels are
   covered in tests/community-v2.cjs. The privacy rules tested here apply to study groups unchanged. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
let count = 0;
const plain = v => JSON.parse(JSON.stringify(v));
const deq = (actual, expected, message) => assert.deepEqual(plain(actual), plain(expected), message);
async function check(name, body) { await body(); count++; console.log('PASS ' + name); }

function memory(map = new Map()) {
    return { map, get length() { return map.size; }, key: i => [...map.keys()][i] ?? null, getItem: k => map.has(k) ? map.get(k) : null, setItem: (k, v) => map.set(k, String(v)), removeItem: k => map.delete(k), clear: () => map.clear() };
}
// ---- tiny DOM ----
function makeDocument() {
    const ids = new Map(), created = [];
    function el(tag = 'div') {
        const handlers = {}, attrs = {}, classes = new Set();
        const e = {
            tagName: tag.toUpperCase(), children: [], parent: null, _text: '', hidden: false, disabled: false, value: '', dataset: {}, style: {}, type: '', id: '',
            get textContent() { return this.children.length ? this.children.map(c => c.textContent).join('') : this._text; },
            set textContent(v) { this.children = []; this._text = String(v); },
            get options() { return this.children.filter(c => c.tagName === 'OPTION'); },
            classList: { add: c => classes.add(c), remove: c => classes.delete(c), contains: c => classes.has(c), toggle: (c, on) => (on ?? !classes.has(c)) ? classes.add(c) : classes.delete(c) },
            get className() { return [...classes].join(' '); }, set className(v) { classes.clear(); String(v).split(/\s+/).filter(Boolean).forEach(c => classes.add(c)); },
            setAttribute(n, v) { attrs[n] = String(v); }, getAttribute(n) { return attrs[n] ?? null; }, removeAttribute(n) { delete attrs[n]; },
            append(...nodes) { for (const n of nodes) { if (typeof n === 'string') { const t = el('#text'); t._text = n; this.children.push(t); continue; } n.parent = this; this.children.push(n); if (n.id) ids.set(n.id, n); } },
            replaceChildren(...nodes) { this.children = []; this.append(...nodes); },
            addEventListener(t, fn) { (handlers[t] ||= []).push(fn); },
            async fire(t, extra = {}) { for (const fn of handlers[t] || []) await fn({ preventDefault() {}, currentTarget: e, target: e, ...extra }); },
            focus() {}, scrollIntoView() {}, reset() { walk(this).forEach(n => { if (['INPUT', 'TEXTAREA'].includes(n.tagName)) n.value = ''; }); },
            querySelector(sel) { return query(this, sel)[0] || null; }, querySelectorAll(sel) { return query(this, sel); }
        };
        created.push(e);
        return e;
    }
    const walk = root => root.children.flatMap(c => [c, ...walk(c)]);
    function query(root, sel) {
        const all = walk(root);
        if (sel === 'textarea') return all.filter(n => n.tagName === 'TEXTAREA');
        if (sel === 'button[type=submit]') return all.filter(n => n.tagName === 'BUTTON' && n.type === 'submit');
        return [];
    }
    const body = el('body');
    const document = {
        body, created,
        createElement: tag => el(tag),
        getElementById(id) { if (!ids.has(id)) { const n = el(['post-channel', 'community-tag', 'community-filter', 'community-sort', 'membership-filter', 'membership-channel'].includes(id) ? 'select' : 'div'); n.id = id; ids.set(id, n); body.append(n); } return ids.get(id); },
        querySelector(sel) { if (!ids.has(sel)) { const n = el(); ids.set(sel, n); } return ids.get(sel); }
    };
    return { document, walk: () => walk(body), ids };
}
// ---- a browser tab ----
function tab(shared, account, { admin = false } = {}) {
    const events = {}, session = memory();
    if (admin) session.setItem('codementor-admin-session', JSON.stringify({ role: 'admin', isDemo: true, signedInAt: Date.now() - 1000 }));
    const dom = makeDocument();
    const state = { account };
    const window = {
        addEventListener(t, fn) { (events[t] ||= []).push(fn); },
        dispatchEvent(e) { for (const fn of events[e.type] || []) fn(e); },
        fire(t, detail = {}) { for (const fn of events[t] || []) fn({ type: t, ...detail }); },
        confirm: () => true,
        platformStore: {
            student(expected) {
                const a = state.account;
                if (!a) throw new Error('Sign in to a student account to continue.');
                if (expected !== undefined && a.email.toLowerCase() !== String(expected).toLowerCase()) throw new Error('Your student account changed. Reload before continuing.');
                return a;
            }
        },
        cmStorage: { activeLanguage: () => state.language || 'python' }
    };
    const context = { window, localStorage: shared, sessionStorage: session, navigator: globalThis.navigator, crypto: globalThis.crypto, structuredClone, Event: class { constructor(type) { this.type = type; } }, CustomEvent: class { constructor(type, o) { this.type = type; this.detail = o?.detail; } }, document: dom.document, setTimeout, console };
    vm.createContext(context);
    for (const file of ['js/community-membership.js', 'js/community-store.js']) vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: file });
    return { window, state, dom, context, m: window.communityMembership, s: window.communityStore, run(file) { vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: file }); } };
}
const A = { name: 'Test Learner A', email: 'learner-a@example.test', role: 'student', isDemo: true };
const B = { name: 'Test Learner B', email: 'learner-b@example.test', role: 'student', isDemo: true };
async function approve(adminTab, owner, channel) {
    const r = adminTab.m.requests().find(x => x.owner === owner && x.channel === channel && x.status === 'pending');
    await adminTab.m.decide(r.id, 'approved');
}

(async () => {
    const shared = memory();
    const a = tab(shared, A), b = tab(shared, B), admin = tab(shared, null, { admin: true });

    await check('Membership: a request is pending and grants nothing', async () => {
        await a.m.request('study-python', 'I am learning Python.', A.email);
        assert.equal(a.m.state('study-python', A.email), 'pending');
        await assert.rejects(a.s.createPost({ channel: 'study-python', title: 'Hi', body: 'x' }, A.email), /approval is required/);
    });
    await check('Membership isolation: approved member posts; non-member sees nothing and cannot act', async () => {
        await approve(admin, A.email, 'study-python');
        const id = await a.s.createPost({ channel: 'study-python', title: 'Loop question', body: 'Why?', code: 'for i in range(3):\n    print(i)', language: 'python', tags: 'loops, Range' }, A.email);
        assert.equal(a.s.query({}, A.email).total, 1);
        assert.equal(b.s.query({}, B.email).total, 0);
        assert.equal(b.s.query({ channel: 'study-python' }, B.email).total, 0);
        await assert.rejects(b.s.reply(id, 'sneaky', B.email), /approval is required/);
        await assert.rejects(b.s.react(id, 'helpful', B.email), /approval is required/);
        await assert.rejects(b.s.createPost({ channel: 'study-python', title: 't', body: 'b' }, B.email), /approval is required/);
        const post = a.s.query({}, A.email).items[0];
        deq(post.tags, ['loops', 'range']);
        deq(post.code, { language: 'python', text: 'for i in range(3):\n    print(i)' });
    });
    await check('Membership in one channel does not unlock another', async () => {
        await b.m.request('study-javascript', 'JS learner', B.email); await approve(admin, B.email, 'study-javascript');
        await b.s.createPost({ channel: 'study-javascript', title: 'JS only', body: 'b' }, B.email);
        deq(b.s.query({}, B.email).items.map(p => p.title), ['JS only']);
        deq(a.s.query({}, A.email).items.map(p => p.title), ['Loop question']);
    });

    await check('XSS payloads are stored and returned as literal text', async () => {
        await b.m.request('study-python', 'Join', B.email); await approve(admin, B.email, 'study-python');
        const payload = '<img src=x onerror="alert(1)">';
        const id = await a.s.createPost({ channel: 'study-python', title: payload, body: '<script>alert("x")</script>\u0000', code: '</code><script>alert(2)</script>', language: 'javascript', tags: [] }, A.email);
        await b.s.reply(id, '<a href="javascript:alert(3)">click</a>', B.email);
        const post = a.s.query({ search: 'onerror' }, A.email).items[0];
        assert.equal(post.title, payload);
        assert.equal(post.body, '<script>alert("x")</script>', 'control characters stripped, tags kept literally');
        assert.equal(post.replies[0].body, '<a href="javascript:alert(3)">click</a>');
        await assert.rejects(a.s.createPost({ channel: 'study-python', title: 't', body: 'b', tags: '<b>' }, A.email), /Tags use letters/);
    });
    await check('XSS payloads render as text in the real page script (no element injected)', async () => {
        a.run('js/community.js');
        // Community v2: feed cards are compact; the full post (body, code, actions) opens from the title.
        // The post view is a drawer showing one discussion at a time, so open each card and collect what it shows.
        const nodes = [...a.dom.walk()];
        for (const opener of a.dom.walk().filter(n => n.tagName === 'BUTTON' && n.className.includes('community-card-open'))) { await opener.fire('click'); nodes.push(...a.dom.walk()); }
        assert.ok(!nodes.some(n => ['SCRIPT', 'IMG', 'IFRAME'].includes(n.tagName)), 'no executable element created');
        assert.ok(nodes.some(n => n.tagName === 'H3' && n.textContent === '<img src=x onerror="alert(1)">'));
        assert.ok(nodes.some(n => n.tagName === 'CODE' && n.textContent === '</code><script>alert(2)</script>'));
        assert.ok(nodes.some(n => n.className === 'community-code-lang' && n.textContent === 'JavaScript'));
        assert.ok(nodes.some(n => n.tagName === 'BUTTON' && n.textContent === 'Copy code'));
        assert.ok(!nodes.some(n => n.tagName === 'BUTTON' && /message|contact|dm/i.test(n.textContent)), 'no private contact control exists');
        for (const file of ['js/community.js', 'js/community-store.js', 'js/admin-community.js', 'js/community-membership.js']) {
            assert.ok(!/innerHTML|outerHTML|insertAdjacentHTML|document\.write|eval\(|new Function/.test(fs.readFileSync(file, 'utf8')), file + ' never parses HTML');
        }
    });
    await check('Length limits are enforced', async () => {
        await assert.rejects(a.s.createPost({ channel: 'study-python', title: 'x'.repeat(141), body: 'b' }, A.email), /Title must contain 1–140/);
        await assert.rejects(a.s.createPost({ channel: 'study-python', title: 't', body: 'x'.repeat(5001) }, A.email), /Post must contain 1–5000/);
        await assert.rejects(a.s.createPost({ channel: 'study-python', title: 't', body: '', code: '' }, A.email), /Post must contain/);
        await assert.rejects(a.s.createPost({ channel: 'study-python', title: 't', body: 'b', tags: 'a,b,c,d,e,f' }, A.email), /at most 5 tags/);
        const id = a.s.query({}, A.email).items[0].id;
        await assert.rejects(b.s.reply(id, 'x'.repeat(2001), B.email), /Reply must contain 1–2000/);
    });
    await check('Rate limit: a fourth post within five minutes is refused', async () => {
        // A already created 2 posts in this window.
        await a.s.createPost({ channel: 'study-python', title: 'Third', body: 'b' }, A.email);
        await assert.rejects(a.s.createPost({ channel: 'study-python', title: 'Fourth', body: 'b' }, A.email), /posting quickly/);
        assert.equal(a.s.query({ search: 'Fourth' }, A.email).total, 0);
    });

    let target;
    await check('Ownership: only the author can mark solved, edit or delete', async () => {
        target = a.s.query({ search: 'Loop question' }, A.email).items[0].id;
        await assert.rejects(b.s.setSolved(target, true, B.email), /Only the author/);
        await assert.rejects(b.s.editPost(target, { title: 'hijack', body: 'x' }, B.email), /only edit your own/);
        await assert.rejects(b.s.deletePost(target, B.email), /only delete your own/);
        assert.equal(await a.s.setSolved(target, true, A.email), true);
        assert.equal(b.s.query({ status: 'solved' }, B.email).items.map(p => p.id).includes(target), true);
    });
    await check('Edit marks the post "edited"; an unchanged save does not', async () => {
        const before = a.s.query({ search: 'Loop question' }, A.email).items[0];
        assert.equal(await a.s.editPost(target, { title: before.title, body: before.body, code: before.code.text, language: 'python', tags: before.tags }, A.email), false);
        assert.equal(a.s.query({ search: 'Loop question' }, A.email).items[0].editedAt, null);
        assert.equal(await a.s.editPost(target, { title: 'Loop question (updated)', body: 'Why does it stop at 2?', code: before.code.text, language: 'python', tags: 'loops' }, A.email), true);
        const after = a.s.query({ search: 'updated' }, A.email).items[0];
        assert.ok(after.editedAt); deq(after.tags, ['loops']);
    });
    await check('Replies and reactions; users delete only their own replies', async () => {
        const replyId = await b.s.reply(target, 'Range stops before the end.', B.email);
        await assert.rejects(a.s.deleteReply(target, replyId, A.email), /only delete your own replies/);
        assert.equal(await b.s.react(target, 'helpful', B.email), true);
        assert.equal(await b.s.react(target, 'thanks', B.email), true);
        const p = a.s.query({ search: 'updated' }, A.email).items[0];
        assert.equal(p.reactions.helpful.count, 1); assert.equal(p.reactions.thanks.count, 1); assert.equal(p.replies.length, 1);
        assert.equal(p.replies[0].mine, false);
    });
    await check('Search, tag and status filters, helpful sort and pagination', async () => {
        assert.equal(b.s.query({ tag: 'loops' }, B.email).total, 1);
        assert.equal(b.s.query({ search: 'range stops' }, B.email).total, 0, 'search covers posts, not replies');
        assert.equal(b.s.query({ search: 'print(i)' }, B.email).total, 1, 'search covers code');
        assert.ok(b.s.query({ status: 'unanswered' }, B.email).items.every(p => p.replies.length === 0));
        assert.equal(b.s.query({ sort: 'helpful' }, B.email).items[0].id, target);
        const all = b.s.query({ pageSize: 2 }, B.email);
        assert.equal(all.pages, Math.ceil(all.total / 2));
        const last = b.s.query({ pageSize: 2, page: 99 }, B.email);
        assert.equal(last.page, all.pages);
        const ids = []; for (let p = 1; p <= all.pages; p++) ids.push(...b.s.query({ pageSize: 2, page: p }, B.email).items.map(x => x.id));
        assert.equal(new Set(ids).size, all.total);
    });

    await check('Notifications: replies to my posts and membership decisions; mark as read', async () => {
        const n = a.s.notifications(A.email);
        assert.ok(n.items.some(i => i.type === 'reply' && i.name === B.name));
        assert.ok(n.items.some(i => i.type === 'membership' && i.status === 'approved' && i.channel === 'study-python'));
        await a.s.markNotificationsRead(A.email);
        assert.equal(a.s.notifications(A.email).count, 0);
        await new Promise(r => setTimeout(r, 5));
        await b.s.reply(target, 'Another thought', B.email);
        assert.equal(a.s.notifications(A.email).count, 1);
        assert.equal(b.s.notifications(B.email).items.filter(i => i.type === 'reply').length, 0, 'own replies never notify');
    });

    await check('Moderation: report rules', async () => {
        await assert.rejects(a.s.report(target, 'self', A.email), /cannot report your own/);
        await assert.rejects(b.s.report(target, '   ', B.email), /Report reason/);
        await b.s.report(target, 'Contains a full homework answer.', B.email);
        await assert.rejects(b.s.report(target, 'again', B.email), /already reported/);
        assert.throws(() => b.s.queue(), /administrator/);
        const q = admin.s.queue();
        assert.equal(q.length, 1); assert.equal(q[0].reports[0].reason, 'Contains a full homework answer.');
        assert.ok(!JSON.stringify(q).includes(B.email), 'reporter identity is not shown in the queue');
    });
    await check('Moderation: hide needs a reason, hides from members, shows the author why', async () => {
        await assert.rejects(admin.s.moderate(target, 'hide', ''), /Reason must contain/);
        await assert.rejects(b.s.moderate(target, 'hide', 'x'), /administrator/);
        await admin.s.moderate(target, 'hide', 'Shares a full solution.');
        assert.equal(b.s.query({}, B.email).items.some(p => p.id === target), false);
        const own = a.s.query({}, A.email).items.find(p => p.id === target);
        assert.equal(own.hidden, true); assert.equal(own.hiddenReason, 'Shares a full solution.');
        await assert.rejects(b.s.reply(target, 'hi', B.email), /hidden by a moderator/);
        assert.equal(admin.s.queue()[0].reports[0].status, 'resolved');
    });
    await check('Moderation: restore, then remove erases content; all actions audited', async () => {
        await admin.s.moderate(target, 'restore', 'Author removed the answer.');
        assert.equal(b.s.query({}, B.email).items.some(p => p.id === target), true);
        await admin.s.moderate(target, 'remove', 'Repeated rule violation.');
        assert.equal(a.s.query({}, A.email).items.some(p => p.id === target), false);
        await assert.rejects(a.s.editPost(target, { title: 't', body: 'b' }, A.email), /removed/);
        const raw = shared.getItem('codementor-community-v1');
        assert.ok(!raw.includes('Range stops before the end.'), 'removed content and replies are erased');
        const log = admin.s.auditLog().map(e => e.action);
        deq(log, ['post-hidden', 'post-restored', 'post-removed']);
        assert.ok(admin.s.auditLog().every(e => e.reason && e.at && e.targetId === target));
    });
    await check('Member removal requires a reason, is audited and locks the channel', async () => {
        const r = admin.m.requests().find(x => x.owner === B.email && x.channel === 'study-python');
        await assert.rejects(admin.m.decide(r.id, 'revoked', ''), /reason/);
        await admin.m.decide(r.id, 'revoked', 'Repeated off-topic posts.');
        assert.equal(b.m.state('study-python', B.email), 'revoked');
        assert.equal(b.s.query({ channel: 'study-python' }, B.email).total, 0);
        const entry = admin.m.audit().find(e => e.action === 'member-removed');
        assert.equal(entry.reason, 'Repeated off-topic posts.'); assert.equal(entry.subject, B.email);
        assert.ok(b.s.notifications(B.email).items.some(i => i.type === 'membership' && i.status === 'revoked' && i.note === 'Repeated off-topic posts.'));
        assert.throws(() => b.m.audit(), /administrator/);
    });

    await check('Two-tab sync: a write in one tab is read and signalled in another', async () => {
        const a2 = tab(shared, A);
        let signalled = 0; a2.s.subscribe(() => signalled++);
        // Test setup: A used its post allowance earlier; clear the rate window so this post is allowed.
        shared.setItem('codementor-community-v1', JSON.stringify({ ...JSON.parse(shared.getItem('codementor-community-v1')), activity: {} }));
        const id = await a.s.createPost({ channel: 'study-python', title: 'From tab one', body: 'b' }, A.email);
        a2.window.fire('storage', { key: 'codementor-community-v1' });
        a2.window.fire('storage', { key: 'unrelated-key' });
        assert.equal(signalled, 1);
        assert.ok(a2.s.query({}, A.email).items.some(p => p.id === id));
    });
    await check('Two-tab sync: an account switch in another tab stops stale writes', async () => {
        const before = shared.getItem('codementor-community-v1');
        a.state.account = B; // the shared profile now belongs to B
        await assert.rejects(a.s.createPost({ channel: 'study-python', title: 'stale', body: 'b' }, A.email), /account changed/);
        assert.equal(shared.getItem('codementor-community-v1'), before);
        a.state.account = A;
    });
    await check('Under-18 learners can never be contacted privately; no DMs exist', async () => {
        assert.equal(a.s.contactPolicy(15).allowed, false);
        assert.match(a.s.contactPolicy(15).reason, /under 18/);
        assert.equal(a.s.contactPolicy(30).allowed, false);
        assert.equal(a.s.contactPolicy(undefined).allowed, false, 'unknown age is treated as a minor');
    });

    await check('Sample data: only an admin can load; labelled; 3 channels; 8-12 records', async () => {
        await assert.rejects(a.s.loadSample(), /administrator/);
        const realBefore = JSON.parse(shared.getItem('codementor-community-v1')).posts.filter(p => !p.sample);
        assert.equal(await admin.s.loadSample(), 7);
        const posts = JSON.parse(shared.getItem('codementor-community-v1')).posts.filter(p => p.sample);
        const replies = posts.flatMap(p => p.replies);
        assert.ok(posts.length + replies.length >= 8 && posts.length + replies.length <= 12);
        deq([...new Set(posts.map(p => p.channel))].sort(), ['help', 'javascript', 'python']);
        assert.ok(posts.every(p => p.title.startsWith('[SAMPLE] ') && /\(SAMPLE\)$/.test(p.name) && p.owner.endsWith('@sample.invalid')));
        assert.ok(replies.every(r => r.sample && /\(SAMPLE\)$/.test(r.name) && r.owner.endsWith('@sample.invalid')));
        deq(JSON.parse(shared.getItem('codementor-community-v1')).posts.filter(p => !p.sample), realBefore);
    });
    await check('Sample data: loading again is idempotent', async () => {
        const before = shared.getItem('codementor-community-v1');
        assert.equal(await admin.s.loadSample(), 0);
        deq(JSON.parse(shared.getItem('codementor-community-v1')).posts, JSON.parse(before).posts);
        deq(admin.s.sampleStatus(), { loaded: true, posts: 7, replies: 5 });
    });
    // Community v2 (intentional): sample posts sit in OPEN channels, so every signed-in student sees them, labelled SAMPLE.
    await check('Sample data: visible as SAMPLE in open channels to every signed-in student', async () => {
        const view = a.s.query({ search: '[SAMPLE]' }, A.email);
        assert.ok(view.items.length > 0 && view.items.every(p => p.sample && Object.hasOwn(a.s.OPEN, p.channel)));
        assert.equal(b.s.query({ search: '[SAMPLE]' }, B.email).total, view.total);
        a.dom.ids.get('community-search').value = '[SAMPLE]';
        a.window.fire('community-changed');
        assert.ok(a.dom.walk().some(n => n.className === 'community-sample-badge' && n.textContent === 'SAMPLE'));
    });
    await check('Sample data: removal never touches real records and asks before losing real replies', async () => {
        const sampleId = 'sample-community-py-2';
        await a.s.reply(sampleId, 'Real reply on a sample post', A.email);
        const realBefore = JSON.parse(shared.getItem('codementor-community-v1')).posts.filter(p => !p.sample);
        const hasReal = JSON.parse(shared.getItem('codementor-community-v1')).posts.find(p => p.id === sampleId).replies.some(r => !r.sample);
        assert.ok(hasReal);
        await assert.rejects(admin.s.removeSample(), /real reply is attached/);
        assert.equal(admin.s.sampleStatus().posts, 7);
        const result = await admin.s.removeSample({ includeRealReplies: true });
        assert.equal(result.posts, 7);
        const after = JSON.parse(shared.getItem('codementor-community-v1')).posts;
        assert.equal(after.filter(p => p.sample).length, 0);
        deq(after, realBefore);
        deq(admin.s.auditLog().slice(-3).map(e => e.action), ['sample-loaded', 'sample-loaded', 'sample-removed']);
    });

    await check('Legacy v1 records migrate: old channels map, starter posts become removable SAMPLE', async () => {
        const old = memory();
        old.setItem('codementor-community-memberships-v1', JSON.stringify({ version: 1, requests: [
            { id: 'r1', channel: 'questions', owner: A.email, name: A.name, reason: 'x', status: 'approved', updatedAt: '2026-01-01T00:00:00.000Z' },
            { id: 'r2', channel: 'notes', owner: A.email, name: A.name, reason: 'x', status: 'rejected', updatedAt: '2026-01-02T00:00:00.000Z' },
            { id: 'r3', channel: 'resources', owner: A.email, name: A.name, reason: 'x', status: 'approved', updatedAt: '2026-01-01T00:00:00.000Z' }
        ] }));
        old.setItem('codementor-community-v1', JSON.stringify({ version: 1, posts: [
            { id: 'guide-questions', channel: 'questions', owner: 'community-guide', name: 'Community guide', createdAt: '2026-01-01T00:00:00.000Z', title: 'Guide', body: 'b', likes: [], saved: [], replies: [], example: true },
            { id: 'p1', channel: 'notes', owner: A.email, name: A.name, createdAt: '2026-01-03T00:00:00.000Z', title: 'Mine', body: 'b', likes: [B.email], saved: [], replies: [] }
        ] }));
        const t = tab(old, A);
        assert.equal(t.m.state('study-help', A.email), 'approved');
        assert.equal(t.m.state('study-general', A.email), 'approved', 'the stronger of notes/resources wins');
        const posts = t.s.query({}, A.email).items;
        deq(posts.map(p => [p.id, p.channel, p.sample]), [['p1', 'study-general', false], ['guide-questions', 'study-help', true]]);
        assert.equal(posts[0].reactions.helpful.count, 1);
        assert.equal(old.getItem('codementor-community-v1').includes('"version":1'), true, 'reading never rewrites storage');
    });
    await check('Corrupt community storage fails closed and is never overwritten', async () => {
        const broken = memory(); broken.setItem('codementor-community-v1', '{broken');
        const t = tab(broken, A);
        await t.m.request('study-python', 'x', A.email);
        assert.throws(() => t.s.query({}, A.email), /could not be read/);
        await assert.rejects(t.s.loadSample(), /administrator|could not be read/);
        assert.equal(broken.getItem('codementor-community-v1'), '{broken');
    });
    await check('Admin page renders queue, audit and sample controls as text; buttons work', async () => {
        const adminPage = tab(shared, null, { admin: true });
        adminPage.run('js/admin-community.js');
        const nodes = () => adminPage.dom.walk();
        assert.ok(!nodes().some(n => ['SCRIPT', 'IMG'].includes(n.tagName)));
        assert.ok(nodes().some(n => n.tagName === 'B' && n.textContent === 'Member removed'));
        assert.ok(nodes().some(n => n.tagName === 'B' && n.textContent === 'Sample data removed'));
        assert.match(adminPage.dom.ids.get('sample-state').textContent, /No sample data is loaded/);
        await adminPage.dom.ids.get('sample-load').fire('click');
        assert.match(adminPage.dom.ids.get('sample-status').textContent, /7 sample posts added/);
        await adminPage.dom.ids.get('sample-load').fire('click');
        assert.match(adminPage.dom.ids.get('sample-status').textContent, /already loaded/);
        await adminPage.dom.ids.get('sample-remove').fire('click');
        assert.match(adminPage.dom.ids.get('sample-status').textContent, /7 sample posts removed/);
        assert.ok(!nodes().some(n => /password|hash|salt/i.test(n.textContent || '')), 'no credential data on the admin page');
    });
    console.log(`${count} community checks passed.`);
})().catch(error => { console.error(error); process.exit(1); });
