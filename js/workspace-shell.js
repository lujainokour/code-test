/* One shared shell, using the existing sidebar/topbar markup and styles. */
(() => {
    "use strict";
    const appRoot = new URL('../', document.currentScript.src);
    const routes = {"admin-courses.html":"pages/admin/admin-courses.html","index.html":"index.html","placement-question.html":"pages/student/placement-question.html","virtual-internship.html":"pages/student/virtual-internship.html","code-review.html":"pages/student/code-review.html","service-details.html":"pages/services/service-details.html","placement-intro.html":"pages/student/placement-intro.html","peer-mentoring.html":"pages/services/peer-mentoring.html","local-portfolio.html":"pages/student/local-portfolio.html","dashboard.html":"pages/student/dashboard.html","admin-analytics.html":"pages/admin/admin-analytics.html","learning-report.html":"pages/student/learning-report.html","change-password.html":"pages/auth/change-password.html","admin-account-access.html":"pages/admin/admin-account-access.html","placement-results.html":"pages/student/placement-results.html","forgot-password.html":"pages/auth/forgot-password.html","admin-level-content.html":"pages/admin/admin-level-content.html","languages.html":"pages/public/languages.html","course.html":"pages/public/course.html","progress.html":"pages/student/progress.html","mentor.html":"pages/student/mentor.html","learning-path.html":"pages/student/learning-path.html","mentoring-details.html":"pages/services/mentoring-details.html","project-evaluation.html":"pages/student/project-evaluation.html","showcase.html":"pages/services/showcase.html","onboarding.html":"pages/student/onboarding.html","certificates.html":"pages/student/certificates.html","placement-review.html":"pages/student/placement-review.html","service-draft.html":"pages/services/service-draft.html","community.html":"pages/services/community.html","module.html":"pages/student/module.html","login.html":"pages/auth/login.html","admin-dashboard.html":"pages/admin/admin-dashboard.html","signup.html":"pages/auth/signup.html","reset-password.html":"pages/auth/reset-password.html","skill-analysis.html":"pages/student/skill-analysis.html","workspace.html":"pages/student/workspace.html","demo.html":"pages/public/demo.html","student-public-profile.html":"pages/services/student-public-profile.html","practice.html":"pages/student/practice.html","level-assessment.html":"pages/student/level-assessment.html","requests.html":"pages/student/requests.html","subscription.html":"pages/student/subscription.html","admin-students.html":"pages/admin/admin-students.html","admin-course-create.html":"pages/admin/admin-course-create.html","freelance-services.html":"pages/services/freelance-services.html","admin-level-create.html":"pages/admin/admin-level-create.html","admin-course-content.html":"pages/admin/admin-course-content.html","project.html":"pages/student/project.html","admin-student-details.html":"pages/admin/admin-student-details.html","lesson.html":"pages/student/lesson.html","profile.html":"pages/student/profile.html","company-dashboard.html":"pages/company/company-dashboard.html","company-jobs.html":"pages/company/company-jobs.html","company-talent.html":"pages/company/company-talent.html","company-applications.html":"pages/company/company-applications.html","company-messages.html":"pages/company/company-messages.html","company-profile.html":"pages/company/company-profile.html","company-login.html":"pages/auth/company-login.html","company-signup.html":"pages/auth/company-signup.html"};
    Object.assign(routes, {"career.html":"pages/student/career.html", "messages.html":"pages/student/messages.html"});
    Object.assign(routes, {"mentor-studio.html":"pages/student/mentor-studio.html", "admin-peer-mentoring.html":"pages/admin/admin-peer-mentoring.html"});
    routes["admin-community.html"] = "pages/admin/admin-community.html";
    routes["admin-companies.html"] = "pages/admin/admin-companies.html";
const route = value => new URL(routes[value] || value, appRoot).href;
    const filename = location.pathname.split("/").pop() || "index.html";
    const admin = filename.startsWith("admin-") && filename !== "admin-login.html";
    const company = filename.startsWith("company-") && filename !== "company-login.html" && filename !== "company-signup.html";
    const logoPath = "assets/images/Burgundy CMA cherry monogram logo.png";
    const studentLinks = [
        ["dashboard.html", "Dashboard"], ["learning-path.html", "Learning path"], ["practice.html", "Practice tasks"],
        ["workspace.html", "Coding workspace"], ["progress.html", "My progress"], ["project.html", "Projects"],
        ["skill-analysis.html", "Skill analysis"], ["mentor.html", "AI Mentor demo"], ["languages.html", "Language catalogue"],
        ["local-portfolio.html", "My local portfolio"], ["certificates.html", "Certificates"], ["virtual-internship.html", "Virtual Internship"],
        ["community.html", "Student Community"], ["peer-mentoring.html", "Peer Mentoring"],
        ["showcase.html", "Student Showcase"], ["freelance-services.html", "Student services"], ["requests.html", "My local requests"], ["subscription.html", "Plans & subscriptions"]
    ];
    const studentGroups = [
        { title: "YOUR LEARNING", links: [studentLinks[0], studentLinks[1], studentLinks[2], studentLinks[4]] },
        { title: "Help & community", links: [["mentor.html", "AI study assistant"], ["community.html", "Student community"], ["peer-mentoring.html", "Student-led sessions"], ["mentor-studio.html", "Offer a session / My teaching"], ["requests.html", "My bookings & requests"]] },
        { title: "Learning tools", links: [studentLinks[3], studentLinks[6], studentLinks[8], studentLinks[17]] },
        { title: "Projects & achievements", links: [studentLinks[5], studentLinks[9], studentLinks[10], studentLinks[11], studentLinks[14]] },
        { title: "Services & opportunities", links: [studentLinks[15], ["career.html", "Opportunities & training"], ["messages.html", "Company inbox"]] }
    ];
    function navIcon(href) {
        const paths = {
            "dashboard.html": "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z",
            "learning-path.html": "M5 4v16 M5 6h12l-2 3 2 3H5 M3 20h4",
            "practice.html": "m8 5-5 7 5 7 M16 5l5 7-5 7 M14 3l-4 18",
            "workspace.html": "M3 4h18v13H3z M8 21h8 M12 17v4 M6 8l3 3-3 3 M12 14h5",
            "progress.html": "M4 20V10 M10 20V4 M16 20v-7 M22 20H2",
            "project.html": "M3 7h7l2-3h9v16H3z",
            "mentor.html": "M4 4h16v12H9l-5 4z M8 9h8 M8 12h5",
            "company-dashboard.html": "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z",
            "company-jobs.html": "M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16 M12 11v2",
            "company-talent.html": "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2 M9 11a4 4 0 100-8 4 4 0 000 8z M23 21v-2a4 4 0 00-3-3.87 M16 3.13a4 4 0 010 7.75",
            "company-applications.html": "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8",
            "company-messages.html": "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z M8 9h8 M8 13h5",
            "company-profile.html": "M3 21h18 M9 8h1 M9 12h1 M9 16h1 M14 8h1 M14 12h1 M14 16h1 M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16"
        };
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("viewBox", "0 0 24 24"); svg.setAttribute("aria-hidden", "true"); svg.classList.add("shell-nav-icon");
        const path = document.createElementNS(svg.namespaceURI, "path");
        path.setAttribute("d", paths[href] || "M4 5h16v14H4z M8 9h8 M8 13h5"); svg.append(path); return svg;
    }
    Object.assign(routes, {"admin-sessions.html":"pages/admin/admin-sessions.html", "admin-schedule.html":"pages/admin/admin-schedule.html", "admin-bookings.html":"pages/admin/admin-bookings.html", "admin-session-students.html":"pages/admin/admin-session-students.html"});
    const adminLinks = [["admin-dashboard.html", "Dashboard"], ["admin-students.html", "Students"], ["admin-companies.html", "Companies"], ["admin-courses.html", "Learning paths"], ["admin-sessions.html", "Platform sessions"], ["admin-schedule.html", "Availability & pricing"], ["admin-bookings.html", "Platform bookings"], ["admin-session-students.html", "Session follow-up"], ["admin-peer-mentoring.html", "Student tutors & oversight"], ["admin-community.html", "Community requests"], ["admin-analytics.html", "Analytics"]];
    const companyLinks = [
        ["company-dashboard.html", "Dashboard"],
        ["company-jobs.html", "Opportunities & Jobs"],
        ["company-talent.html", "Talent Directory"],
        ["company-applications.html", "Applications"],
        ["company-messages.html", "Messages & Interviews"],
        ["company-profile.html", "Company Profile"]
    ];
    const activeMap = { "lesson.html": "learning-path.html", "module.html": "learning-path.html", "level-assessment.html": "learning-path.html", "learning-report.html": "progress.html", "student-public-profile.html": "showcase.html", "mentoring-details.html": "peer-mentoring.html", "service-details.html": "freelance-services.html", "service-draft.html": "freelance-services.html", "course.html": "languages.html", "admin-course-create.html": "admin-courses.html", "admin-course-content.html": "admin-courses.html", "admin-level-create.html": "admin-courses.html", "admin-level-content.html": "admin-courses.html", "admin-student-details.html": "admin-students.html", "admin-account-access.html": "admin-students.html" };
    function el(tag, text, cls) { const node = document.createElement(tag); if (text) node.textContent = text; if (cls) node.className = cls; return node; }
    function a(text, href, cls) { const node = el("a", text, cls); node.href = route(href); return node; }
    Object.assign(activeMap, { "onboarding.html": "learning-path.html", "placement-intro.html": "learning-path.html", "placement-question.html": "learning-path.html", "placement-results.html": "learning-path.html", "placement-review.html": "learning-path.html", "change-password.html": "profile.html" });
    let account = null, identityError = "";
    function readAccount() {
        try {
            const raw = window.cmStorage.getItem("codementor-demo-session");
            if (raw === null) return null;
            const value = JSON.parse(raw);
            if (!value || value.role !== "student" || value.isDemo !== true || typeof value.name !== "string" || !value.name.trim() || typeof value.email !== "string" || !value.email.trim()) throw new Error("Invalid identity");
            return value;
        } catch { identityError = "Saved demo identity could not be read. No data has been changed."; return null; }
    }
    function readCompanyAccount() {
        try {
            const raw = localStorage.getItem("codementor-company-session");
            return raw ? JSON.parse(raw) : null;
        } catch { return null; }
    }
    account = readAccount();
    const companyAccount = readCompanyAccount();
    const flexiblePage = document.body.classList.contains("services-page") || filename.startsWith("placement-") || filename === "onboarding.html";
    const needsShell = admin || company || document.body.classList.contains("workspace-page") || filename === "workspace.html" || (flexiblePage && account !== null);
    function brand(node) {
        node.href = route("index.html"); node.classList.add("site-brand"); node.setAttribute("aria-label", "CodeMentor AI - Home");
        let img = node.querySelector("img");
        if (!img) { img = document.createElement("img"); node.prepend(img); }
        img.src = route(logoPath); img.alt = "CodeMentor AI cherry logo"; img.width = 44; img.height = 44;
        if (!node.querySelector("span")) {
            [...node.childNodes].filter(child => child.nodeType === Node.TEXT_NODE).forEach(child => child.remove());
            node.append(el("span", "CodeMentor AI"));
        }
    }
    if (needsShell) {
        const layoutStyles = document.createElement("link");
        layoutStyles.rel = "stylesheet";
        layoutStyles.href = new URL("css/workspace-layout.css", appRoot).href;
        document.head.append(layoutStyles);
        window.workspaceShellManaged = true;
        document.body.classList.add("workspace-page", "shell-active");
        if (filename === "dashboard.html") document.body.classList.add("student-dashboard");
        if (admin) document.body.classList.add("admin-page");
        if (company) document.body.classList.add("company-page");
        let sidebar = document.getElementById("workspace-sidebar");
        if (!sidebar) { sidebar = el("aside", "", "workspace-sidebar"); sidebar.id = "workspace-sidebar"; document.body.prepend(sidebar); }
        sidebar.replaceChildren();
        sidebar.append(a("CodeMentor AI", "index.html", "logo"), el("p", admin ? "ADMIN PREVIEW" : company ? "COMPANY WORKSPACE" : account ? "STUDENT WORKSPACE" : "STUDENT DEMO PREVIEW", "sidebar-label"));
        const nav = el("nav", "", "workspace-navigation"); nav.setAttribute("aria-label", admin ? "Admin navigation" : company ? "Company navigation" : "Student navigation");
        const active = activeMap[filename] || filename;
        if (admin) adminLinks.forEach(([href, label]) => { const item = a(label, href); if (active === href) item.setAttribute("aria-current", "page"); nav.append(item); });
        else if (company) companyLinks.forEach(([href, label]) => { const item = a("", href); item.append(navIcon(href), el("span", label)); if (active === href) item.setAttribute("aria-current", "page"); nav.append(item); });
        else studentGroups.forEach((group, index) => {
            const section = el(index ? "details" : "div", "", "shell-nav-group");
            if (index) {
                section.open = group.links.some(([href]) => href === active);
                const summary = el("summary", group.title, "shell-group-toggle"); section.append(summary);
            } else section.append(el("p", group.title, "shell-group-label"));
            const items = el("div", "", "shell-group-links");
            group.links.forEach(([href, label]) => {
                const item = a("", href); item.append(navIcon(href), el("span", label));
                if (active === href) item.setAttribute("aria-current", "page"); items.append(item);
            });
            section.append(items); nav.append(section);
        });
        sidebar.append(nav);
        const bottom = el("div", "", "sidebar-bottom");
        bottom.append(a(admin ? "View website" : company ? "Company Profile" : "Profile settings", admin ? "index.html" : company ? "company-profile.html" : "profile.html"));
        if (!admin && !company && (filename === "profile.html" || filename === "change-password.html")) bottom.firstElementChild.setAttribute("aria-current", "page");
        if (company && filename === "company-profile.html") bottom.firstElementChild.setAttribute("aria-current", "page");
        const exit = el("button", admin ? "Exit admin preview" : company ? "Log out (Company)" : "Log out"); exit.type = "button"; exit.id = admin ? "admin-exit-button" : company ? "company-exit-button" : "logout-button"; bottom.append(exit); sidebar.append(bottom);
        let body = document.querySelector(".workspace-body");
        if (!body) {
            body = el("div", "", "workspace-body");
            const main = document.querySelector("main");
            if (main) {
                const oldHeader = document.querySelector(".services-header"); oldHeader?.remove();
                main.before(body);
                const contextHeader = document.querySelector(".onboarding-header"); if (contextHeader) body.append(contextHeader);
                body.append(main);
                const footer = document.querySelector(".services-footer, .onboarding-footer"); if (footer) body.append(footer);
                if (main.classList.contains("services-main")) { main.classList.remove("container"); main.classList.add("workspace-main"); }
            } else document.body.append(body);
        }
        // Every workspace uses one compact footer, outside the content cards.
        body.querySelectorAll(".workspace-footer, .services-footer, .onboarding-footer").forEach(footer => footer.remove());
        const appFooter = el("footer", "", "workspace-footer workspace-app-footer");
        const footerIdentity = el("div", "", "workspace-footer-identity");
        footerIdentity.append(el("span", `© ${new Date().getFullYear()} CodeMentor AI`, "workspace-footer-name"), el("span", "Your workspace, saved on this device.", "workspace-footer-caption"));
        const footerNav = el("nav"); footerNav.setAttribute("aria-label", "Workspace footer navigation");
        footerNav.append(a("Home", "index.html"), a(company ? "Company profile" : admin ? "Dashboard" : "Community", company ? "company-profile.html" : admin ? "admin-dashboard.html" : "community.html"), a("Contact", "index.html#contact"));
        appFooter.append(footerIdentity, footerNav); body.append(appFooter);
        let topbar = document.querySelector(".workspace-topbar");
        if (!topbar) { topbar = el("header", "", "workspace-topbar"); body.prepend(topbar); }
        topbar.replaceChildren();
        const left = el("div", "", "workspace-topbar-left");
        const toggle = el("button", "\u2630", "workspace-menu-toggle"); toggle.type = "button"; toggle.id = "workspace-menu-toggle"; toggle.setAttribute("aria-label", "Open navigation"); toggle.setAttribute("aria-controls", sidebar.id); toggle.setAttribute("aria-expanded", "false");
        const title = document.title.split("|")[0].trim();
        left.append(toggle, a("CodeMentor AI", "index.html", "logo shell-mobile-brand"), el("span", `${admin ? "Admin preview" : company ? "Company workspace" : "Student workspace"} / ${title}`)); topbar.append(left);
        if (admin) topbar.append(el("span", "Frontend admin preview", "admin-preview-label"));
        else if (company) {
            const pill = a("", "company-profile.html", "account-pill"); const initials = el("span", "CP", "account-initials"); initials.id = "account-initials";
            const name = el("span", companyAccount?.name || "CloudPeak Innovations"); name.id = "account-name";
            if (companyAccount?.name) initials.textContent = companyAccount.name.trim().split(/\s+/).slice(0, 2).map(word => Array.from(word)[0]).join("").toUpperCase();
            pill.append(initials, name); topbar.append(pill);
        } else {
            const pill = a("", "profile.html", "account-pill"); const initials = el("span", "S", "account-initials"); initials.id = "account-initials";
            const name = el("span", account?.name || "Student preview"); name.id = "account-name";
            if (account) initials.textContent = account.name.trim().split(/\s+/).slice(0, 2).map(word => Array.from(word)[0]).join("").toUpperCase(); pill.append(initials, name); topbar.append(pill);
        }
        const shellMessage = el("p", identityError, "form-message shell-message"); shellMessage.id = "shell-message"; shellMessage.setAttribute("role", "status"); topbar.after(shellMessage);
        if (company) {
            const previewNote = el("p", "Local company workspace: sample records and connected student records share this browser. Applications, training reviews and inbox replies stay here; no email or external meeting confirmation is sent.", "services-notice");
            document.querySelector("main")?.prepend(previewNote);
        }
        function close(focus = false) { sidebar.classList.remove("is-open"); toggle.setAttribute("aria-expanded", "false"); toggle.setAttribute("aria-label", "Open navigation"); if (focus) toggle.focus(); }
        toggle.addEventListener("click", () => { const open = sidebar.classList.toggle("is-open"); toggle.setAttribute("aria-expanded", String(open)); toggle.setAttribute("aria-label", open ? "Close navigation" : "Open navigation"); });
        document.addEventListener("keydown", event => { if (event.key === "Escape" && sidebar.classList.contains("is-open")) close(true); });
        document.addEventListener("click", event => { if (!sidebar.contains(event.target) && !toggle.contains(event.target)) close(); });
        sidebar.querySelectorAll("a").forEach(link => link.addEventListener("click", () => close()));
        matchMedia("(min-width: 901px)").addEventListener("change", () => close());
        exit.addEventListener("click", () => {
            if (admin) { sessionStorage.removeItem("codementor-admin-session"); location.href = route("index.html"); return; }
            if (company) {
                try { localStorage.removeItem("codementor-company-session"); } catch { shellMessage.textContent = "Log out failed because browser storage is unavailable. Try again."; return; }
                location.href = route("company-login.html");
                return;
            }
            try { window.cmStorage.removeItem("codementor-demo-session"); location.href = route("login.html"); } catch { shellMessage.textContent = "The demo session could not be cleared. Your records were kept."; }
        });
    } else if (identityError) {
        const main = document.querySelector("main"); if (main) main.prepend(el("p", identityError, "services-notice"));
    }
    if (!needsShell) {
        const nav = document.getElementById("navigation");
        if (nav && document.body.classList.contains("services-page")) {
            const workspace = nav.querySelector('.nav-actions a');
            if (workspace && !account) {
                workspace.href = route(window.cmAccess?.company() ? "company-dashboard.html" : "login.html");
                workspace.textContent = window.cmAccess?.company() ? "Company workspace" : "Sign in";
            }
            if (!account) document.querySelectorAll('.services-footer a').forEach(link => {
                if (new URL(link.href).pathname.endsWith('/student/progress.html')) {
                    link.href = route(window.cmAccess?.company() ? "company-dashboard.html" : "login.html");
                    link.textContent = window.cmAccess?.company() ? "Company workspace" : "Sign in";
                }
            });
        }
        if (nav && document.body.classList.contains("services-page") && ![...nav.querySelectorAll('a')].find(link => new URL(link.href).pathname.split('/').pop() === 'languages.html')) nav.prepend(a("Languages", "languages.html"));
        nav?.querySelectorAll("a").forEach(link => { if (new URL(link.href).pathname.split("/").pop() === (activeMap[filename] || filename)) link.setAttribute("aria-current", "page"); });
    }
    document.querySelectorAll("a.logo, a.brand-logo").forEach(brand);
    if (needsShell && !admin && !company && account) {
        const journey = document.createElement("script");
        journey.src = new URL("js/student-journey.js", appRoot).href;
        document.head.append(journey);
    }
    if (needsShell) {
        const guideScript = document.createElement("script");
        guideScript.src = new URL("js/user-guide.js", appRoot).href;
        guideScript.dataset.role = admin ? "admin" : "student";
        guideScript.dataset.owner = admin ? "admin-preview" : account?.email || "guest";
        guideScript.dataset.autostart = String(admin || Boolean(account));
        const guideStyles = document.createElement("link");
        guideStyles.rel = "stylesheet";
        guideStyles.href = new URL("css/user-guide.css", appRoot).href;
        guideStyles.addEventListener("load", () => document.head.append(guideScript), { once: true });
        document.head.append(guideStyles);
    }
    window.addEventListener("pageshow", event => {

        if (event.persisted && !admin && (flexiblePage || needsShell)) {
            const current = readAccount();
            if (current?.email !== account?.email || current?.name !== account?.name) location.reload();
        }
    });
})();

