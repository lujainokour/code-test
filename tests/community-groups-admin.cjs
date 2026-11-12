/* Community GROUPS admin page: pending badges, bulk decisions and the explicit Open switch.
   Community GROUPS access model: one group per catalog language (+ General, Help, Show your project),
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
    await check('Admin page: pending badges per group, bulk approve with a note, and an explicit confirmed Open switch', async () => {
        const mem = memory(), ad = tab(mem, null, { admin: true });
        for (const n of [1, 2]) { const l = { name: `Page Learner ${n}`, email: `page-${n}@example.test`, role: 'student', isDemo: true }; await tab(mem, l).m.request('swift', 'Swift please', l.email); }
        const page = tab(mem, null, { admin: true });
        page.dom.document.getElementById('membership-filter').value = 'pending'; page.dom.document.getElementById('membership-channel').value = 'all'; // the HTML defaults
        page.run('js/admin-community.js');
        const row = page.dom.ids.get('channel-stats').children.find(r => r.dataset.channel === 'swift');
        assert.equal(row.dataset.mode, 'approval'); assert.ok(walk(row).some(n => n.className === 'community-count-badge' && n.textContent === '2'));
        assert.equal(page.dom.ids.get('bulk-actions').hidden, false);
        for (const c of page.dom.walk().filter(n => n.className === 'membership-select')) c.checked = true;
        page.dom.document.getElementById('bulk-note').value = 'Welcome!';
        page.window.document = page.dom.document;
        page.dom.document.querySelectorAll = sel => sel === '#membership-requests .membership-select' ? walk(page.dom.ids.get('membership-requests')).filter(n => n.className === 'membership-select') : [];
        await page.dom.ids.get('bulk-approve').fire('click');
        assert.match(page.dom.ids.get('membership-status').textContent, /2 requests approved/);
        assert.equal(ad.m.requests().filter(r => r.status === 'approved' && r.decisionNote === 'Welcome!').length, 2);
        page.dom.document.getElementById('access-note').value = 'Open for the Swift workshop';
        const swift = page.dom.ids.get('channel-stats').children.find(r => r.dataset.channel === 'swift');
        await walk(swift).find(n => n.tagName === 'BUTTON' && n.dataset.modeSwitch === 'swift').fire('click');
        assert.equal(ad.s.channelStats().find(r => r.id === 'swift').mode, 'open');
        assert.ok(page.dom.walk().some(n => n.tagName === 'B' && n.textContent === 'Group opened'), 'audit log shows the change');
    });

    console.log(`${count} community group admin checks passed.`);
})().catch(error => { console.error(error); process.exit(1); });
