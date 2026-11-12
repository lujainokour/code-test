/* Browser-local membership workflow for community GROUPS (one per catalog language, plus General,
   Help and Show your project) and private STUDY GROUPS. Every group needs administrator approval
   unless an administrator explicitly opens it (access mode lives in js/community-store.js).
   Production privacy requires server enforcement. */
(() => {
    "use strict";
    const key = "codementor-community-memberships-v1"; // payload version 2; version 1 is migrated on read
    // One group per language in js/language-catalog.js (tests/community-groups.cjs checks the list matches).
    const LANGUAGES = [["python", "Python", false], ["javascript", "JavaScript", false], ["csharp", "C#", true], ["cpp", "C++", true], ["typescript", "TypeScript", true],
        ["java", "Java", true], ["c", "C", true], ["go", "Go", true], ["rust", "Rust", true], ["php", "PHP", true], ["ruby", "Ruby", true], ["swift", "Swift", true], ["kotlin", "Kotlin", true]];
    const TOPICS = [["general", "General"], ["help", "Help"], ["projects", "Show your project"]];
    const STUDY = [["study-python", "Python study group"], ["study-javascript", "JavaScript study group"], ["study-general", "General study group"], ["study-projects", "Project builders"], ["study-help", "Help circle"]];
    const groups = Object.freeze(Object.fromEntries([
        ...LANGUAGES.map(([id, label, comingSoon]) => [id, Object.freeze({label, kind: "language", language: id, comingSoon})]),
        ...TOPICS.map(([id, label]) => [id, Object.freeze({label, kind: "topic", comingSoon: false})]),
        ...STUDY.map(([id, label]) => [id, Object.freeze({label, kind: "study", comingSoon: false})])
    ]));
    const catalogue = Object.freeze(Object.fromEntries(Object.entries(groups).map(([id, g]) => [id, g.label])));
    // Version-1 records came from before the language groups existed: there, "python", "help" and so on
    // meant the old private channels, which became study groups. They are mapped once, on read.
    const legacy = Object.freeze({python: "study-python", javascript: "study-javascript", general: "study-general", projects: "study-projects", help: "study-help", questions: "study-help", notes: "study-general", resources: "study-general"});
    const states = ["pending", "approved", "rejected", "revoked", "cancelled", "left"];
    const priority = ["approved", "pending", "rejected", "revoked", "left", "cancelled"];
    function admin() {
        const a = JSON.parse(sessionStorage.getItem("codementor-admin-session") || "null");
        if (a?.role !== "admin" || a.isDemo !== true || !Number.isFinite(a.signedInAt) || a.signedInAt > Date.now() || Date.now() - a.signedInAt >= 8 * 3600000) throw Error("Sign in as an administrator to manage community access.");
        return a;
    }
    const str = (v, max) => typeof v === "string" && v.trim() && v.length <= max;
    function migrate(requests, version) {
        const out = [];
        for (const r of requests) {
            const channel = version === 1 ? (legacy[r.channel] || r.channel) : r.channel;
            const record = {...r, channel};
            const prior = out.find(x => x.owner === record.owner && x.channel === channel);
            if (!prior) { out.push(record); continue; }
            const better = priority.indexOf(record.status) < priority.indexOf(prior.status) || (record.status === prior.status && Date.parse(record.updatedAt) > Date.parse(prior.updatedAt));
            if (better) out.splice(out.indexOf(prior), 1, record);
        }
        return out;
    }
    const validRecord = r => str(r.id, 100) && str(r.owner, 254) && r.owner === r.owner.trim().toLowerCase() && str(r.name, 160) && str(r.reason, 1000) && states.includes(r.status) &&
        Number.isFinite(Date.parse(r.updatedAt)) && (r.decisionNote === undefined || (typeof r.decisionNote === "string" && r.decisionNote.length <= 500)) && (r.sample === undefined || r.sample === true);
    function read() {
        try {
            const raw = localStorage.getItem(key);
            if (raw === null) return {version: 2, requests: [], audit: []};
            const d = JSON.parse(raw);
            if (![1, 2].includes(d?.version) || !Array.isArray(d.requests) || !d.requests.every(validRecord) || new Set(d.requests.map(r => r.id)).size !== d.requests.length) throw Error();
            if (d.audit !== undefined && !Array.isArray(d.audit)) throw Error();
            d.requests = migrate(d.requests, d.version);
            if (!d.requests.every(r => Object.hasOwn(catalogue, r.channel)) || new Set(d.requests.map(r => `${r.owner}:${r.channel}`)).size !== d.requests.length) throw Error();
            d.version = 2; d.audit = d.audit || [];
            return d;
        } catch { throw Error("Community access records could not be read. Access is locked; existing records were kept."); }
    }
    const student = expected => window.platformStore.student(expected);
    function state(channel, expected) {
        const a = student(expected);
        return read().requests.find(r => r.owner === a.email.trim().toLowerCase() && r.channel === channel)?.status || "none";
    }
    function assertMember(channel, expected) {
        if (!Object.hasOwn(catalogue, channel) || state(channel, expected) !== "approved") throw Error("Administrator approval is required to enter this group.");
    }
    async function transaction(check, change) {
        check();
        if (!navigator.locks?.request) throw Error("Open the site on localhost or HTTPS to update membership safely.");
        return navigator.locks.request(key, async () => {
            const actor = check(), data = read(), value = change(data, actor); check();
            if (data.audit.length > 500) data.audit.splice(0, data.audit.length - 500);
            localStorage.setItem(key, JSON.stringify(data));
            window.dispatchEvent(new Event("community-membership-changed"));
            return value;
        });
    }
    function request(channel, reason, expected) {
        return transaction(() => student(expected), (data, a) => {
            if (!Object.hasOwn(catalogue, channel) || typeof reason !== "string" || !reason.trim() || reason.length > 1000) throw Error("Choose a group and explain why you would like to join (up to 1000 characters).");
            const owner = a.email.trim().toLowerCase(), prior = data.requests.find(r => r.owner === owner && r.channel === channel);
            if (prior && ["pending", "approved"].includes(prior.status)) throw Error("You already have a pending request or membership for this group.");
            const record = {id: crypto.randomUUID(), channel, owner, name: a.name, reason: reason.trim(), status: "pending", updatedAt: new Date().toISOString()};
            if (prior) data.requests.splice(data.requests.indexOf(prior), 1, record); else data.requests.push(record);
        });
    }
    function withdraw(channel, expected, expectedStatus) {
        return transaction(() => student(expected), (data, a) => {
            const r = data.requests.find(r => r.owner === a.email.trim().toLowerCase() && r.channel === channel);
            if (!r || r.status !== expectedStatus || !["pending", "approved"].includes(r.status)) throw Error("This membership changed. Refresh and try again.");
            r.status = r.status === "pending" ? "cancelled" : "left"; r.updatedAt = new Date().toISOString();
        });
    }
    const ACTION = {approved: "membership-approved", rejected: "membership-rejected", revoked: "member-removed"};
    function applyDecision(data, id, status, note) {
        const r = data.requests.find(r => r.id === id);
        if (!r || !((r.status === "pending" && ["approved", "rejected"].includes(status)) || (r.status === "approved" && status === "revoked"))) throw Error("This request changed. Refresh before reviewing it.");
        r.status = status; r.updatedAt = new Date().toISOString();
        if (note) r.decisionNote = note; else delete r.decisionNote;
        data.audit.push({id: crypto.randomUUID(), at: r.updatedAt, actor: "admin", action: ACTION[status], targetType: "membership", targetId: r.id, channel: r.channel, subject: r.owner, reason: note});
    }
    function noteOf(note, required) {
        const text = typeof note === "string" ? note.trim() : "";
        if (text.length > 500) throw Error("Keep the decision note under 500 characters.");
        if (required && !text) throw Error("Give a reason for removing this member.");
        return text;
    }
    // Every admin decision leaves an audit entry. Removing a member ("revoked") requires a reason.
    function decide(id, status, note = "") {
        return transaction(admin, data => applyDecision(data, id, status, noteOf(note, status === "revoked")));
    }
    // Bulk approve or decline pending requests: all or nothing, one audit entry per request.
    function decideMany(ids, status, note = "") {
        return transaction(admin, data => {
            if (!["approved", "rejected"].includes(status)) throw Error("Bulk actions can approve or decline pending requests only.");
            const list = [...new Set(Array.isArray(ids) ? ids : [])];
            if (!list.length) throw Error("Select at least one pending request.");
            const text = noteOf(note, false);
            for (const id of list) if (data.requests.find(r => r.id === id)?.status !== "pending") throw Error("A selected request changed. Refresh before reviewing it.");
            for (const id of list) applyDecision(data, id, status, text);
            return list.length;
        });
    }
    // Keep people as members when an administrator switches a group to "Approval required"
    // (used by communityStore.setGroupMode). Existing approvals are left as they are.
    function grantMany(people, channel, note) {
        return transaction(admin, data => {
            if (!Object.hasOwn(catalogue, channel)) throw Error("Choose a group.");
            const text = noteOf(note, false); let added = 0;
            for (const person of people) {
                const owner = String(person.owner || "").trim().toLowerCase();
                if (!owner || !str(person.name, 160)) continue;
                const prior = data.requests.find(r => r.owner === owner && r.channel === channel);
                if (prior?.status === "approved") continue;
                const record = {id: crypto.randomUUID(), channel, owner, name: person.name, reason: "Kept as a member when the group changed to approval required.", status: "approved", updatedAt: new Date().toISOString(), ...(text ? {decisionNote: text} : {}), ...(person.sample ? {sample: true} : {})};
                if (prior) data.requests.splice(data.requests.indexOf(prior), 1, record); else data.requests.push(record);
                data.audit.push({id: crypto.randomUUID(), at: record.updatedAt, actor: "admin", action: "membership-kept", targetType: "membership", targetId: record.id, channel, subject: owner, reason: text});
                added++;
            }
            return added;
        });
    }
    function pendingCounts() {
        admin(); const counts = {};
        for (const r of read().requests) if (r.status === "pending") counts[r.channel] = (counts[r.channel] || 0) + 1;
        return counts;
    }
    // SAMPLE memberships for the demo (explicit admin action through communityStore.loadSample).
    function addSample(records) {
        return transaction(admin, data => {
            let added = 0;
            for (const r of records) {
                if (data.requests.some(x => x.id === r.id) || data.requests.some(x => x.owner === r.owner && x.channel === r.channel)) continue;
                if (!validRecord(r) || r.sample !== true || !Object.hasOwn(catalogue, r.channel)) throw Error("Invalid sample membership.");
                data.requests.push({...r}); added++;
            }
            return added;
        });
    }
    function removeSample() {
        return transaction(admin, data => { const before = data.requests.length; data.requests = data.requests.filter(r => r.sample !== true); return before - data.requests.length; });
    }
    // Decisions about the signed-in student's own requests (for the notifications badge).
    function myDecisions(expected) {
        const a = student(expected), owner = a.email.trim().toLowerCase();
        return read().requests.filter(r => r.owner === owner && ["approved", "rejected", "revoked"].includes(r.status)).map(r => ({id: r.id, channel: r.channel, status: r.status, updatedAt: r.updatedAt, note: r.decisionNote || ""}));
    }
    window.communityMembership = Object.freeze({
        key, groups, catalogue, legacy, state, assertMember, request, withdraw, decide, decideMany, grantMany, pendingCounts, addSample, removeSample, myDecisions,
        requests() { admin(); return structuredClone(read().requests); },
        audit() { admin(); return structuredClone(read().audit); }
    });
})();
