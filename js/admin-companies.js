/* Admin company directory. Renders only whitelisted fields with textContent: no passwords, hashes,
   message contents or unpublished student details ever reach this page. */
(() => {
    "use strict";
    const root = document.getElementById("admin-companies-content"); if (!root) return;
    const api = window.companyStore.admin;
    const el = (tag, text, cls) => { const n = document.createElement(tag); if (text !== undefined) n.textContent = text; if (cls) n.className = cls; return n; };
    const day = iso => iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "Not recorded";
    const stamp = iso => iso ? new Date(iso).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }) : "Not recorded";
    const stageLabels = { applied: "Applied", interview: "Interview", accepted: "Accepted", rejected: "Rejected", completed: "Completed" };
    const filters = { search: "", status: "all", flagged: false, sort: "name" };
    const open = new Set();
    let message = "";

    function dl(rows) {
        const list = el("dl", undefined, "admin-company-details");
        rows.forEach(([title, value]) => { const row = el("div"); row.append(el("dt", title), el("dd", value === undefined || value === "" ? "Not provided" : String(value))); list.append(row); });
        return list;
    }
    function website(url) {
        try {
            const u = new URL(url); if (!["https:", "http:"].includes(u.protocol) || u.username || u.password) throw Error();
            const a = el("a", "Open company website (new tab)", "overview-text-link"); a.href = u.href; a.target = "_blank"; a.rel = "noopener noreferrer"; return a;
        } catch { return el("p", "A valid public website link has not been provided.", "overview-source-note"); }
    }
    function funnel(f) {
        const list = el("ul", undefined, "admin-funnel"); list.setAttribute("aria-label", "Applications by current status");
        Object.keys(stageLabels).forEach(k => { const li = el("li"); li.dataset.stage = k; li.append(el("strong", String(f[k])), el("span", stageLabels[k])); list.append(li); });
        return list;
    }
    async function act(action, done) {
        try { await action(); message = done; } catch (error) { message = error.message; }
        render();
    }
    function actions(company) {
        const box = el("section", undefined, "admin-company-actions");
        box.append(el("h3", "Administrator actions"));
        const label = el("label", "Reason or note (required to suspend, restore, flag or clear a flag)"), note = el("textarea");
        note.id = "company-note-" + company.id.replace(/[^a-z0-9-]/gi, "-"); label.htmlFor = note.id; note.maxLength = 500; note.rows = 2; note.dir = "auto";
        const row = el("div", undefined, "overview-top-actions");
        const button = (text, run) => { const b = el("button", text, "button button-outline"); b.type = "button"; b.addEventListener("click", run); row.append(b); return b; };
        const status = company.verification.status;
        if (status !== "Verified" && status !== "Suspended") button("Mark verified", () => act(() => api.setVerification(company.id, "Verified", note.value), `${company.profile.name} is now Verified.`));
        if (status === "Unverified") button("Start review", () => act(() => api.setVerification(company.id, "Under review", note.value), `${company.profile.name} is now Under review.`));
        if (status !== "Suspended") button("Suspend company", () => {
            if (!window.confirm(`Suspend ${company.profile.name}? It will not be able to post opportunities or message candidates.`)) { message = "Suspension cancelled. Nothing changed."; render(); return; }
            act(() => api.setVerification(company.id, "Suspended", note.value, { confirmed: true }), `${company.profile.name} is suspended. Posting and messaging are disabled.`);
        });
        else button("Restore company", () => {
            if (!window.confirm(`Restore ${company.profile.name}? Posting and messaging will be allowed again.`)) { message = "Restore cancelled. Nothing changed."; render(); return; }
            act(() => api.restore(company.id, note.value, { confirmed: true }), `${company.profile.name} was restored.`);
        });
        if (company.flag) button("Clear review flag", () => act(() => api.flag(company.id, note.value, false), "Review flag cleared."));
        else button("Flag for review", () => act(() => api.flag(company.id, note.value, true), "Company flagged for review."));
        box.append(label, note, row);
        return box;
    }
    function opportunityRow(o) {
        const row = el("div", undefined, "overview-list-row"); row.dataset.opportunityId = o.id;
        row.append(el("h4", o.title), el("p", `${o.status || "Status not set"} · ${o.department || "No department"} · ${o.applications.length} application${o.applications.length === 1 ? "" : "s"}`));
        const more = el("details"); more.append(el("summary", "Opportunity details"));
        more.append(dl([["Status", o.status], ["Department", o.department], ["Location", o.location], ["Duration", o.duration], ["Listed compensation", o.compensation], ["Required skills", o.skills.join(", ")], ["Published", day(o.publishedAt)], ["Applications", o.applications.length]]));
        if (o.description) more.append(el("p", o.description));
        more.append(el("h5", "Application funnel"), funnel(o.funnel));
        const people = el("ul", undefined, "admin-candidates");
        if (!o.applications.length) people.append(el("li", "No applications yet."));
        o.applications.forEach(a => people.append(el("li", `${a.applicant} · ${stageLabels[a.stage]} · ${a.messages} message${a.messages === 1 ? "" : "s"} (count only)`)));
        more.append(el("h5", "Candidates"), people);
        row.append(more); return row;
    }
    function card(company) {
        const article = el("article", undefined, "overview-panel admin-company-card"); article.dataset.companyId = company.id;
        const head = el("div", undefined, "admin-company-head");
        head.append(el("p", company.sample ? "SAMPLE COMPANY" : "SAVED COMPANY PROFILE", "eyebrow"));
        const badges = el("div", undefined, "admin-company-badges");
        const v = el("span", company.verification.status, "admin-badge"); v.dataset.verification = company.verification.status; badges.append(v);
        if (company.flag) badges.append(el("span", "Flagged for review", "admin-badge admin-badge-flag"));
        if (company.sample) badges.append(el("span", "SAMPLE", "admin-badge"));
        head.append(el("h2", company.profile.name), badges);
        article.append(head, el("p", `${company.profile.industry || "Industry not provided"} · ${company.profile.location || "Location not provided"} · ${company.opportunities.length} opportunities · ${company.applicationsTotal} applications · last activity ${day(company.lastActivityAt)}`, "overview-source-note"));
        if (company.flag) article.append(el("p", `Review flag: ${company.flag.reason}`, "services-notice"));
        const toggle = el("button", open.has(company.id) ? "Hide details" : "View details", "button button-outline"); toggle.type = "button";
        toggle.setAttribute("aria-expanded", String(open.has(company.id)));
        toggle.addEventListener("click", () => { if (open.has(company.id)) open.delete(company.id); else open.add(company.id); render(); });
        article.append(toggle);
        // Opportunities are always listed so a quick scan shows what each company posted.
        const jobs = el("section"); jobs.append(el("h3", "Posted opportunities"));
        if (!company.opportunities.length) jobs.append(el("p", "This company has no posted opportunities yet."));
        company.opportunities.forEach(o => jobs.append(opportunityRow(o)));
        if (!open.has(company.id)) { article.append(jobs); return article; }
        const profile = el("section"); profile.append(el("h3", "Profile"), dl([["Industry", company.profile.industry], ["Company size", company.profile.size], ["Location", company.profile.location], ["Created", day(company.createdAt)], ["Last activity", stamp(company.lastActivityAt)], ["Source", company.source]]));
        if (company.profile.website) profile.append(website(company.profile.website));
        if (company.profile.description) profile.append(el("p", company.profile.description));
        const contact = el("section"); contact.append(el("h3", "Contact person"), dl([["Name", company.contact.name], ["Email", company.contact.email]]));
        const verification = el("section"); verification.append(el("h3", "Verification"), dl([["Status", company.verification.status], ["Current note", company.verification.notes || "No note"]]));
        const history = el("ol", undefined, "admin-history");
        if (!company.verification.history.length) history.append(el("li", "No verification decisions yet."));
        [...company.verification.history].reverse().forEach(h => history.append(el("li", `${stamp(h.at)} · ${h.from || "—"} → ${h.status}${h.note ? " · " + h.note : ""}`)));
        verification.append(history);
        const activity = el("section"); activity.append(el("h3", "Candidates and activity"), dl([["Applications (all opportunities)", company.applicationsTotal], ["Messages (count only)", company.messagesTotal], ["Published talent profiles viewed", company.talentViews]]), funnel(company.funnel));
        const timeline = el("ol", undefined, "admin-timeline");
        if (!company.timeline.length) timeline.append(el("li", "No recorded events."));
        company.timeline.forEach(e => timeline.append(el("li", `${stamp(e.at)} · ${e.text}`)));
        activity.append(el("h4", "Timeline"), timeline);
        article.append(profile, contact, verification, jobs, activity, actions(company));
        return article;
    }
    function sampleSection() {
        const section = el("section", undefined, "overview-panel"); section.id = "company-sample-data";
        section.append(el("h2", "Sample data"), el("p", "Loads six clearly labelled fictional SAMPLE companies in different verification states, with opportunities and application counts, for demonstrations. Loading twice adds nothing. Removing deletes only sample companies; the company portal record is never changed."));
        const state = api.sampleStatus();
        section.append(el("p", state.loaded ? `Loaded: ${state.companies} sample companies.` : "No sample companies are loaded.", "overview-source-note"));
        const row = el("div", undefined, "overview-top-actions");
        const load = el("button", "Load sample data", "button button-primary"); load.type = "button";
        load.addEventListener("click", () => act(async () => { const n = api.loadSample(); if (!n) throw new Error("Sample companies were already loaded. Nothing was added."); }, "Six sample companies added."));
        const remove = el("button", "Remove sample data", "button button-outline"); remove.type = "button"; remove.disabled = !state.loaded;
        remove.addEventListener("click", () => act(async () => { const n = api.removeSample(); if (!n) throw new Error("No sample companies to remove."); }, "Sample companies removed. Other records were not changed."));
        row.append(load, remove); section.append(row); return section;
    }
    function render() {
        root.replaceChildren();
        try {
            const companies = api.companies(), summary = api.summary(companies);
            root.append(el("p", `${companies.length} compan${companies.length === 1 ? "y" : "ies"} · ${summary.activeOpportunities} active opportunities`, "overview-source-note"));
            const status = el("p", message, "overview-source-note"); status.id = "company-admin-status"; status.setAttribute("role", "status"); status.setAttribute("aria-live", "polite"); root.append(status);
            const stats = el("div", undefined, "overview-stats admin-company-stats");
            [["total", "Total companies", summary.total], ["verified", "Verified", summary.verified], ["active", "Active opportunities", summary.activeOpportunities], ["week", "Applications this week", summary.applicationsThisWeek]].forEach(([id, label, value]) => {
                const box = el("div", undefined, "overview-stat"); box.dataset.stat = id; box.append(el("span", label), el("strong", String(value))); stats.append(box);
            });
            root.append(stats);
            if (!companies.length) {
                const empty = el("section", undefined, "overview-panel");
                empty.append(el("h2", "No company profile saved yet"), el("p", "A company appears here after its profile is saved in this browser. Example data is never added just by opening this page; use Load sample data below for a demonstration."));
                root.append(empty, sampleSection()); return;
            }
            const toolbar = el("div", undefined, "admin-company-search admin-company-toolbar");
            const field = (labelText, control) => { const wrap = el("div"); const l = el("label", labelText); l.htmlFor = control.id; wrap.append(l, control); toolbar.append(wrap); return control; };
            const search = el("input"); search.id = "company-search"; search.type = "search"; search.value = filters.search; field("Find a company by name, industry, location or contact", search);
            const statusSelect = el("select"); statusSelect.id = "company-status";
            ["all", ...api.VERIFICATION].forEach(v => { const o = el("option", v === "all" ? "All statuses" : v); o.value = v; statusSelect.append(o); }); statusSelect.value = filters.status; field("Verification", statusSelect);
            const sort = el("select"); sort.id = "company-sort";
            [["name", "Name A–Z"], ["newest", "Newest"], ["activity", "Last activity"], ["applications", "Most applications"]].forEach(([v, t]) => { const o = el("option", t); o.value = v; sort.append(o); }); sort.value = filters.sort; field("Sort by", sort);
            const flagged = el("input"); flagged.id = "company-flagged"; flagged.type = "checkbox"; flagged.checked = filters.flagged; field("Flagged only", flagged);
            root.append(toolbar);
            const list = el("div", undefined, "admin-company-list"); list.id = "admin-company-list";
            const cards = new Map(companies.map(c => [c.id, card(c)]));
            const none = el("p", "No matching company.", "overview-source-note"); none.hidden = true;
            const apply = () => {
                filters.search = search.value; filters.status = statusSelect.value; filters.sort = sort.value; filters.flagged = flagged.checked;
                const visible = api.filter(companies, filters);
                const ids = new Set(visible.map(c => c.id));
                cards.forEach((node, id) => { node.hidden = !ids.has(id); });
                list.replaceChildren(...visible.map(c => cards.get(c.id)), ...companies.filter(c => !ids.has(c.id)).map(c => cards.get(c.id)));
                none.hidden = visible.length > 0;
            };
            search.addEventListener("input", apply); statusSelect.addEventListener("change", apply); sort.addEventListener("change", apply); flagged.addEventListener("change", apply);
            root.append(list, none); apply();
            root.append(sampleSection());
        } catch (error) { const status = el("p", error.message, "services-notice"); status.setAttribute("role", "status"); root.append(status); }
    }
    render();
    window.addEventListener("storage", event => { if ([null, "codementor-company-store-v1", api.key, "codementor-platform-v1"].includes(event.key)) render(); });
    window.addEventListener("pageshow", render);
})();
