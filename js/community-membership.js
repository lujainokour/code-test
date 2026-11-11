/* Browser-local membership workflow. Production privacy requires server enforcement. */
(() => {
    "use strict";
    const key = "codementor-community-memberships-v1";
    const catalogue = Object.freeze({questions: "Questions & help", notes: "Study notes", resources: "Resources", projects: "Projects"});
    const states = ["pending", "approved", "rejected", "revoked", "cancelled", "left"];
    function admin() {
        const a = JSON.parse(sessionStorage.getItem("codementor-admin-session") || "null");
        if (a?.role !== "admin" || a.isDemo !== true || !Number.isFinite(a.signedInAt) || a.signedInAt > Date.now() || Date.now() - a.signedInAt >= 8 * 3600000) throw Error("Sign in as an administrator to manage community access.");
        return a;
    }
    function read() {
        try {
            const raw = localStorage.getItem(key);
            if (raw === null) return {version: 1, requests: []};
            const d = JSON.parse(raw), str = (v, max) => typeof v === "string" && v.trim() && v.length <= max;
            if (d?.version !== 1 || !Array.isArray(d.requests) || !d.requests.every(r => str(r.id, 100) && str(r.owner, 254) && r.owner === r.owner.trim().toLowerCase() && str(r.name, 160) && str(r.reason, 1000) && Object.hasOwn(catalogue, r.channel) && states.includes(r.status) && Number.isFinite(Date.parse(r.updatedAt))) || new Set(d.requests.map(r => `${r.owner}:${r.channel}`)).size !== d.requests.length || new Set(d.requests.map(r => r.id)).size !== d.requests.length) throw Error();
            return d;
        } catch { throw Error("Community access records could not be read. Access is locked; existing records were kept."); }
    }
    const student = expected => window.platformStore.student(expected);
    function state(channel, expected) {
        const a = student(expected);
        return read().requests.find(r => r.owner === a.email.trim().toLowerCase() && r.channel === channel)?.status || "none";
    }
    function assertMember(channel, expected) {
        if (!Object.hasOwn(catalogue, channel) || state(channel, expected) !== "approved") throw Error("Administrator approval is required to enter this channel.");
    }
    async function transaction(check, change) {
        check();
        if (!navigator.locks?.request) throw Error("Open the site on localhost or HTTPS to update membership safely.");
        return navigator.locks.request(key, () => {
            const actor = check(), data = read(); change(data, actor); check();
            localStorage.setItem(key, JSON.stringify(data));
            window.dispatchEvent(new Event("community-membership-changed"));
        });
    }
    function request(channel, reason, expected) {
        return transaction(() => student(expected), (data, a) => {
            if (!Object.hasOwn(catalogue, channel) || typeof reason !== "string" || !reason.trim() || reason.length > 1000) throw Error("Choose a channel and explain why you would like to join (up to 1000 characters).");
            const owner = a.email.trim().toLowerCase(), prior = data.requests.find(r => r.owner === owner && r.channel === channel);
            if (prior && ["pending", "approved"].includes(prior.status)) throw Error("You already have a pending request or membership for this channel.");
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
    function decide(id, status) {
        return transaction(admin, data => {
            const r = data.requests.find(r => r.id === id);
            if (!r || !((r.status === "pending" && ["approved", "rejected"].includes(status)) || (r.status === "approved" && status === "revoked"))) throw Error("This request changed. Refresh before reviewing it.");
            r.status = status; r.updatedAt = new Date().toISOString();
        });
    }
    window.communityMembership = Object.freeze({key, catalogue, state, assertMember, request, withdraw, decide, requests() { admin(); return structuredClone(read().requests); }});
})();
