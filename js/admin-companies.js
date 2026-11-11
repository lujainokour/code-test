(() => {
    "use strict";
    const root = document.getElementById("admin-companies-content"); if (!root) return;
    const el = (tag, text, cls) => { const n = document.createElement(tag); if (text !== undefined) n.textContent = text; if (cls) n.className = cls; return n; };
    function render() {
        root.replaceChildren();
        try {
            const company = window.companyStore.getAdminSnapshot();
            const count = el("p", company ? `1 saved company workspace · ${company.opportunities.filter(job => job.status === "Active").length} active opportunities` : "0 saved company workspaces", "overview-source-note"); root.append(count);
            if (!company) { const empty = el("section", undefined, "overview-panel"); empty.append(el("h2", "No company profile saved yet"), el("p", "A company will appear here after its profile is saved in this browser. Example data is not added just by opening this page.")); root.append(empty); return; }
            const field = el("div", undefined, "admin-company-search"); const label = el("label", "Find a company by name, email or industry"); label.htmlFor = "company-search"; const input = el("input"); input.id = "company-search"; input.type = "search"; field.append(label, input); root.append(field);
            const card = el("article", undefined, "overview-panel admin-company-card"); const p = company.profile;
            card.append(el("p", company.sample ? "SAMPLE COMPANY" : "SAVED COMPANY PROFILE", "eyebrow"), el("h2", p.name), el("p", p.industry || "Industry not provided"));
            const details = el("dl", undefined, "admin-company-details");
            [["Contact email", p.email], ["Phone", p.phone], ["Location", p.location], ["Company size", p.size]].forEach(([title, text]) => { const row = el("div"); row.append(el("dt", title), el("dd", text || "Not provided")); details.append(row); }); card.append(details);
            if (p.website) { try { const url = new URL(p.website); if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) throw Error(); const a = el("a", "Open company website (new tab)", "overview-text-link"); a.href = url.href; a.target = "_blank"; a.rel = "noopener noreferrer"; card.append(a); } catch { card.append(el("p", "A valid public website link has not been provided.")); } }
            if (p.about) card.append(el("p", p.about));
            const counts = el("p", `${company.opportunities.length} listed opportunities · ${company.connectedApplications} applications from connected student profiles`, "overview-source-note"); card.append(counts);
            const jobs = el("section"); jobs.append(el("h3", "Posted opportunities"));
            if (!company.opportunities.length) jobs.append(el("p", "This company has no posted opportunities yet."));
            company.opportunities.forEach(job => {
                const row = el("div", undefined, "overview-list-row");
                row.append(el("h4", job.title), el("p", `${job.type} · ${job.status}`));
                const more = el("details"), summary = el("summary", "Opportunity details"); more.append(summary);
                const fields = el("dl", undefined, "admin-company-details");
                [["Department", job.department], ["Location", job.location], ["Duration", job.duration], ["Listed compensation", job.stipend], ["Required skills", job.skillsRequired.join(", ")], ["Connected student applications", String(job.connectedApplications)]].forEach(([title, value]) => {
                    const field = el("div"); field.append(el("dt", title), el("dd", value || "Not provided")); fields.append(field);
                });
                more.append(fields);
                if (job.description) more.append(el("p", job.description));
                if (job.postedAt && Number.isFinite(Date.parse(job.postedAt))) more.append(el("p", "Posted: " + new Date(job.postedAt).toLocaleDateString("en-GB")));
                row.append(more); jobs.append(row);
            }); card.append(jobs); root.append(card);
            const noMatches = el("p", "No matching company.", "overview-source-note"); noMatches.hidden = true; root.append(noMatches);
            input.addEventListener("input", () => { card.hidden = ![p.name, p.email, p.industry].join(" ").toLowerCase().includes(input.value.trim().toLowerCase()); noMatches.hidden = !card.hidden; });
        } catch (error) { const status = el("p", error.message, "services-notice"); status.setAttribute("role", "status"); root.append(status); }
    }
    render(); window.addEventListener("storage", render); window.addEventListener("pageshow", render);
})();
