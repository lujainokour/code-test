(() => {
    "use strict";
    const membership = window.communityMembership, $ = id => document.getElementById(id);
    const root = $("membership-requests"), status = $("membership-status");
    const labels = {pending: "Pending review", approved: "Approved member", rejected: "Declined", revoked: "Access removed", cancelled: "Request cancelled", left: "Left channel"};
    function node(tag, text, cls) { const n = document.createElement(tag); if (text !== undefined) n.textContent = text; if (cls) n.className = cls; return n; }
    function action(label, id, state) {
        const b = node("button", label, "button button-outline"); b.type = "button";
        b.addEventListener("click", async () => {
            b.disabled = true;
            try { await membership.decide(id, state); status.textContent = state === "approved" ? "Membership approved. This student can now enter the channel." : state === "rejected" ? "Join request declined." : "Access removed. This student can no longer enter the channel."; render(); }
            catch (error) { status.textContent = error.message; render(); }
        }); return b;
    }
    function render() {
        try {
            const records = membership.requests().filter(r => ($("membership-filter").value === "all" || r.status === $("membership-filter").value) && ($("membership-channel").value === "all" || r.channel === $("membership-channel").value)).sort((a,b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
            $("membership-count").textContent = `${records.length} ${records.length === 1 ? "record" : "records"}`;
            root.replaceChildren(...records.map(r => {
                const card = node("article", undefined, "community-panel"); card.dataset.requestId = r.id;
                card.append(node("span", labels[r.status], "community-badge"), node("h2", r.name), node("p", r.owner), node("b", membership.catalogue[r.channel]));
                const reason = node("p", r.reason, "community-post-body"); reason.dir = "auto";
                card.append(reason, node("p", `Updated ${new Date(r.updatedAt).toLocaleString()}`, "community-storage-note"));
                const actions = node("div", undefined, "community-post-actions");
                if (r.status === "pending") actions.append(action("Approve request", r.id, "approved"), action("Decline request", r.id, "rejected"));
                if (r.status === "approved") actions.append(action("Remove access", r.id, "revoked"));
                card.append(actions); return card;
            }));
            if (!records.length) root.append(node("p", "No memberships match these filters.", "community-empty"));
        } catch (error) { status.textContent = error.message; root.replaceChildren(); $("membership-count").textContent = ""; }
    }
    Object.entries(membership.catalogue).forEach(([id, label]) => { const o = node("option", label); o.value = id; $("membership-channel").append(o); });
    $("membership-filter").addEventListener("change", render); $("membership-channel").addEventListener("change", render);
    window.addEventListener("community-membership-changed", render);
    window.addEventListener("storage", event => { if ([membership.key, null].includes(event.key)) render(); });
    window.addEventListener("pageshow", render);
    render();
})();
