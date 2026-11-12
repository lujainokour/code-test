/* Browser-local membership workflow for PRIVATE study groups. Open channels need no membership
   (see js/community-store.js). Production privacy requires server enforcement. */
(() => {
    "use strict";
    const key = "codementor-community-memberships-v1";
    // Community v2: private study groups (request + administrator approval). Before v2 the five
    // channels themselves were private; each maps 1:1 to a study group so no audience widens.
    const catalogue = Object.freeze({"study-python": "Python study group", "study-javascript": "JavaScript study group", "study-general": "General study group", "study-projects": "Project builders", "study-help": "Help circle"});
    // Older records (v1 topic channels and the pre-v2 private channels) are mapped on read and saved in the new form on the next write.
    const legacy = Object.freeze({python: "study-python", javascript: "study-javascript", general: "study-general", projects: "study-projects", help: "study-help", questions: "study-help", notes: "study-general", resources: "study-general"});
    const states = ["pending", "approved", "rejected", "revoked", "cancelled", "left"];
    const priority = ["approved", "pending", "rejected", "revoked", "left", "cancelled"];
    function admin() {
        const a = JSON.parse(sessionStorage.getItem("codementor-admin-session") || "null");
        if (a?.role !== "admin" || a.isDemo !== true || !Number.isFinite(a.signedInAt) || a.signedInAt > Date.now() || Date.now() - a.signedInAt >= 8 * 3600000) throw Error("Sign in as an administrator to manage community access.");
        return a;
    }
    const str = (v, max) => typeof v === "string" && v.trim() && v.length <= max;
    function migrate(requests) {
        const out = [];
        for (const r of requests) {
            const channel = Object.hasOwn(catalogue, r.channel) ? r.channel : legacy[r.channel];
            const record = {...r, channel};
            const prior = out.find(x => x.owner === record.owner && x.channel === channel);
            if (!prior) { out.push(record); continue; }
            const better = priority.indexOf(record.status) < priority.indexOf(prior.status) || (record.status === prior.status && Date.parse(record.updatedAt) > Date.parse(prior.updatedAt));
            if (better) out.splice(out.indexOf(prior), 1, record);
        }
        return out;
    }
    function read() {
        try {
            const raw = localStorage.getItem(key);
            if (raw === null) return {version: 1, requests: [], audit: []};
            const d = JSON.parse(raw);
            if (d?.version !== 1 || !Array.isArray(d.requests) || !d.requests.every(r => str(r.id, 100) && str(r.owner, 254) && r.owner === r.owner.trim().toLowerCase() && str(r.name, 160) && str(r.reason, 1000) && (Object.hasOwn(catalogue, r.channel) || Object.hasOwn(legacy, r.channel)) && states.includes(r.status) && Number.isFinite(Date.parse(r.updatedAt)) && (r.decisionNote === undefined || (typeof r.decisionNote === "string" && r.decisionNote.length <= 500))) || new Set(d.requests.map(r => r.id)).size !== d.requests.length) throw Error();
            if (d.audit !== undefined && !Array.isArray(d.audit)) throw Error();
            d.requests = migrate(d.requests);
            if (new Set(d.requests.map(r => `${r.owner}:${r.channel}`)).size !== d.requests.length) throw Error();
            d.audit = d.audit || [];
            return d;
        } catch { throw Error("Community access records could not be read. Access is locked; existing records were kept."); }
    }
    const student = expected => window.platformStore.student(expected);
    function state(channel, expected) {
        const a = student(expected);
        return read().requests.find(r => r.owner === a.email.trim().toLowerCase() && r.channel === channel)?.status || "none";
    }
    function assertMember(channel, expected) {
        if (!Object.hasOwn(catalogue, channel) || state(channel, expected) !== "approved") throw Error("Administrator approval is required to enter this study group.");
    }
    async function transaction(check, change) {
        check();
        if (!navigator.locks?.request) throw Error("Open the site on localhost or HTTPS to update membership safely.");
        return navigator.locks.request(key, async () => {
            const actor = check(), data = read(); change(data, actor); check();
            localStorage.setItem(key, JSON.stringify(data));
            window.dispatchEvent(new Event("community-membership-changed"));
        });
    }
    function request(channel, reason, expected) {
        return transaction(() => student(expected), (data, a) => {
            if (!Object.hasOwn(catalogue, channel) || typeof reason !== "string" || !reason.trim() || reason.length > 1000) throw Error("Choose a study group and explain why you would like to join (up to 1000 characters).");
            const owner = a.email.trim().toLowerCase(), prior = data.requests.find(r => r.owner === owner && r.channel === channel);
            if (prior && ["pending", "approved"].includes(prior.status)) throw Error("You already have a pending request or membership for this study group.");
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
    // Every admin decision leaves an audit entry. Removing a member ("revoked") requires a reason.
    function decide(id, status, note = "") {
        return transaction(admin, data => {
            const r = data.requests.find(r => r.id === id);
            if (!r || !((r.status === "pending" && ["approved", "rejected"].includes(status)) || (r.status === "approved" && status === "revoked"))) throw Error("This request changed. Refresh before reviewing it.");
            note = typeof note === "string" ? note.trim() : "";
            if (note.length > 500) throw Error("Keep the decision note under 500 characters.");
            if (status === "revoked" && !note) throw Error("Give a reason for removing this member.");
            r.status = status; r.updatedAt = new Date().toISOString();
            if (note) r.decisionNote = note; else delete r.decisionNote;
            data.audit.push({id: crypto.randomUUID(), at: r.updatedAt, actor: "admin", action: {approved: "membership-approved", rejected: "membership-rejected", revoked: "member-removed"}[status], targetType: "membership", targetId: r.id, channel: r.channel, subject: r.owner, reason: note});
            if (data.audit.length > 500) data.audit.splice(0, data.audit.length - 500);
        });
    }
    // Decisions about the signed-in student's own requests (for the notifications badge).
    function myDecisions(expected) {
        const a = student(expected), owner = a.email.trim().toLowerCase();
        return read().requests.filter(r => r.owner === owner && ["approved", "rejected", "revoked"].includes(r.status)).map(r => ({id: r.id, channel: r.channel, status: r.status, updatedAt: r.updatedAt, note: r.decisionNote || ""}));
    }
    window.communityMembership = Object.freeze({
        key, catalogue, legacy, state, assertMember, request, withdraw, decide, myDecisions,
        requests() { admin(); return structuredClone(read().requests); },
        audit() { admin(); return structuredClone(read().audit); }
    });
})();
