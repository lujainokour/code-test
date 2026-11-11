/* Demo tour: shown only when all three SAMPLE data sets are loaded. Reads status only; never seeds. */
(() => {
    "use strict";
    const root = document.getElementById("tour-content"), status = document.getElementById("tour-status");
    if (!root) return;
    const el = (tag, text, cls) => { const n = document.createElement(tag); if (text !== undefined) n.textContent = text; if (cls) n.className = cls; return n; };
    const link = (text, href, cls = "overview-text-link") => { const a = el("a", text, cls); a.href = href; return a; };
    const sets = [
        { id: "community", label: "Community sample posts", page: "admin-community.html#sample-section", loaded: () => window.communityStore.sampleStatus().loaded },
        { id: "peer", label: "Peer-teaching sample applications and sessions", page: "admin-peer-mentoring.html", loaded: () => window.peerMentoringStore.sampleStatus().loaded },
        { id: "companies", label: "Sample companies", page: "admin-companies.html", loaded: () => window.companyStore.admin.sampleStatus().loaded }
    ];
    const steps = [
        { title: "1 · Student", items: [
            ["Open the student sign-in in a new tab and use the sample account details shown there.", "../auth/login.html"],
            ["On the dashboard, show Continue where you left off, This week and Achievements. Numbers come from the saved progress of that account only.", "../student/dashboard.html"],
            ["Open a coding task and use the mentor quick actions (prepared replies, no live AI).", "../student/workspace.html"]] },
        { title: "2 · Community", items: [
            ["As the student, request to join Python or Help with a short reason.", "../services/community.html"],
            ["As admin, approve the request; the student's tab updates and shows SAMPLE posts with code blocks, solved marks and replies.", "admin-community.html"],
            ["Report a post as the student, then hide/restore it here with a reason and show the audit log.", "admin-community.html#review-section"]] },
        { title: "3 · Peer teaching", items: [
            ["As the student, open My teaching sessions: the SAMPLE application is Pending with next steps.", "../student/mentor-studio.html"],
            ["As admin, approve or reject it with a note; the student's page updates immediately.", "admin-peer-mentoring.html"],
            ["Show the published SAMPLE session with its confirmed booking and completed review (sample sessions cannot be booked).", "../services/peer-mentoring.html"]] },
        { title: "4 · Company administration", items: [
            ["Show summary cards, filters and the six SAMPLE companies in different verification states.", "admin-companies.html"],
            ["Open a company's details: funnel, candidates (message counts only), timeline. Suspend or restore with a reason.", "admin-companies.html"]] }
    ];
    function render() {
        root.replaceChildren();
        let states;
        try { states = sets.map(set => ({ ...set, ok: set.loaded() })); }
        catch (error) { status.textContent = error.message; return; }
        const missing = states.filter(s => !s.ok);
        if (missing.length) {
            status.textContent = "The tour opens once all sample data sets are loaded.";
            const panel = el("section", undefined, "overview-panel"); panel.append(el("h2", "Load sample data first"));
            const list = el("ul");
            states.forEach(s => { const li = el("li"); li.append(el("span", `${s.ok ? "Loaded" : "Not loaded"} · ${s.label} · `)); if (!s.ok) li.append(link("Open the page to load it", s.page)); list.append(li); });
            panel.append(list); root.append(panel); return;
        }
        status.textContent = "All sample data is loaded. Follow the steps in order.";
        steps.forEach(step => {
            const panel = el("section", undefined, "overview-panel"); panel.append(el("h2", step.title));
            const list = el("ol");
            step.items.forEach(([text, href]) => { const li = el("li"); li.append(el("span", text + " "), link("Open", href)); list.append(li); });
            panel.append(list); root.append(panel);
        });
        root.append(el("p", "When the presentation is over, remove the sample data from the community, peer-teaching and companies admin pages.", "overview-source-note"));
    }
    render();
    window.addEventListener("storage", render);
    window.addEventListener("pageshow", render);
})();
