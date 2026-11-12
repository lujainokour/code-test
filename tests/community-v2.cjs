/* Community v2: feed, highlights, weekly challenge (and later groups: open channels, post view,
   reputation, learning integration, admin). Every number must come from the store. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { memory, tab, A, B, approve } = require('./helpers/community-harness.cjs');
let count = 0;
const plain = v => JSON.parse(JSON.stringify(v));
const deq = (actual, expected, message) => assert.deepEqual(plain(actual), plain(expected), message);
let beforeEach = () => {};
async function check(name, body) { beforeEach(); await body(); count++; console.log('PASS ' + name); }
const EXTRA = ['js/community-challenges.js', 'js/community-highlight.js'];

function curricula() {
    const ctx = { window: {} }; ctx.window.window = ctx.window; vm.createContext(ctx);
    for (const f of ['js/curriculum-registry.js', 'js/python-lessons.js', 'js/python-extension.js', 'js/curricula/python.js', 'js/curricula/javascript.js'])
        vm.runInContext(fs.readFileSync(f, 'utf8').replace(/^﻿/, ''), ctx, { filename: f });
    return ctx.window.curriculumRegistry;
}

(async () => {
    await check('Weekly challenge: every task is a real level 1-5 practice task with the same title; none for C#/C++', async () => {
        const shared = memory(), t = tab(shared, A, { extraScripts: EXTRA }), registry = curricula(), ch = t.window.communityChallenges;
        for (const [language, list] of Object.entries(ch.TASKS)) {
            const course = registry.get(language), allowed = new Set(course.levels.filter(l => l.id <= 5).flatMap(l => l.tasks));
            for (const [id, title] of list) { assert.ok(allowed.has(id), `${language}/${id} is a level 1-5 task`); assert.equal(course.tasks[id].title, title, `${language}/${id} title`); }
            assert.equal(list.length, allowed.size, `${language} covers every level 1-5 task`);
        }
        const a = ch.weekly('python', new Date(2026, 10, 12)), b = ch.weekly('python', new Date(2026, 10, 12, 23)), c = ch.weekly('python', new Date(2026, 10, 19));
        deq(a, b, 'same week, same challenge'); assert.notEqual(a.id, c.id, 'next week, next task');
        assert.equal(a.href, `../student/workspace.html?task=${a.id}`);
        assert.equal(ch.weekly('csharp'), null); assert.equal(ch.weekly('cpp'), null);
    });

    const shared = memory();
    const a = tab(shared, A, { extraScripts: EXTRA }), b = tab(shared, B, { extraScripts: EXTRA }), admin = tab(shared, null, { admin: true });
    // Group 3: 'python' is an OPEN channel, so no request or approval is needed to post there.
    // Tests that are not about rate limits start with an empty rate window (the limit itself is tested separately).
    beforeEach = () => { const raw = shared.getItem('codementor-community-v1'); if (!raw) return; const d = JSON.parse(raw); d.activity = {}; shared.setItem('codementor-community-v1', JSON.stringify(d)); };

    await check('First run: a signed-in student with no posts sees a welcome with three ways in, never a dead end', async () => {
        a.run('js/community.js');
        const nodes = a.dom.walk(), labels = nodes.filter(n => n.tagName === 'BUTTON').map(n => n.textContent);
        assert.ok(nodes.some(n => n.className === 'community-welcome'));
        for (const label of ['Ask your first question', 'Introduce yourself', 'Browse open channels']) assert.ok(labels.includes(label), label);
        const tabs = a.dom.ids.get('community-tabs').children;
        deq(tabs.map(t => t.textContent), ['Latest', 'Unanswered', 'Solved', 'Top', 'My posts']);
        deq(tabs.map(t => t.getAttribute('aria-selected')), ['true', 'false', 'false', 'false', 'false']);
        assert.match(a.dom.ids.get('community-challenge').textContent, /^Week \d+: /, 'weekly challenge names a real task');
        assert.match(a.dom.ids.get('community-unanswered').textContent, /Every question has a reply/);
    });

    await check('Highlights are counted from saved posts only: unanswered excludes my posts and answered ones', async () => {
        const mine = await a.s.createPost({ channel: 'python', title: 'My own question', body: 'x', tags: 'loops' }, A.email);
        const theirs = await b.s.createPost({ channel: 'python', title: 'Their open question', body: 'y', tags: 'loops, lists' }, B.email);
        const answered = await b.s.createPost({ channel: 'python', title: 'Their answered question', body: 'z' }, B.email);
        await a.s.reply(answered, 'Here is an idea.', A.email);
        const h = a.s.highlights(A.email);
        deq(h.unanswered.map(p => p.id), [theirs]); assert.equal(h.unansweredCount, 1);
        assert.ok(!h.unanswered.some(p => p.id === mine), 'my own post is not "can you help?"');
        deq(h.trending, [{ tag: 'loops', count: 2 }, { tag: 'lists', count: 1 }]);
        assert.equal(h.total, 3);
        assert.equal(b.s.highlights(B.email).unanswered.map(p => p.id).join(), mine);
    });

    await check('Solved today needs a solvedAt from today; older solves and unsolved posts are not counted', async () => {
        const id = b.s.query({ search: 'Their open question' }, B.email).items[0].id;
        assert.equal(a.s.highlights(A.email).solvedTodayCount, 0);
        await b.s.setSolved(id, true, B.email);
        const h = a.s.highlights(A.email);
        assert.equal(h.solvedTodayCount, 1); assert.equal(h.solvedToday[0].id, id);
        assert.ok(!h.unanswered.some(p => p.id === id), 'solved posts leave "can you help?"');
        assert.equal(a.s.highlights(A.email, Date.now() + 2 * 86400000).solvedTodayCount, 0, 'yesterday’s solve is not "today"');
        await b.s.setSolved(id, false, B.email);
        assert.equal(a.s.query({ search: 'Their open question' }, A.email).items[0].solvedAt, null);
    });

    await check('Tabs: "My posts" shows only mine; "Top" ranks by helpful reactions and replies', async () => {
        deq(a.s.query({ mine: true }, A.email).items.map(p => p.title), ['My own question']);
        const open = b.s.query({ search: 'Their open question' }, B.email).items[0].id;
        await a.s.react(open, 'helpful', A.email);
        assert.equal(a.s.query({ sort: 'top' }, A.email).items[0].id, open);
    });

    await check('Page: cards show a 2-line preview, reply count and a Solved pill; the full post opens from the title', async () => {
        const id = b.s.query({ search: 'Their answered question' }, B.email).items[0].id;
        await b.s.setSolved(id, true, B.email);
        a.window.dispatchEvent({ type: 'community-changed' });
        const nodes = a.dom.walk();
        const card = nodes.find(n => n.tagName === 'ARTICLE' && n.dataset.postId === id);
        assert.ok(card.className.includes('community-card') && card.className.includes('is-solved'));
        const text = card.textContent;
        assert.match(text, /1 reply/); assert.match(text, /Solved ✓/); assert.match(text, /Test Learner B/);
        assert.ok(nodes.some(n => n.className === 'community-card-preview'));
        assert.ok(!card.children.some(n => n.className === 'community-detail'), 'collapsed by default');
        const opener = a.dom.walk().find(n => n.tagName === 'BUTTON' && n.className.includes('community-card-open') && n.textContent === 'Their answered question');
        await opener.fire('click');
        assert.ok(a.dom.walk().some(n => n.className === 'community-reply-body' && n.textContent === 'Here is an idea.'));
    });

    // ---------- group 2: composer and post view ----------
    await check('Highlighting: tokens join back to the exact code; HTML stays literal text; four languages', async () => {
        const hl = a.window.communityHighlight;
        assert.ok(hl, 'highlighter loaded');
        const samples = {
            python: 'def total(xs):\n    # sum it\n    return sum(xs) + 1.5  # "</script>"\nprint(f"{total([1, 2])}")',
            javascript: 'const n = [1, 2].map(x => x * 2); // ok\n/* block */ console.log(`<img src=x onerror=alert(1)>`);',
            csharp: 'using System;\nclass P { static void Main() { Console.WriteLine("Hi \\"there\\""); } }',
            cpp: '#include <iostream>\nint main() { std::cout << 42 << std::endl; return 0; } // done'
        };
        for (const [language, code] of Object.entries(samples)) {
            const tokens = plain(hl.tokens(code, language));
            assert.equal(tokens.map(t => t.text).join(''), code, language + ' round-trips');
            assert.ok(tokens.some(t => t.type === 'kw'), language + ' keywords');
            assert.ok(tokens.every(t => ['plain', 'kw', 'str', 'com', 'num', 'fn'].includes(t.type)));
        }
        const js = plain(hl.tokens(samples.javascript, 'javascript'));
        assert.ok(js.some(t => t.type === 'str' && t.text === '`<img src=x onerror=alert(1)>`'), 'HTML inside a string is one text token');
        assert.ok(js.some(t => t.type === 'com' && t.text === '// ok'));
        deq(hl.tokens('<b>x</b>', 'text'), [{ type: 'plain', text: '<b>x</b>' }]);
    });

    await check('Threaded replies: answers to a nested reply attach to its thread; edit marks "edited"; only the author edits', async () => {
        const post = await a.s.createPost({ channel: 'python', title: 'Thread test about dictionaries', body: 'How?', tags: 'dict' }, A.email);
        const first = await b.s.reply(post, 'Use get().', B.email);
        const nested = await a.s.reply(post, 'Thanks, what about defaults?', A.email, first);
        const deeper = await b.s.reply(post, 'get(key, default).', B.email, nested);
        const view = a.s.get(post, A.email);
        deq(view.replies.map(r => r.parentId), [null, first, first], 'one level deep');
        await assert.rejects(a.s.editReply(post, first, 'hijack', A.email), /only edit your own replies/);
        assert.equal(await b.s.editReply(post, first, 'Use get().', B.email), false, 'unchanged edit is not an edit');
        assert.equal(await b.s.editReply(post, first, 'Use dict.get().', B.email), true);
        const edited = a.s.get(post, A.email).replies.find(r => r.id === first);
        assert.equal(edited.body, 'Use dict.get().'); assert.ok(edited.editedAt);
        await b.s.deleteReply(post, first, B.email);
        deq(a.s.get(post, A.email).replies.map(r => [r.id, r.parentId]), [[nested, null], [deeper, null]], 'answers to a deleted reply are kept');
        await assert.rejects(a.s.reply(post, 'x', A.email, 'missing-reply'), /was deleted/);
    });

    await check('Accepted answer: author only, never your own reply; marks solved; Undo restores exactly; deleting it clears it', async () => {
        const post = await a.s.createPost({ channel: 'python', title: 'Accept test question', body: 'Which loop?' }, A.email);
        const answer = await b.s.reply(post, 'Use for.', B.email), own = await a.s.reply(post, 'Or while?', A.email);
        await assert.rejects(b.s.acceptAnswer(post, answer, B.email), /Only the author/);
        await assert.rejects(a.s.acceptAnswer(post, own, A.email), /cannot accept your own reply/);
        const before = await a.s.acceptAnswer(post, answer, A.email);
        deq(before, { replyId: null, solved: false, solvedAt: null });
        let view = a.s.get(post, A.email);
        assert.equal(view.acceptedReplyId, answer); assert.equal(view.solved, true); assert.ok(view.solvedAt);
        assert.equal(view.replies.find(r => r.id === answer).accepted, true);
        await a.s.restoreAcceptance(post, before, A.email);
        view = a.s.get(post, A.email);
        assert.equal(view.acceptedReplyId, null); assert.equal(view.solved, false); assert.equal(view.solvedAt, null);
        await a.s.acceptAnswer(post, answer, A.email);
        await b.s.deleteReply(post, answer, B.email);
        assert.equal(a.s.get(post, A.email).acceptedReplyId, null);
    });

    await check('Helpful on replies: toggles, never on your own reply', async () => {
        const post = await a.s.createPost({ channel: 'python', title: 'Helpful reply test', body: 'b' }, A.email);
        const r = await b.s.reply(post, 'An answer', B.email);
        await assert.rejects(b.s.reactReply(post, r, B.email), /cannot mark your own reply/);
        assert.equal(await a.s.reactReply(post, r, A.email), true);
        assert.equal(a.s.get(post, A.email).replies[0].helpful.count, 1);
        assert.equal(await a.s.reactReply(post, r, A.email), false);
        assert.equal(a.s.get(post, A.email).replies[0].helpful.count, 0);
    });

    await check('Rate limit: an 11th reply within five minutes is refused and not saved', async () => {
        const post = await a.s.createPost({ channel: 'python', title: 'Reply rate test', body: 'b' }, A.email);
        const c = tab(shared, { name: 'Test Learner C', email: 'learner-c@example.test', role: 'student', isDemo: true }, { extraScripts: EXTRA });
        for (let i = 0; i < 10; i++) await c.s.reply(post, `Reply ${i}`, 'learner-c@example.test');
        await assert.rejects(c.s.reply(post, 'One too many', 'learner-c@example.test'), /posting quickly/);
        assert.equal(a.s.get(post, A.email).replies.length, 10);
    });

    await check('Similar questions: keyword and tag matching over readable posts; unrelated, hidden and private posts never appear', async () => {
        const target = await b.s.createPost({ channel: 'python', title: 'Why does my for loop skip the last number?', body: 'range question', tags: 'loops, range' }, B.email);
        const found = a.s.similar({ title: 'for loop skips last number', tags: 'range' }, A.email);
        assert.equal(found[0].id, target); assert.ok(found.length <= 3); assert.ok(found[0].score >= 4);
        deq(a.s.similar({ title: 'How do classes work?' }, A.email).filter(x => x.id === target), [], 'unrelated words do not match');
        deq(a.s.similar({ title: 'loop' }, A.email), [], 'a single word is not enough');
        await a.m.request('study-javascript', 'JS too.', A.email); await approve(admin, A.email, 'study-javascript');
        const privateOne = await a.s.createPost({ channel: 'study-javascript', title: 'Private loop number skip question', body: 'x', tags: 'loops' }, A.email);
        assert.ok(!b.s.similar({ title: 'loop number skip', tags: 'loops' }, B.email).some(x => x.id === privateOne), 'no posts from channels B cannot read');
        await b.s.report(target, 'Testing hidden posts.', B.email).catch(() => {});
        await a.s.report(target, 'Testing hidden posts.', A.email);
        await admin.s.moderate(target, 'hide', 'Test hide');
        assert.ok(!a.s.similar({ title: 'for loop skips last number', tags: 'range' }, A.email).some(x => x.id === target), 'hidden posts are never suggested');
        await admin.s.moderate(target, 'restore', 'Test restore');
    });

    await check('Post drawer: opens from the card, threads replies, highlights code, offers Accept only to the author', async () => {
        const post = await a.s.createPost({ channel: 'python', title: 'Drawer code question', body: 'See code', code: 'for i in range(3):\n    print("<b>", i)', language: 'python' }, A.email);
        const r1 = await b.s.reply(post, 'Top level answer', B.email);
        await a.s.reply(post, 'Nested follow-up', A.email, r1);
        a.window.dispatchEvent({ type: 'community-changed' });
        const opener = a.dom.walk().find(n => n.tagName === 'BUTTON' && n.className.includes('community-card-open') && n.textContent === 'Drawer code question');
        await opener.fire('click');
        const dialog = a.dom.ids.get('community-post-dialog');
        assert.equal(dialog.open, true);
        const inside = (function walk(n) { return n.children.flatMap(c => [c, ...walk(c)]); })(dialog);
        assert.ok(inside.some(n => n.id === 'community-drawer-title' && n.textContent === 'Drawer code question' && n.tabIndex === -1), 'focusable heading');
        const code = inside.find(n => n.tagName === 'CODE');
        assert.equal(code.textContent, 'for i in range(3):\n    print("<b>", i)');
        assert.ok(code.children.some(n => n.tagName === 'SPAN' && n.className === 'tok-kw' && n.textContent === 'for'));
        assert.ok(!inside.some(n => ['SCRIPT', 'IMG', 'B'].includes(n.tagName) && n.textContent === '<b>'), 'no element from code text');
        const rows = inside.filter(n => n.tagName === 'ARTICLE' && n.className.includes('community-reply'));
        deq(rows.map(r => r.className.includes('is-nested')), [false, true]);
        assert.ok(inside.some(n => n.tagName === 'BUTTON' && n.textContent === 'Accept answer'), 'author can accept B’s reply');
        b.run('js/community.js');
        await b.dom.walk().find(n => n.tagName === 'BUTTON' && n.className.includes('community-card-open') && n.textContent === 'Drawer code question').fire('click');
        assert.ok(!b.dom.walk().some(n => n.tagName === 'BUTTON' && n.textContent === 'Accept answer'), 'others cannot accept');
    });

    // ---------- group 3: open channels and permissions ----------
    await check('Open channels: any signed-in, enabled student reads and posts at once, in every open channel incl. C# and C++', async () => {
        const d = tab(shared, { name: 'Test Learner D', email: 'learner-d@example.test', role: 'student', isDemo: true }, { extraScripts: EXTRA });
        deq(Object.keys(d.s.OPEN), ['general', 'help', 'projects', 'python', 'javascript', 'csharp', 'cpp']);
        assert.equal(d.s.OPEN.csharp.comingSoon, true); assert.equal(d.s.OPEN.cpp.comingSoon, true);
        for (const channel of ['general', 'cpp']) {
            beforeEach();
            const id = await d.s.createPost({ channel, title: `Hello from ${channel}`, body: 'First post' }, 'learner-d@example.test');
            assert.equal(a.s.get(id, A.email).channel, channel, 'others read it immediately');
            await a.s.reply(id, 'Welcome!', A.email);
        }
        assert.equal(d.m.state('general', 'learner-d@example.test'), 'none', 'no membership record is needed or created');
        await assert.rejects(d.s.createPost({ channel: 'secret-channel', title: 't', body: 'b' }, 'learner-d@example.test'), /Choose a discussion channel/);
    });

    await check('Suspended accounts and guests can neither read nor post in open channels', async () => {
        const s = tab(shared, { name: 'Suspended Learner', email: 'suspended@example.test', role: 'student', isDemo: true }, { extraScripts: EXTRA });
        s.window.platformStore.student = () => { throw new Error('This student account is suspended. Ask the administrator to restore access.'); };
        assert.throws(() => s.s.query({}, 'suspended@example.test'), /suspended/);
        await assert.rejects(s.s.createPost({ channel: 'general', title: 't', body: 'b' }, 'suspended@example.test'), /suspended/);
        const guest = tab(shared, null, { extraScripts: EXTRA });
        assert.throws(() => guest.s.query({}), /Sign in/);
        assert.throws(() => guest.s.highlights(), /Sign in/);
        guest.run('js/community.js');
        assert.equal(guest.dom.ids.get('community-composer').hidden, true);
        assert.ok(!guest.dom.walk().some(n => n.tagName === 'ARTICLE'), 'a guest sees no posts');
    });

    await check('Study groups stay private in every view: feed, get, highlights, similar, unread counts', async () => {
        await a.m.request('study-python', 'Deep dive group', A.email); await approve(admin, A.email, 'study-python');
        const id = await a.s.createPost({ channel: 'study-python', title: 'Private study group plan for loops week', body: 'Members only', tags: 'loops' }, A.email);
        await assert.rejects(b.s.createPost({ channel: 'study-python', title: 'x', body: 'y' }, B.email), /approval is required/);
        assert.ok(!b.s.query({}, B.email).items.some(p => p.id === id));
        assert.equal(b.s.query({ channel: 'study-python' }, B.email).total, 0);
        assert.throws(() => b.s.get(id, B.email), /not available/);
        assert.ok(!b.s.highlights(B.email).unanswered.some(p => p.id === id));
        assert.ok(!b.s.similar({ title: 'study group plan loops week', tags: 'loops' }, B.email).some(p => p.id === id));
        assert.equal(b.s.channelSummary(B.email)['study-python'], undefined);
        await assert.rejects(b.s.reply(id, 'sneaky', B.email), /approval is required/);
        assert.equal(a.s.get(id, A.email).title, 'Private study group plan for loops week');
    });

    await check('Migration v2 -> v3: old private-channel posts and approvals move to the matching study group (no audience widens)', async () => {
        const old = memory();
        old.setItem('codementor-community-memberships-v1', JSON.stringify({ version: 1, requests: [{ id: 'm1', channel: 'python', owner: A.email, name: A.name, reason: 'x', status: 'approved', updatedAt: '2026-01-01T00:00:00.000Z' }], audit: [] }));
        const post = { id: 'old-1', channel: 'python', owner: A.email, name: A.name, createdAt: '2026-01-02T00:00:00.000Z', editedAt: null, title: 'Old private post', body: 'b', code: null, tags: [], reactions: { helpful: [], thanks: [] }, saved: [], solved: false, replies: [], reports: [], moderation: { state: 'visible' } };
        old.setItem('codementor-community-v1', JSON.stringify({ version: 2, posts: [post], audit: [], seen: {}, activity: {} }));
        const oa = tab(old, A, { extraScripts: EXTRA }), ob = tab(old, B, { extraScripts: EXTRA });
        assert.equal(oa.m.state('study-python', A.email), 'approved');
        assert.equal(oa.s.get('old-1', A.email).channel, 'study-python');
        assert.equal(ob.s.query({}, B.email).total, 0, 'a student who was never approved still cannot see it');
        assert.equal(ob.s.query({ channel: 'python' }, B.email).total, 0, 'it did not become public in the open Python channel');
        await oa.s.toggleSaved('old-1', A.email);
        assert.equal(JSON.parse(old.getItem('codementor-community-v1')).version, 3, 'saved in the new form on the next write');
    });

    await check('Unread badges: posts and replies by others since I last opened the channel; my own never count', async () => {
        const e = tab(memory(), A, { extraScripts: EXTRA }), mem = e.context.localStorage;
        const f = tab(mem, B, { extraScripts: EXTRA });
        await e.s.markChannelSeen('help', A.email);
        assert.equal(e.s.channelSummary(A.email).help.unread, 0);
        await new Promise(r => setTimeout(r, 5));
        const p = await f.s.createPost({ channel: 'help', title: 'New help question', body: 'b' }, B.email);
        await e.s.createPost({ channel: 'help', title: 'My own question', body: 'b' }, A.email);
        assert.equal(e.s.channelSummary(A.email).help.unread, 1);
        await f.s.reply(p, 'More detail', B.email);
        assert.equal(e.s.channelSummary(A.email).help.unread, 2);
        assert.equal(e.s.channelSummary(A.email).help.total, 2);
        await new Promise(r => setTimeout(r, 5));
        await e.s.markChannelSeen('help', A.email);
        assert.equal(e.s.channelSummary(A.email).help.unread, 0);
        await assert.rejects(e.s.markChannelSeen('study-help', A.email), /approval is required/);
    });

    await check('Account switch: a tab signed in as A cannot write as A after the session became B', async () => {
        const mem = memory(), t = tab(mem, A, { extraScripts: EXTRA });
        const id = await t.s.createPost({ channel: 'general', title: 'Before switch', body: 'b' }, A.email);
        t.state.account = B;
        await assert.rejects(t.s.createPost({ channel: 'general', title: 'stale', body: 'b' }, A.email), /account changed/);
        await assert.rejects(t.s.reply(id, 'stale reply', A.email), /account changed/);
        await assert.rejects(t.s.markChannelSeen('general', A.email), /account changed/);
        assert.equal(t.s.query({ mine: true }, B.email).total, 0, "B does not inherit A's posts as 'mine'");
        assert.equal(t.s.get(id, B.email).mine, false);
    });

    await check('Under-18 rules unchanged: no private contact anywhere; views never expose email addresses', async () => {
        deq(a.s.contactPolicy(15), { allowed: false, reason: 'Learners under 18 cannot be contacted privately.' });
        assert.equal(a.s.contactPolicy(30).allowed, false);
        const json = JSON.stringify([a.s.query({ pageSize: 50 }, A.email), a.s.highlights(A.email)]);
        assert.ok(!json.includes(B.email) && !json.includes('@example.test'), 'no emails in what the page receives');
        a.window.dispatchEvent({ type: 'community-changed' });
        assert.ok(!a.dom.walk().some(n => n.tagName === 'BUTTON' && /message|contact|dm\b/i.test(n.textContent)));
    });

    await check('Corrupt membership records lock study groups only (fail closed, never overwritten); open channels keep working', async () => {
        const mem = memory(), t = tab(mem, A, { extraScripts: EXTRA });
        const open = await t.s.createPost({ channel: 'general', title: 'Open post survives', body: 'b' }, A.email);
        mem.setItem('codementor-community-memberships-v1', 'broken-records');
        assert.equal(t.s.get(open, A.email).title, 'Open post survives');
        await assert.rejects(t.s.createPost({ channel: 'study-python', title: 'x', body: 'y' }, A.email), /could not be read|Access is locked/);
        assert.ok(!t.s.query({}, A.email).channels.some(c => c.startsWith('study-')));
        t.run('js/community.js');
        assert.match(t.dom.ids.get('community-status').textContent, /Access is locked/);
        assert.equal(t.dom.ids.get('community-composer').hidden, false, 'open channels can still be posted to');
        assert.equal(mem.getItem('codementor-community-memberships-v1'), 'broken-records');
    });

    await check('Layout CSS: phone tabs hidden on desktop despite the shared tab style; shared tabs are 44px; side columns do not scroll inside', async () => {
        const css = fs.readFileSync('css/community.css', 'utf8'), shared = fs.readFileSync('css/student-premium.css', 'utf8');
        assert.ok(css.includes('body.student-ui .community-v2 .community-mobile-tabs { display:none; }'), 'hidden by default (beats the shared [role=tablist] style)');
        const phone = css.slice(css.indexOf('@media (max-width:760px) {\n    .community-header'));
        assert.ok(phone.includes('body.student-ui .community-v2 .community-mobile-tabs { display:grid;'), 'shown on phones only');
        assert.ok(shared.includes('body.student-ui [role="tablist"] [role="tab"] { min-height: 44px;'), 'shared tabs meet 44px');
        assert.ok(!/\.community-sidebar,\.community-info \{[^}]*overflow:auto/.test(css), 'no nested scrolling side columns');
    });

    // ---------- group 4: reputation and badges ----------
    const people = n => ({ name: `Rep Learner ${n}`, email: `rep-${n}@example.test`, role: 'student', isDemo: true });
    const repMem = memory(), R = [1, 2, 3, 4, 5, 6].map(n => { const p = people(n); return { p, t: tab(repMem, p, { extraScripts: EXTRA }) }; });
    const clearRate = () => { const raw = repMem.getItem('codementor-community-v1'); if (!raw) return; const d = JSON.parse(raw); d.activity = {}; repMem.setItem('codementor-community-v1', JSON.stringify(d)); };
    await check('Reputation: exact points from accepted answers and Helpful reactions; self-reactions and self-answers earn nothing', async () => {
        const [one, two, three] = R;
        const q = await one.t.s.createPost({ channel: 'help', title: 'Reputation question', body: 'b' }, one.p.email);
        const answer = await two.t.s.reply(q, 'An answer', two.p.email);
        await one.t.s.reply(q, 'My own follow-up', one.p.email);
        await one.t.s.acceptAnswer(q, answer, one.p.email);                // two: +10
        await three.t.s.reactReply(q, answer, three.p.email);              // two: +2
        await one.t.s.reactReply(q, answer, one.p.email);                  // two: +2
        await two.t.s.react(q, 'helpful', two.p.email);                    // one: +1
        await one.t.s.react(q, 'helpful', one.p.email);                    // own post: +0
        const r2 = two.t.s.reputation(two.p.email), r1 = one.t.s.reputation(one.p.email);
        deq([r2.me.points, r2.me.weekPoints, r2.me.accepted, r2.me.helpfulReceived, r2.me.answers], [14, 14, 1, 2, 1]);
        deq(r2.me.badges, ['first-answer', 'problem-solver']);
        deq(r2.me.acceptedReplyIds, [answer]);
        deq([r1.me.points, r1.me.answers, r1.me.badges], [1, 0, []], 'replying to your own post is not an answer');
        deq(r1.helpers.map(h => [h.name, h.points]), [['Rep Learner 2', 14], ['Rep Learner 1', 1]]);
        deq(r1.POINTS, { accepted: 10, replyHelpful: 2, postHelpful: 1 });
    });
    await check('Badges: Helper after 5 answers to others; Welcome wagon after replying to 3 members’ first posts', async () => {
        const helper = R[2];
        const firsts = [];
        for (const other of [R[3], R[4], R[5]]) { clearRate(); firsts.push(await other.t.s.createPost({ channel: 'general', title: `Hello from ${other.p.name}`, body: 'Hi all' }, other.p.email)); }
        for (const id of firsts) { clearRate(); await helper.t.s.reply(id, 'Welcome!', helper.p.email); }
        assert.ok(helper.t.s.reputation(helper.p.email).me.badges.includes('welcome-wagon'));
        assert.ok(!helper.t.s.reputation(helper.p.email).me.badges.includes('helper'), '3 answers are not yet Helper');
        clearRate(); const extra = await R[3].t.s.createPost({ channel: 'general', title: 'Second post', body: 'b' }, R[3].p.email);
        clearRate(); await helper.t.s.reply(extra, 'Answer 4', helper.p.email);
        clearRate(); await helper.t.s.reply(extra, 'Answer 5', helper.p.email);
        deq(helper.t.s.reputation(helper.p.email).me.badges, ['first-answer', 'helper', 'welcome-wagon']);
    });
    await check('Weekly helpers use the last 7 days; all-time points stay', async () => {
        const later = Date.now() + 8 * 86400000, r = R[1].t.s.reputation(R[1].p.email, later);
        assert.equal(r.me.points, 14); assert.equal(r.me.weekPoints, 0); deq(r.helpers, []);
    });
    await check('Hidden posts and private study groups never feed reputation for people who cannot read them', async () => {
        const admin2 = tab(repMem, null, { admin: true });
        await R[0].t.m.request('study-help', 'Group', R[0].p.email); await approve(admin2, R[0].p.email, 'study-help');
        await R[1].t.m.request('study-help', 'Group', R[1].p.email); await approve(admin2, R[1].p.email, 'study-help');
        clearRate(); const g = await R[0].t.s.createPost({ channel: 'study-help', title: 'Group question', body: 'b' }, R[0].p.email);
        const ga = await R[1].t.s.reply(g, 'Group answer', R[1].p.email);
        await R[0].t.s.acceptAnswer(g, ga, R[0].p.email);
        assert.equal(R[1].t.s.reputation(R[1].p.email).me.points, 24, 'a member sees the group answer counted');
        assert.equal(R[5].t.s.reputation(R[5].p.email).helpers.find(h => h.name === 'Rep Learner 2').points, 14, 'a non-member does not');
        const q = R[0].t.s.query({ search: 'Reputation question' }, R[0].p.email).items[0].id;
        await R[5].t.s.report(q, 'Testing hidden posts in reputation.', R[5].p.email); await admin2.s.moderate(q, 'hide', 'Test');
        assert.equal(R[5].t.s.reputation(R[5].p.email).helpers.some(h => h.name === 'Rep Learner 1'), false, 'hidden post no longer counts');
        await admin2.s.moderate(q, 'restore', 'Test');
    });
    await check('Page: badges next to names, a profile card with real numbers, and the accepted-answer celebration only once', async () => {
        const two = R[1], calls = { toast: [], confetti: 0 }, seen = {};
        two.t.window.interactionKit = { toast: (m) => calls.toast.push(m), confetti: () => { calls.confetti++; }, stagger: () => {}, seenStore: () => ({ get: k => seen[k], set: (k, v) => { seen[k] = v; return true; } }) };
        two.t.run('js/community.js');
        const text = two.t.dom.ids.get('community-profile').textContent;
        assert.match(text, /Helpful points24/); assert.match(text, /Accepted answers2/);
        assert.ok(two.t.dom.walk().some(n => n.className === 'community-badge-chip' && n.getAttribute('aria-label') === 'Badge: Problem solver'));
        assert.match(two.t.dom.ids.get('community-helpers').textContent, /Rep Learner 2 \(you\)/);
        assert.equal(calls.confetti, 1); assert.match(calls.toast.join(), /Your answer was accepted/);
        two.t.window.dispatchEvent({ type: 'community-changed' });
        assert.equal(calls.confetti, 1, 'celebrated once, not on every render');
    });

    console.log(`${count} community v2 checks passed.`);
})().catch(error => { console.error(error); process.exit(1); });
