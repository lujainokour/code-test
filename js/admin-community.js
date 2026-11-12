/* Admin: membership requests, moderation queue, audit log and SAMPLE data. Text rendered with textContent only. */
(() => {
    "use strict";
    const membership = window.communityMembership, store = window.communityStore, $ = id => document.getElementById(id);
    const root = $("membership-requests"), status = $("membership-status");
    const labels = {pending: "Pending review", approved: "Approved member", rejected: "Declined", revoked: "Access removed", cancelled: "Request cancelled", left: "Left channel"};
    function node(tag, text, cls) { const n = document.createElement(tag); if (text !== undefined) n.textContent = text; if (cls) n.className = cls; return n; }
    function btn(label, onClick, cls = "button button-outline") { const b = node("button", label, cls); b.type = "button"; b.addEventListener("click", onClick); return b; }
    function noteField(id, label) {
        const wrap = node("div", undefined, "form-field"), l = node("label", label), input = node("textarea");
        input.id = id; input.maxLength = 500; input.rows = 2; input.dir = "auto"; l.htmlFor = id; wrap.append(l, input); return {wrap, input};
    }
    function decision(label, r, state, note) {
        const b = btn(label, async () => {
            b.disabled = true;
            try {
                await membership.decide(r.id, state, note.value);
                status.textContent = state === "approved" ? "Membership approved. This student can now enter the channel." : state === "rejected" ? "Join request declined." : "Member removed. This student can no longer enter the channel.";
            } catch (error) { status.textContent = error.message; }
            renderAll();
        });
        return b;
    }
    function renderMembership() {
        try {
            const records = membership.requests().filter(r => ($("membership-filter").value === "all" || r.status === $("membership-filter").value) && ($("membership-channel").value === "all" || r.channel === $("membership-channel").value)).sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
            $("membership-count").textContent = `${records.length} ${records.length === 1 ? "record" : "records"}`;
            const pendingShown = records.filter(r => r.status === "pending");
            $("bulk-actions").hidden = !pendingShown.length; $("bulk-select-all").checked = false;
            root.replaceChildren(...records.map(r => {
                const card = node("article", undefined, "community-panel"); card.dataset.requestId = r.id;
                if (r.status === "pending") {
                    const pick = node("input", undefined, "membership-select"); pick.type = "checkbox"; pick.dataset.requestId = r.id;
                    pick.setAttribute("aria-label", `Select the request from ${r.name} for ${membership.catalogue[r.channel]}`);
                    card.append(pick);
                }
                card.append(node("span", labels[r.status], "community-badge"));
                if (r.sample) card.append(node("span", "SAMPLE", "community-sample-badge"));
                card.append(node("h3", r.name), node("p", r.owner), node("b", membership.catalogue[r.channel]));
                const reason = node("p", r.reason, "community-post-body"); reason.dir = "auto"; card.append(reason);
                if (r.decisionNote) card.append(node("p", `Decision note: ${r.decisionNote}`, "community-storage-note"));
                card.append(node("p", `Updated ${new Date(r.updatedAt).toLocaleString()}`, "community-storage-note"));
                if (["pending", "approved"].includes(r.status)) {
                    const note = noteField(`note-${r.id}`, r.status === "pending" ? "Note to the student (optional)" : "Reason for removing this member (required)");
                    const actions = node("div", undefined, "community-post-actions");
                    if (r.status === "pending") actions.append(decision("Approve request", r, "approved", note.input), decision("Decline request", r, "rejected", note.input));
                    else actions.append(decision("Remove member", r, "revoked", note.input));
                    card.append(note.wrap, actions);
                }
                return card;
            }));
            if (!records.length) root.append(node("p", "No memberships match these filters.", "community-empty"));
        } catch (error) { status.textContent = error.message; root.replaceChildren(); $("membership-count").textContent = ""; }
    }
    function renderQueue() {
        const host = $("review-queue"), msg = $("review-status");
        try {
            const items = store.queue(), open = items.reduce((n, p) => n + p.reports.filter(r => r.status === "open").length, 0);
            $("review-count").hidden = open === 0; $("review-count").textContent = String(open);
            host.replaceChildren(...items.map(item => {
                const card = node("article", undefined, "community-panel"); card.dataset.postId = item.id;
                const openReports = item.reports.filter(r => r.status === "open");
                card.append(node("span", item.moderation.state === "visible" ? `${openReports.length} OPEN REPORT${openReports.length === 1 ? "" : "S"}` : item.moderation.state.toUpperCase(), "community-badge"));
                if (item.sample) card.append(node("span", "SAMPLE", "community-sample-badge"));
                card.append(node("h3", item.title), node("p", `${item.author} · ${store.channelLabel(item.channel)} · ${new Date(item.createdAt).toLocaleString()}`, "community-storage-note"));
                if (item.body) { const b = node("p", item.body, "community-post-body"); b.dir = "auto"; card.append(b); }
                if (item.code) { const pre = node("pre", undefined, "community-code"); pre.append(node("code", item.code.text)); pre.dir = "ltr"; card.append(pre); }
                if (item.moderation.reason) card.append(node("p", `Moderator reason: ${item.moderation.reason}`, "community-moderation-note"));
                const list = node("ul"); item.reports.forEach(r => list.append(node("li", `${r.status === "open" ? "Open" : "Resolved"} report: ${r.reason}`))); card.append(list);
                if (item.moderation.state !== "removed") {
                    const note = noteField(`moderation-${item.id}`, "Reason (required, saved in the audit log)");
                    const actions = node("div", undefined, "community-post-actions");
                    const buttonLabels = {hide: "Hide post", restore: "Restore post", dismiss: "Dismiss reports", remove: "Remove post"};
                    const run = (action, done) => btn(buttonLabels[action], async () => {
                        if (action === "remove" && !window.confirm("Remove this post permanently? Its content and replies are erased.")) return;
                        try { await store.moderate(item.id, action, note.input.value); msg.textContent = done; } catch (error) { msg.textContent = error.message; }
                        renderAll();
                    });
                    if (item.moderation.state === "visible") actions.append(run("hide", "Post hidden. Only its author can still see it."));
                    if (item.moderation.state === "hidden") actions.append(run("restore", "Post restored for channel members."));
                    if (openReports.length) actions.append(run("dismiss", "Reports dismissed. The post stays as it is."));
                    actions.append(run("remove", "Post removed."));
                    card.append(note.wrap, actions);
                }
                return card;
            }));
            if (!items.length) host.append(node("p", "Nothing to review. Reported posts appear here.", "community-empty"));
        } catch (error) { msg.textContent = error.message; host.replaceChildren(); }
    }
    // Channels table and pin/lock controls. Counts come from the store; text is set with textContent.
    // Explicit, audited access switch per group (study groups always need approval).
    async function switchMode(row) {
        const to = row.mode === "open" ? "approval" : "open", note = $("access-note").value;
        const question = to === "open" ? `Open ${row.label}? Any signed-in student will be able to read and post without approval.` : `Require approval for ${row.label}? Everyone who already posted or replied there is kept as a member; others will need to request.`;
        if (!window.confirm(question)) { $("access-status").textContent = "Nothing was changed."; return; }
        try {
            const result = await store.setGroupMode(row.id, to, note);
            $("access-status").textContent = to === "open" ? `${row.label} is now open. The change is in the audit log.` : `${row.label} now requires approval. ${result.kept} existing participant(s) kept as members. The change is in the audit log.`;
            $("access-note").value = "";
        } catch (error) { $("access-status").textContent = error.message; }
        renderAll();
    }
    function renderChannels() {
        const body = $("channel-stats");
        try {
            const rows = store.channelStats();
            body.replaceChildren(...rows.map(r => {
                const tr = node("tr"); tr.dataset.channel = r.id; tr.dataset.mode = r.mode;
                const name = node("th", r.label + (r.comingSoon ? " (path coming soon)" : "")); name.scope = "row";
                const access = node("td");
                access.append(node("span", r.mode === "open" ? "Open" : "Approval required", r.mode === "open" ? "community-badge community-mode-open" : "community-badge"));
                if (r.kind !== "study") { const b = btn(r.mode === "open" ? "Require approval" : "Open group", () => switchMode(r)); b.dataset.modeSwitch = r.id; access.append(b); }
                if (r.modeBy === "migration") access.append(node("small", "Kept open from before approval was required", "community-storage-note"));
                const pending = node("td");
                if (r.pending) { const badge = node("span", String(r.pending), "community-count-badge"); badge.setAttribute("aria-label", `${r.pending} pending`); pending.append(badge); } else pending.textContent = r.pending === null ? "?" : "0";
                const type = {language: "Language", topic: "Topic", study: "Study group"}[r.kind];
                tr.append(name, node("td", type), access, pending, node("td", r.members === null ? "Unavailable" : String(r.members)), ...[r.posts, r.replies, r.solved, r.hidden, r.pinned, r.locked].map(v => node("td", String(v))));
                return tr;
            }));
            for (const option of $("membership-channel").options || []) { const r = rows.find(x => x.id === option.value); if (r) option.textContent = r.pending ? `${r.label} (${r.pending} pending)` : r.label; }
            const select = $("thread-channel"), current = select.value || "all";
            select.replaceChildren(Object.assign(node("option", "All channels"), {value: "all"}), ...rows.map(r => Object.assign(node("option", r.label), {value: r.id})));
            select.value = rows.some(r => r.id === current) ? current : "all";
        } catch (error) { body.replaceChildren(); $("thread-status").textContent = error.message; }
    }
    function renderThreads() {
        const host = $("thread-list"), msg = $("thread-status");
        try {
            const items = store.adminThreads({channel: $("thread-channel").value || "all", limit: 25});
            host.replaceChildren(...items.map(item => {
                const card = node("article", undefined, "community-panel"); card.dataset.postId = item.id;
                const flags = [item.pinned && "PINNED", item.locked && "LOCKED", item.state === "hidden" && "HIDDEN"].filter(Boolean);
                if (flags.length) card.append(node("span", flags.join(" · "), "community-badge"));
                if (item.sample) card.append(node("span", "SAMPLE", "community-sample-badge"));
                card.append(node("h3", item.title), node("p", `${item.author} · ${store.channelLabel(item.channel)} · ${item.replies} replies · ${new Date(item.createdAt).toLocaleString()}`, "community-storage-note"));
                const note = noteField(`thread-${item.id}`, item.locked ? "Reason for unlocking (required)" : "Reason for locking (required for lock)");
                const actions = node("div", undefined, "community-post-actions");
                actions.append(btn(item.pinned ? "Unpin" : "Pin to top", async () => {
                    try { await store.pinPost(item.id, !item.pinned, note.input.value); msg.textContent = item.pinned ? "Post unpinned." : "Post pinned. It shows first in Latest."; } catch (error) { msg.textContent = error.message; }
                    renderAll();
                }), btn(item.locked ? "Unlock thread" : "Lock thread", async () => {
                    try { await store.lockPost(item.id, !item.locked, note.input.value); msg.textContent = item.locked ? "Thread unlocked. Replies are open again." : "Thread locked. New replies are closed."; } catch (error) { msg.textContent = error.message; }
                    renderAll();
                }));
                card.append(note.wrap, actions);
                return card;
            }));
            if (!items.length) host.append(node("p", "No posts in this channel yet.", "community-empty"));
        } catch (error) { msg.textContent = error.message; host.replaceChildren(); }
    }
    const actionLabels = {"group-opened": "Group opened", "group-approval-required": "Group requires approval", "group-kept-open": "Group kept open (migration)", "membership-kept": "Member kept (access change)", "post-pinned": "Post pinned", "post-unpinned": "Post unpinned", "thread-locked": "Thread locked", "thread-unlocked": "Thread unlocked", "membership-approved": "Membership approved", "membership-rejected": "Membership declined", "member-removed": "Member removed", "post-hidden": "Post hidden", "post-restored": "Post restored", "post-removed": "Post removed", "post-reports-dismissed": "Reports dismissed", "sample-loaded": "Sample data loaded", "sample-removed": "Sample data removed"};
    function renderAudit() {
        const host = $("audit-log");
        try {
            const entries = [...membership.audit(), ...store.auditLog()].sort((a, b) => Date.parse(b.at) - Date.parse(a.at)).slice(0, 200);
            host.replaceChildren(...entries.map(e => {
                const li = node("li"); li.dataset.action = e.action;
                const where = e.channel ? ` · ${store.channelLabel(e.channel)}` : "";
                const who = e.subject ? ` · ${e.subject}` : "";
                li.append(node("b", actionLabels[e.action] || e.action), node("span", `${where}${who} · ${new Date(e.at).toLocaleString()}`));
                if (e.reason) li.append(node("p", `Reason: ${e.reason}`, "community-storage-note"));
                if (e.detail) li.append(node("p", e.detail, "community-storage-note"));
                return li;
            }));
            if (!entries.length) host.append(node("li", "No administrator actions yet.", "community-empty"));
        } catch (error) { host.replaceChildren(node("li", error.message)); }
    }
    function renderSample() {
        try {
            const s = store.sampleStatus();
            $("sample-state").textContent = s.loaded ? `Loaded: ${s.posts} sample posts with ${s.replies} sample replies.` : "No sample data is loaded.";
            $("sample-remove").disabled = !s.loaded;
        } catch (error) { $("sample-state").textContent = error.message; }
    }
    function renderAll() { renderChannels(); renderThreads(); renderMembership(); renderQueue(); renderAudit(); renderSample(); }
    $("sample-load").addEventListener("click", async () => {
        try { const added = await store.loadSample(); $("sample-status").textContent = added ? `${added} sample posts added. They appear in the open channels for every signed-in student, labelled SAMPLE.` : "Sample data was already loaded. Nothing was added."; }
        catch (error) { $("sample-status").textContent = error.message; }
        renderAll();
    });
    $("sample-remove").addEventListener("click", async () => {
        try {
            let result;
            try { result = await store.removeSample(); }
            catch (error) {
                if (!error.realReplies) throw error;
                if (!window.confirm(`${error.message}\n\nRemove the sample posts together with those replies?`)) { $("sample-status").textContent = "Nothing was removed."; return; }
                result = await store.removeSample({includeRealReplies: true});
            }
            $("sample-status").textContent = `${result.posts} sample posts removed. Real posts were not changed.`;
        } catch (error) { $("sample-status").textContent = error.message; }
        renderAll();
    });
    Object.entries(membership.catalogue).forEach(([id, label]) => { const o = node("option", label); o.value = id; $("membership-channel").append(o); });
    $("thread-channel").addEventListener("change", renderThreads);
    // Bulk approve/decline: all selected pending requests, one shared optional note, each audited.
    async function bulk(status) {
        const ids = [...document.querySelectorAll("#membership-requests .membership-select")].filter(c => c.checked).map(c => c.dataset.requestId);
        try { const n = await membership.decideMany(ids, status, $("bulk-note").value); $("membership-status").textContent = `${n} request${n === 1 ? "" : "s"} ${status === "approved" ? "approved" : "declined"}.`; $("bulk-note").value = ""; }
        catch (error) { $("membership-status").textContent = error.message; }
        renderAll();
    }
    $("bulk-approve").addEventListener("click", () => bulk("approved"));
    $("bulk-decline").addEventListener("click", () => bulk("rejected"));
    $("bulk-select-all").addEventListener("change", event => { for (const c of document.querySelectorAll("#membership-requests .membership-select")) c.checked = event.currentTarget.checked; });
    $("membership-filter").addEventListener("change", renderMembership); $("membership-channel").addEventListener("change", renderMembership);
    window.addEventListener("community-membership-changed", renderAll);
    window.addEventListener("community-changed", renderAll);
    window.addEventListener("storage", event => { if ([membership.key, store.key, null].includes(event.key)) renderAll(); });
    window.addEventListener("pageshow", renderAll);
    renderAll();
})();
