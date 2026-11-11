/**
 * CodeMentor AI - Company / Employer Workspace Controller
 * Controls interactivity, SVG icons, and polished card layouts across all company views.
 */
(() => {
    "use strict";

    const store = window.companyStore;
    if (!store) return;


    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
    }
    function safeMeetingURL(value) {
        try { const url = new URL(value); return url.protocol === "https:" ? url.href : ""; } catch { return ""; }
    }
    const handlers = new WeakMap();
    function listen(node, type, action) {
        const previous = handlers.get(node) || {};
        if (previous[type]) node.removeEventListener(type, previous[type]);
        const handler = event => {
            try {
                if (type === "submit" && !node.reportValidity()) { event.preventDefault(); return; }
                action(event);
            } catch (error) {
                event.preventDefault();
                let status = document.getElementById("workspace-action-error");
                if (!status) { status = document.createElement("p"); status.id = "workspace-action-error"; status.className = "form-message is-error"; status.setAttribute("role", "alert"); (node.closest?.("dialog") || document.querySelector("main") || document.body).prepend(status); }
                status.textContent = error.message || "This action could not be completed. Your saved records were kept.";
                status.tabIndex = -1; status.focus();
            }
        };
        previous[type] = handler; handlers.set(node, previous);
        node.addEventListener(type, handler);
    }

    // --- Feather / Lucide Standard 24x24 SVG Icons ---
    const ICONS = {
        briefcase: (cls = "company-icon") => `<svg class="${cls}" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>`,
        graduationCap: (cls = "company-icon") => `<svg class="${cls}" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 10v6M2 10l10-5 10 5-10 5z"></path><path d="M6 12v5c3 3 9 3 12 0v-5"></path></svg>`,
        target: (cls = "company-icon") => `<svg class="${cls}" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg>`,
        award: (cls = "company-icon") => `<svg class="${cls}" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="7"></circle><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline></svg>`,
        calendar: (cls = "company-icon") => `<svg class="${cls}" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>`,
        video: (cls = "company-icon") => `<svg class="${cls}" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>`,
        clock: (cls = "company-icon") => `<svg class="${cls}" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`,
        code: (cls = "company-icon") => `<svg class="${cls}" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>`,
        folder: (cls = "company-icon") => `<svg class="${cls}" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>`,
        mapPin: (cls = "company-icon") => `<svg class="${cls}" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>`,
        coins: (cls = "company-icon") => `<svg class="${cls}" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="M14.8 9A2 2 0 0 0 13 8h-2a2 2 0 0 0 0 4h2a2 2 0 0 1 0 4h-2a2 2 0 0 1-1.8-1"></path><path d="M12 6v2m0 8v2"></path></svg>`,
        users: (cls = "company-icon") => `<svg class="${cls}" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>`,
        mail: (cls = "company-icon") => `<svg class="${cls}" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>`,
        messageSquare: (cls = "company-icon") => `<svg class="${cls}" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>`,
        checkCircle: (cls = "company-icon") => `<svg class="${cls}" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`,
        xCircle: (cls = "company-icon") => `<svg class="${cls}" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`,
        trash: (cls = "company-icon") => `<svg class="${cls}" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`,
        send: (cls = "company-icon") => `<svg class="${cls}" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>`,
        externalLink: (cls = "company-icon") => `<svg class="${cls}" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>`,
        arrowRight: (cls = "company-icon") => `<svg class="${cls}" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>`,
        quote: (cls = "company-icon") => `<svg class="${cls}" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" opacity="0.6" aria-hidden="true"><path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z"></path></svg>`,
        search: (cls = "company-icon") => `<svg class="${cls}" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>`,
        pause: (cls = "company-icon") => `<svg class="${cls}" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>`,
        play: (cls = "company-icon") => `<svg class="${cls}" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`,
        check: (cls = "company-icon") => `<svg class="${cls}" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"></polyline></svg>`
    };

    function el(tag, text, cls) {
        const node = document.createElement(tag);
        if (text !== undefined && text !== null) node.textContent = text;
        if (cls) node.className = cls;
        return node;
    }

    function formatDate(dateStr) {
        try {
            const d = new Date(dateStr);
            return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
        } catch {
            return dateStr;
        }
    }

    // --- 1. Dashboard View ---
    function initDashboard() {
        const statsRoot = document.getElementById("company-stat-grid");
        const activeJobsRoot = document.getElementById("company-active-jobs");
        const recentAppsRoot = document.getElementById("company-recent-apps");
        const talentPreviewRoot = document.getElementById("company-talent-preview");
        const greetingEl = document.getElementById("company-greeting");

        const profile = store.getProfile();
        const opps = store.getOpportunities();
        const apps = store.getApplications();
        const talent = store.getTalentPool();

        if (greetingEl) {
            greetingEl.textContent = `Welcome back, ${profile.name}`;
        }

        const underReview = apps.filter(a => a.status === "Under Review");
        const interviews = apps.filter(a => a.status === "Interview Scheduled");
        const accepted = apps.filter(a => a.status === "Accepted");

        if (statsRoot) {
            statsRoot.innerHTML = `
                <article class="company-stat-card">
                    <div class="company-stat-top">
                        <h3 class="company-stat-title">Active Postings</h3>
                        <span class="company-stat-icon-badge">${ICONS.briefcase()}</span>
                    </div>
                    <p class="company-stat-num">${escapeHTML(opps.filter(opp => opp.status === 'Active').length)}</p>
                    <p class="company-stat-footnote">Internships & live projects</p>
                </article>
                <article class="company-stat-card">
                    <div class="company-stat-top">
                        <h3 class="company-stat-title">Total Applicants</h3>
                        <span class="company-stat-icon-badge">${ICONS.users()}</span>
                    </div>
                    <p class="company-stat-num">${escapeHTML(apps.length)}</p>
                    <p class="company-stat-footnote">Sample applications in this workspace</p>
                </article>
                <article class="company-stat-card">
                    <div class="company-stat-top">
                        <h3 class="company-stat-title">Pending Review</h3>
                        <span class="company-stat-icon-badge">${ICONS.clock()}</span>
                    </div>
                    <p class="company-stat-num" style="${escapeHTML(underReview.length > 0 ? 'color: #9c2738;' : '')}">
                        ${escapeHTML(underReview.length)}
                    </p>
                    <p class="company-stat-footnote">Awaiting engineering evaluation</p>
                </article>
                <article class="company-stat-card">
                    <div class="company-stat-top">
                        <h3 class="company-stat-title">Interviews & Hired</h3>
                        <span class="company-stat-icon-badge">${ICONS.award()}</span>
                    </div>
                    <p class="company-stat-num">${escapeHTML(interviews.length + accepted.length)}</p>
                    <p class="company-stat-footnote">Candidates advanced to stage</p>
                </article>
            `;
        }

        // Active opportunities list in Dashboard
        if (activeJobsRoot) {
            activeJobsRoot.innerHTML = "";
            opps.filter(opp => opp.status === "Active").slice(0, 3).forEach(opp => {
                const card = el("article", null, "company-job-card");
                card.innerHTML = `
                    <div>
                        <div class="job-card-top-strip">
                            <span class="job-type-pill">${ICONS.briefcase()} ${escapeHTML(opp.type)}</span>
                            <span class="job-applicants-badge">${ICONS.users()} ${escapeHTML(opp.applicantsCount)} Applicants</span>
                        </div>
                        <h3 class="company-job-title" style="margin-top: 8px;">${escapeHTML(opp.title)}</h3>
                        <div class="job-meta-grid">
                            <span class="company-meta-item">${ICONS.mapPin()} ${escapeHTML(opp.location)}</span>
                            <span class="company-meta-item">${ICONS.coins()} ${escapeHTML(opp.stipend)}</span>
                            <span class="company-meta-item">${ICONS.clock()} ${escapeHTML(opp.duration)}</span>
                        </div>
                        <p class="company-job-desc">${escapeHTML(opp.description)}</p>
                    </div>
                    <div class="company-job-footer">
                        <span class="dashboard-footnote" style="display: flex; align-items: center; gap: 5px;">
                            ${ICONS.calendar()} Posted on ${escapeHTML(formatDate(opp.postedAt))}
                        </span>
                        <a href="company-applications.html?oppId=${escapeHTML(encodeURIComponent(opp.id))}" class="button button-outline" style="font-size: 12.5px; padding: 6px 14px; display: inline-flex; align-items: center; gap: 5px;">
                            Review applications ${ICONS.arrowRight()}
                        </a>
                    </div>
                `;
                activeJobsRoot.appendChild(card);
            });
        }

        // Recent student applications in Dashboard
        if (recentAppsRoot) {
            recentAppsRoot.innerHTML = "";
            apps.slice(0, 4).forEach(app => {
                const row = el("div", null, "company-app-row");
                const badgeIcon = app.status === "Accepted" ? ICONS.checkCircle() : app.status === "Interview Scheduled" ? ICONS.video() : ICONS.clock();
                const badgeStyle = app.status === "Accepted" ? "background: #e8f8ee; color: #13572e; border: 1px solid #b7e8cb;" : app.status === "Interview Scheduled" ? "background: #fdf5e6; color: #8c5b08; border: 1px solid #fae2ad;" : "background: #eef4f8; color: #2b5569; border: 1px solid #c9dbe4;";

                row.innerHTML = `
                    <div class="company-app-info" style="flex: 1; align-items: center;">
                        <span class="talent-avatar" style="width: 42px; height: 42px; font-size: 14px;">${escapeHTML(app.studentInitials)}</span>
                        <div>
                            <strong style="font-size: 15px; color: var(--primary);">${escapeHTML(app.studentName)}</strong>
                            <p class="company-app-subtitle" style="display: flex; align-items: center; gap: 5px;">
                                ${ICONS.briefcase()} ${escapeHTML(app.opportunityTitle)}
                            </p>
                            <span style="display: inline-flex; align-items: center; gap: 5px; padding: 3px 8px; font-size: 11.5px; font-weight: 600; border-radius: 4px; margin-top: 4px; ${escapeHTML(badgeStyle)}">
                                ${badgeIcon} ${escapeHTML(app.status)}
                            </span>
                        </div>
                    </div>
                    <div class="company-app-actions">
                        <a href="company-applications.html#app-${escapeHTML(app.id)}" class="button button-outline" style="font-size: 12px; padding: 6px 12px; display: inline-flex; align-items: center; gap: 5px;">
                            Review ${ICONS.arrowRight()}
                        </a>
                    </div>
                `;
                recentAppsRoot.appendChild(row);
            });
        }

        // Talent pool spotlight in Dashboard
        if (talentPreviewRoot) {
            talentPreviewRoot.innerHTML = "";
            talent.slice(0, 3).forEach(student => {
                const card = el("div", null, "company-talent-mini-card");
                card.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 10px;">
                        <span class="talent-avatar" style="width: 40px; height: 40px; font-size: 14px;">${escapeHTML(student.initials)}</span>
                        <div style="flex: 1; min-width: 0;">
                            <strong style="font-size: 15px; color: var(--primary); display: block;">${escapeHTML(student.name)}</strong>
                            <p style="margin: 0; font-size: 12px; color: var(--muted); display: flex; align-items: center; gap: 4px;">
                                ${ICONS.graduationCap()} ${escapeHTML(student.major)}
                            </p>
                        </div>
                    </div>
                    <div style="margin-bottom: 8px;">
                        <span class="talent-target-pill" style="font-size: 11px; padding: 3px 8px;">
                            ${ICONS.target()} ${escapeHTML(student.preferredRole)}
                        </span>
                    </div>
                    <div class="company-skill-tags" style="margin-bottom: 8px;">
                        ${student.topSkills.slice(0, 3).map(s => `<span class="company-skill-tag" style="font-size: 11px; padding: 2px 8px;">${escapeHTML(s)}</span>`).join("")}
                    </div>
                    <div style="margin-top: 10px; display: flex; justify-content: flex-end;">
                        <a href="company-talent.html" class="dashboard-text-link" style="font-size: 12.5px; display: inline-flex; align-items: center; gap: 4px;">
                            View full profile ${ICONS.arrowRight()}
                        </a>
                    </div>
                `;
                talentPreviewRoot.appendChild(card);
            });
        }
    }

    // --- 2. Postings & Opportunities Management View ---
    function initJobs() {
        const root = document.getElementById("company-jobs-list");
        const modal = document.getElementById("post-job-modal");
        const openBtn = document.getElementById("open-post-modal");
        const closeBtn = document.getElementById("close-post-modal");
        const form = document.getElementById("post-job-form");
        const filterBtns = document.querySelectorAll("[data-job-filter]");

        let currentFilter = "all";

        function render() {
            if (!root) return;
            const opps = store.getOpportunities();
            const filtered = currentFilter === "all" ? opps : opps.filter(o => o.type.toLowerCase().includes(currentFilter.toLowerCase()));

            root.innerHTML = "";

            if (filtered.length === 0) {
                root.innerHTML = `<p class="workspace-empty">No ${escapeHTML(currentFilter === 'all' ? '' : currentFilter)} postings found. Click "+ Post Opportunity" to publish an opening.</p>`;
                return;
            }

            filtered.forEach(opp => {
                const card = el("article", null, "company-job-card");
                card.innerHTML = `
                    <div>
                        <div class="job-card-top-strip">
                            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                                <span class="job-type-pill">${ICONS.briefcase()} ${escapeHTML(opp.type)}</span>
                                <span class="job-dept-pill">${escapeHTML(opp.department)}</span>
                                <span class="teacher-badge ${escapeHTML(opp.status === 'Active' ? 'badge-confirmed' : 'badge-tag')}">${escapeHTML(opp.status)}</span>
                            </div>
                            <span class="job-applicants-badge">${ICONS.users()} ${escapeHTML(opp.applicantsCount)} Applicants</span>
                        </div>

                        <h2 class="company-job-title" style="margin-top: 8px;">${escapeHTML(opp.title)}</h2>

                        <div class="job-meta-grid">
                            <span class="company-meta-item">${ICONS.mapPin()} <strong>Location:</strong> ${escapeHTML(opp.location)}</span>
                            <span class="company-meta-item">${ICONS.clock()} <strong>Duration:</strong> ${escapeHTML(opp.duration)}</span>
                            <span class="company-meta-item">${ICONS.coins()} <strong>Stipend:</strong> ${escapeHTML(opp.stipend)}</span>
                        </div>

                        <p class="company-job-desc">${escapeHTML(opp.description)}</p>

                        <div style="margin: 14px 0;">
                            <div class="talent-section-label">
                                ${ICONS.code()}
                                <span>Required Coding Skills</span>
                            </div>
                            <div class="company-skill-tags" style="margin-top: 6px; margin-bottom: 0;">
                                ${opp.skillsRequired.map(s => `<span class="company-skill-tag">${escapeHTML(s)}</span>`).join("")}
                            </div>
                        </div>
                    </div>

                    <div class="teacher-card-actions" style="justify-content: space-between; margin-top: 18px; padding-top: 16px; border-top: 1px solid var(--line-color);">
                        <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                            <a href="company-applications.html?oppId=${escapeHTML(encodeURIComponent(opp.id))}" class="button button-primary" style="display: inline-flex; align-items: center; gap: 6px;">
                                ${ICONS.users()} View Candidates (${escapeHTML(opp.applicantsCount)})
                            </a>
                            <button type="button" class="button button-outline btn-toggle-opp" data-id="${escapeHTML(opp.id)}" style="display: inline-flex; align-items: center; gap: 6px;">
                                ${opp.status === 'Active' ? `${ICONS.pause()} Pause Posting` : `${ICONS.play()} Activate`}
                            </button>
                        </div>
                        <button type="button" class="button button-outline btn-delete-opp" data-id="${escapeHTML(opp.id)}" style="color: #9c2738; border-color: #9c2738; display: inline-flex; align-items: center; gap: 6px;">
                            ${ICONS.trash()} Remove
                        </button>
                    </div>
                `;
                root.appendChild(card);
            });
        }

        render();

        filterBtns.forEach(btn => {
            listen(btn, "click", () => {
                filterBtns.forEach(b => b.classList.remove("active"));
                btn.classList.add("active");
                currentFilter = btn.dataset.jobFilter;
                render();
            });
        });

        if (openBtn && modal) {
            listen(openBtn, "click", () => modal.showModal());
        }
        if (closeBtn && modal) {
            listen(closeBtn, "click", () => modal.close());
        }

        if (form && modal) {
            listen(form, "submit", (e) => {
                e.preventDefault();
                const title = document.getElementById("job-title").value;
                const type = document.getElementById("job-type").value;
                const department = document.getElementById("job-dept").value;
                const location = document.getElementById("job-loc").value;
                const duration = document.getElementById("job-duration").value;
                const stipend = document.getElementById("job-stipend").value;
                const skillsRaw = document.getElementById("job-skills").value;
                const description = document.getElementById("job-desc").value;

                const skills = skillsRaw.split(",").map(s => s.trim()).filter(Boolean);

                try {
                    store.addOpportunity({
                        title, type, department, location, duration, stipend,
                        skillsRequired: skills.length > 0 ? skills : ["Python", "SQL"],
                        description
                    });
                } catch (error) { alert(error.message); return; }

                form.reset();
                modal.close();
                render();
            });
        }

        if (root) {
            listen(root, "click", (e) => {
                const deleteBtn = e.target.closest(".btn-delete-opp");
                if (deleteBtn) {
                    const id = deleteBtn.dataset.id;
                    if (confirm("Remove this opportunity posting?")) {
                        store.deleteOpportunity(id);
                        render();
                    }
                    return;
                }

                const toggleBtn = e.target.closest(".btn-toggle-opp");
                if (toggleBtn) {
                    const id = toggleBtn.dataset.id;
                    const opp = store.getOpportunities().find(o => o.id === id);
                    if (opp) {
                        const newStatus = opp.status === "Active" ? "Paused" : "Active";
                        try { store.updateOpportunity(id, { status: newStatus }); } catch (error) { alert(error.message); return; }
                        render();
                    }
                }
            });
        }
    }

    // --- 3. Talent Directory View ---
    function initTalent() {
        const root = document.getElementById("company-talent-list");
        const searchInput = document.getElementById("talent-search");
        const skillSelect = document.getElementById("talent-skill-filter");
        const inviteModal = document.getElementById("invite-talent-modal");
        const closeInviteBtn = document.getElementById("close-invite-modal");
        const inviteForm = document.getElementById("invite-talent-form");
        const inviteStudentName = document.getElementById("invite-student-name");

        let activeStudent = null;

        function render() {
            if (!root) return;
            const talent = store.getTalentPool();
            const query = (searchInput ? searchInput.value : "").trim().toLowerCase();
            const skillFilter = skillSelect ? skillSelect.value : "all";

            const filtered = talent.filter(student => {
                const matchQuery = !query || student.name.toLowerCase().includes(query) || student.major.toLowerCase().includes(query) || student.topSkills.some(s => s.toLowerCase().includes(query));
                const matchSkill = skillFilter === "all" || student.topSkills.some(s => s.toLowerCase().includes(skillFilter.toLowerCase()));
                return matchQuery && matchSkill;
            });

            root.innerHTML = "";

            if (filtered.length === 0) {
                root.innerHTML = `<p class="workspace-empty">No students found matching your criteria. Try adjusting your search query or skill filter.</p>`;
                return;
            }

            filtered.forEach(student => {
                const card = el("article", null, "company-talent-card");
                card.innerHTML = `
                    <div>
                        <!-- Profile Header -->
                        <div class="talent-card-header">
                            <div class="talent-profile-intro">
                                <span class="talent-avatar">${escapeHTML(student.initials)}</span>
                                <div class="talent-identity">
                                    <h2 class="company-talent-name">${escapeHTML(student.name)}</h2>
                                    <p class="talent-education">
                                        ${ICONS.graduationCap()}
                                        <strong>${escapeHTML(student.major)}</strong> · ${escapeHTML(student.university)} (Class of ${escapeHTML(student.graduationYear)})
                                    </p>
                                </div>
                            </div>

                            <!-- Dedicated Badges Strip: Never overflows or distorts into eggs -->
                            <div class="talent-meta-strip">
                                <span class="talent-target-pill">
                                    ${ICONS.target()}
                                    Target: ${escapeHTML(student.preferredRole)}
                                </span>
                                <span class="talent-status-pill">
                                    <span class="talent-status-dot" aria-hidden="true"></span>
                                    ${escapeHTML(student.availability)}
                                </span>
                                <span class="talent-gpa-pill">
                                    ${ICONS.award()}
                                    GPA: <strong>${escapeHTML(student.gpa)}</strong>
                                </span>
                            </div>
                        </div>

                        <!-- Candidate Bio -->
                        <p class="company-talent-bio">${escapeHTML(student.bio)}</p>

                        <!-- Verified Skills Section -->
                        <div style="margin: 14px 0;">
                            <div class="talent-section-label">
                                ${ICONS.code()}
                                <span>${escapeHTML(student.localPublished ? 'Student-reported skills' : 'Sample coding skills')}</span>
                            </div>
                            <div class="company-skill-tags" style="margin-bottom: 0;">
                                ${student.topSkills.map(s => `<span class="company-skill-tag">${escapeHTML(s)}</span>`).join("")}
                            </div>
                        </div>

                        <!-- Portfolio Projects Section -->
                        <div style="margin: 14px 0;">
                            <div class="talent-section-label">
                                ${ICONS.folder()}
                                <span>Portfolio Projects & Evidence</span>
                            </div>
                            <div class="talent-projects-list">
                                ${student.portfolioProjects.map(p => `
                                    <div class="talent-project-item">
                                        <div class="talent-project-header">
                                            ${ICONS.check()}
                                            <span>${escapeHTML(p)}</span>
                                        </div>
                                    </div>
                                `).join("")}
                            </div>
                        </div>
                    </div>

                    <!-- Action Buttons Bar -->
                    <div class="talent-card-actions">
                        <button type="button" class="button button-primary btn-invite-talent" data-name="${escapeHTML(student.name)}" data-contact="${escapeHTML(student.contactRef || student.email)}">
                            ${ICONS.mail()} Contact & Invite for Interview
                        </button>
                        <a href="company-messages.html?${student.localPublished ? 'candidate' : 'student'}=${escapeHTML(encodeURIComponent(student.contactRef || student.email))}" class="button button-outline">
                            ${ICONS.messageSquare()} Candidate Chat
                        </a>
                    </div>
                `;
                if (student.localPublished) { const profileLink = el("a", "View published projects", "button button-outline"); profileLink.href = "../services/student-public-profile.html?id=" + encodeURIComponent(student.id); profileLink.addEventListener("click", () => { try { store.recordTalentView(); } catch { /* Counting a view never blocks opening the profile. */ } }); card.append(profileLink); }
                root.appendChild(card);
            });
        }

        render();

        if (searchInput) listen(searchInput, "input", render);
        if (skillSelect) listen(skillSelect, "change", render);

        if (root) {
            listen(root, "click", (e) => {
                const inviteBtn = e.target.closest(".btn-invite-talent");
                if (inviteBtn && inviteModal) {
                    activeStudent = {
                        name: inviteBtn.dataset.name,
                        email: inviteBtn.dataset.contact
                    };
                    if (inviteStudentName) inviteStudentName.textContent = activeStudent.name;
                    inviteModal.showModal();
                }
            });
        }

        if (closeInviteBtn && inviteModal) {
            listen(closeInviteBtn, "click", () => inviteModal.close());
        }

        if (inviteForm && inviteModal) {
            listen(inviteForm, "submit", (e) => {
                e.preventDefault();
                const msg = document.getElementById("invite-message-text").value;
                if (activeStudent && msg.trim()) {
                    try { store.sendMessage(activeStudent.email, activeStudent.name, msg.trim()); } catch (error) { alert(error.message); return; }
                    inviteForm.reset();
                    inviteModal.close();
                    alert(`Message saved locally for ${activeStudent.name}. Continue the preview conversation in Messages; no notification was sent.`);
                }
            });
        }
    }

    // --- 4. Applications Management View ---
    function initApplications() {
        const root = document.getElementById("company-apps-list");
        const filterBtns = document.querySelectorAll("[data-app-filter]");
        const interviewModal = document.getElementById("schedule-interview-modal");
        const closeInterviewBtn = document.getElementById("close-interview-modal");
        const interviewForm = document.getElementById("schedule-interview-form");
        const targetCandidateName = document.getElementById("interview-candidate-name");

        let activeAppId = null;
        let activeAppCandidate = null;
        let currentFilter = "all";

        function render() {
            if (!root) return;
            const apps = store.getApplications();
            const filtered = currentFilter === "all" ? apps : apps.filter(a => a.status.toLowerCase().replace(/\s+/g, "-") === currentFilter);

            root.innerHTML = "";

            if (filtered.length === 0) {
                root.innerHTML = `<p class="workspace-empty">No ${escapeHTML(currentFilter === 'all' ? '' : currentFilter)} candidate applications found.</p>`;
                return;
            }

            filtered.forEach(app => {
                const card = el("article", null, "company-app-card");
                card.id = `app-${app.id}`;
                const badgeIcon = app.status === "Accepted" ? ICONS.checkCircle() : app.status === "Interview Scheduled" ? ICONS.video() : app.status === "Under Review" ? ICONS.clock() : ICONS.xCircle();
                const badgeClass = app.status === "Accepted" ? "badge-confirmed" : app.status === "Interview Scheduled" ? "badge-active" : app.status === "Under Review" ? "badge-pending" : "badge-tag";

                card.innerHTML = `
                    <div class="app-card-top">
                        <div class="app-candidate-group">
                            <span class="talent-avatar" style="width: 48px; height: 48px; font-size: 16px;">${escapeHTML(app.studentInitials)}</span>
                            <div>
                                <h2 class="company-candidate-name" style="margin: 0; font-size: 18px;">${escapeHTML(app.studentName)}</h2>
                                <p class="talent-education" style="margin-top: 3px;">
                                    ${ICONS.graduationCap()}
                                    <strong>${escapeHTML(app.major)}</strong> (${escapeHTML(app.university)}) · GPA: <strong>${escapeHTML(app.gpa)}</strong>
                                </p>
                                <p class="app-target-job">
                                    ${ICONS.briefcase()} Applied for: <strong>${escapeHTML(app.opportunityTitle)}</strong>
                                </p>
                            </div>
                        </div>
                        <div style="text-align: right;">
                            <span class="teacher-badge ${escapeHTML(badgeClass)}" style="display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; font-size: 12.5px;">
                                ${badgeIcon} ${escapeHTML(app.status)}
                            </span>
                            <p class="dashboard-footnote" style="margin-top: 5px; display: flex; align-items: center; justify-content: flex-end; gap: 4px;">
                                ${ICONS.calendar()} Applied on ${escapeHTML(formatDate(app.appliedAt))}
                            </p>
                        </div>
                    </div>

                    <div class="company-app-card-body">
                        <div class="app-cover-card">
                            ${ICONS.quote()}
                            <div>
                                <strong style="display: block; font-size: 12px; text-transform: uppercase; color: var(--muted); margin-bottom: 4px; letter-spacing: 0.5px;">Candidate Statement & Cover Note:</strong>
                                <span>“${escapeHTML(app.coverNote)}”</span>
                            </div>
                        </div>

                        ${app.interviewDate ? `
                            <div class="app-interview-box">
                                <div class="app-interview-info">
                                    ${ICONS.video()}
                                    <span>Scheduled Interview: <strong>${escapeHTML(app.interviewDate)}</strong></span>
                                </div>
                                ${safeMeetingURL(app.meetingLink) ? `
                                    <a href="${escapeHTML(safeMeetingURL(app.meetingLink))}" target="_blank" rel="noopener" class="button button-outline" style="font-size: 12.5px; padding: 6px 14px; display: inline-flex; align-items: center; gap: 6px;">
                                        ${ICONS.video()} Open meeting link ${ICONS.externalLink()}
                                    </a>
                                ` : ''}
                            </div>
                        ` : ''}
                    </div>

                    <div class="app-card-actions">
                        ${app.status === "Under Review" ? `
                            <button type="button" class="button button-primary btn-open-interview" data-id="${escapeHTML(app.id)}" data-name="${escapeHTML(app.studentName)}">
                                ${ICONS.calendar()} Schedule Interview
                            </button>
                            <button type="button" class="button button-outline btn-accept-app" data-id="${escapeHTML(app.id)}">
                                ${ICONS.check()} Accept Application
                            </button>
                            <button type="button" class="button button-outline btn-decline-app" data-id="${escapeHTML(app.id)}" style="color: #9c2738; border-color: #9c2738;">
                                ${ICONS.xCircle()} Decline
                            </button>
                            <a href="company-messages.html?student=${escapeHTML(encodeURIComponent(app.studentEmail))}" class="button button-outline">
                                ${ICONS.messageSquare()} Candidate Chat
                            </a>
                        ` : app.status === "Interview Scheduled" ? `
                            <a href="${escapeHTML(safeMeetingURL(app.meetingLink) || 'https://meet.google.com/new')}" target="_blank" rel="noopener" class="button button-primary">
                                ${ICONS.video()} ${escapeHTML(safeMeetingURL(app.meetingLink) ? 'Open meeting link' : 'Create meeting link')}
                            </a>
                            <button type="button" class="button button-outline btn-accept-app" data-id="${escapeHTML(app.id)}">
                                ${ICONS.check()} Accept Candidate
                            </button>
                            <a href="company-messages.html?student=${escapeHTML(encodeURIComponent(app.studentEmail))}" class="button button-outline">
                                ${ICONS.messageSquare()} Candidate Chat
                            </a>
                        ` : `
                            <span class="teacher-badge badge-confirmed" style="display: inline-flex; align-items: center; gap: 5px; padding: 6px 14px;">
                                ${ICONS.checkCircle()} ${escapeHTML(app.status === 'Accepted' ? 'Candidate Accepted' : app.status)}
                            </span>
                            <a href="company-messages.html?student=${escapeHTML(encodeURIComponent(app.studentEmail))}" class="button button-outline">
                                ${ICONS.messageSquare()} View Communication
                            </a>
                        `}
                    </div>
                `;
                if (app.linkedStudent && app.training?.submission) {
                    const panel = el("section", null, "services-panel");
                    panel.append(el("h3", "Student training submission"), el("p", app.training.submission.notes), el("p", "Review: " + (app.training.review?.status || "Awaiting review")));
                    const url = safeMeetingURL(app.training.submission.url);
                    if (url) { const a = el("a", "Open submitted repository", "button button-outline"); a.href = url; a.target = "_blank"; a.rel = "noopener noreferrer"; panel.append(a); }
                    if (app.training.review?.status !== "Completed") for (const state of ["Completed", "Changes requested"]) { const button = el("button", state, "button button-outline"); button.type = "button"; listen(button, "click", () => { store.reviewStudentTraining(app.id, state, JSON.stringify(app.training)); render(); }); panel.append(button); }
                    card.append(panel);
                }
                root.appendChild(card);
            });
        }

        render();

        filterBtns.forEach(btn => {
            listen(btn, "click", () => {
                filterBtns.forEach(b => b.classList.remove("active"));
                btn.classList.add("active");
                currentFilter = btn.dataset.appFilter;
                render();
            });
        });

        if (root) {
            listen(root, "click", (e) => {
                const acceptBtn = e.target.closest(".btn-accept-app");
                if (acceptBtn) {
                    const id = acceptBtn.dataset.id;
                    store.updateApplicationStatus(id, "Accepted");
                    render();
                    return;
                }

                const declineBtn = e.target.closest(".btn-decline-app");
                if (declineBtn) {
                    const id = declineBtn.dataset.id;
                    if (confirm("Decline this application?")) {
                        store.updateApplicationStatus(id, "Declined");
                        render();
                    }
                    return;
                }

                const interviewBtn = e.target.closest(".btn-open-interview");
                if (interviewBtn && interviewModal) {
                    activeAppId = interviewBtn.dataset.id;
                    activeAppCandidate = interviewBtn.dataset.name;
                    if (targetCandidateName) targetCandidateName.textContent = activeAppCandidate;
                    interviewModal.showModal();
                }
            });
        }

        if (closeInterviewBtn && interviewModal) {
            listen(closeInterviewBtn, "click", () => interviewModal.close());
        }

        if (interviewForm && interviewModal) {
            listen(interviewForm, "submit", (e) => {
                e.preventDefault();
                const date = document.getElementById("interview-date").value;
                const time = document.getElementById("interview-time").value;
                const link = document.getElementById("interview-link").value.trim();
                if (link && !safeMeetingURL(link)) throw new Error("Enter a valid HTTPS meeting link, or leave it blank.");
                if (date && new Date(date + "T" + time) <= new Date()) throw new Error("Choose a future interview date and time.");

                if (activeAppId && date && time) {
                    const combined = `${formatDate(date)} at ${time}`;
                    store.updateApplicationStatus(activeAppId, "Interview Scheduled", {
                        interviewDate: combined,
                        meetingLink: link
                    });
                    interviewForm.reset();
                    interviewModal.close();
                    render();
                }
            });
        }
    }

    // --- 5. Candidate Messages & Interviews View ---
    function initMessages() {
        const threadsRoot = document.getElementById("company-threads-list");
        const activeStudentName = document.getElementById("chat-student-name");
        const chatMessages = document.getElementById("company-chat-messages");
        const chatForm = document.getElementById("company-chat-form");
        const chatInput = document.getElementById("company-chat-input");

        let messages = store.getMessages();
        const params = new URLSearchParams(location.search);
        const candidateId = params.get("candidate");
        let requestedEmail = params.get("student");
        if (candidateId) {
            try { requestedEmail = store.openConversation(candidateId).studentEmail; messages = store.getMessages(); }
            catch (error) { if (chatMessages) chatMessages.textContent = error.message; if (chatInput) chatInput.disabled = true; return; }
        }
        if (requestedEmail && !messages.some(m => m.studentEmail.toLowerCase() === requestedEmail.toLowerCase())) {
            try { store.openConversation(requestedEmail); messages = store.getMessages(); }
            catch (error) { if (chatMessages) chatMessages.textContent = error.message; if (chatInput) chatInput.disabled = true; return; }
        }
        if (messages.length === 0) { if (chatMessages) chatMessages.textContent = "No conversations yet. Choose a candidate from Applications or Talent Directory."; if (chatInput) chatInput.disabled = true; return; }
        let activeEmail = messages.find(message => message.studentEmail.toLowerCase() === requestedEmail?.toLowerCase())?.studentEmail || messages[0].studentEmail;

        function renderThreads() {
            if (!threadsRoot) return;
            threadsRoot.innerHTML = "";
            messages.forEach(conv => {
                const item = el("div", null, `company-thread-item ${conv.studentEmail.toLowerCase() === activeEmail.toLowerCase() ? 'active' : ''}`);
                item.dataset.email = conv.studentEmail;
                const lastMsg = conv.thread[conv.thread.length - 1];
                item.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 12px; width: 100%;">
                        <span class="talent-avatar" style="width: 38px; height: 38px; font-size: 13px;">${escapeHTML(conv.studentInitials)}</span>
                        <div style="flex: 1; min-width: 0;">
                            <strong style="font-size: 14.5px; color: var(--primary);">${escapeHTML(conv.studentName)}</strong>
                            <p style="margin: 2px 0 0; font-size: 12.5px; color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                                ${escapeHTML(lastMsg ? lastMsg.text : 'No messages')}
                            </p>
                        </div>
                    </div>
                `;
                threadsRoot.appendChild(item);
            });
        }

        function renderConversation() {
            const currentConv = messages.find(m => m.studentEmail.toLowerCase() === activeEmail.toLowerCase()) || messages[0];
            if (!currentConv) return;

            if (activeStudentName) activeStudentName.textContent = currentConv.studentName;
            if (chatMessages) {
                chatMessages.innerHTML = "";
                currentConv.thread.forEach(msg => {
                    const bubble = el("div", null, `chat-bubble ${msg.sender === 'company' ? 'bubble-company' : 'bubble-student'}`);
                    bubble.innerHTML = `
                        <div class="bubble-sender">${escapeHTML(msg.sender === 'company' ? 'You (Employer)' : currentConv.studentName)}</div>
                        <div class="bubble-text">${escapeHTML(msg.text)}</div>
                        <div class="bubble-time">${escapeHTML(formatDate(msg.time))}</div>
                    `;
                    chatMessages.appendChild(bubble);
                });
                chatMessages.scrollTop = chatMessages.scrollHeight;
            }
        }

        renderThreads();
        renderConversation();
        function refreshMessages() {
            messages = store.getMessages();
            if (!messages.length) { threadsRoot?.replaceChildren(); if (chatMessages) chatMessages.textContent = "No conversations available for this company session."; if (chatInput) chatInput.disabled = true; return; }
            if (chatInput) chatInput.disabled = false;
            if (!messages.some(m => m.studentEmail.toLowerCase() === activeEmail.toLowerCase())) activeEmail = messages[0].studentEmail;
            renderThreads(); renderConversation();
        }
        listen(window, "storage", event => { if (event.key === "codementor-company-store-v1" || event.key === "codementor-company-session") refreshMessages(); });
        listen(document, "visibilitychange", () => { if (!document.hidden) refreshMessages(); });

        if (threadsRoot) {
            listen(threadsRoot, "click", (e) => {
                const item = e.target.closest(".company-thread-item");
                if (item) {
                    activeEmail = item.dataset.email;
                    renderThreads();
                    renderConversation();
                }
            });
        }

        if (chatForm && chatInput) {
            listen(chatForm, "submit", (e) => {
                e.preventDefault();
                const text = chatInput.value.trim();
                const currentConv = messages.find(m => m.studentEmail.toLowerCase() === activeEmail.toLowerCase());
                if (text && currentConv) {
                    try { store.sendMessage(currentConv.studentEmail, currentConv.studentName, text); } catch (error) { alert(error.message); return; }
                    messages = store.getMessages();
                    chatInput.value = "";
                    renderThreads();
                    renderConversation();
                }
            });
        }
    }

    // --- 6. Company Profile View ---
    function initProfile() {
        const form = document.getElementById("company-profile-form");
        const statusMsg = document.getElementById("company-profile-status");
        if (!form) return;

        const profile = store.getProfile();

        const nameInput = document.getElementById("comp-name");
        const industryInput = document.getElementById("comp-industry");
        const emailInput = document.getElementById("comp-email");
        const phoneInput = document.getElementById("comp-phone");
        const locInput = document.getElementById("comp-loc");
        const webInput = document.getElementById("comp-web");
        const sizeInput = document.getElementById("comp-size");
        const aboutInput = document.getElementById("comp-about");
        const stackContainer = document.getElementById("comp-stack-container");
        const previewName = document.getElementById("company-preview-name");

        if (nameInput) nameInput.value = profile.name || "";
        if (industryInput) industryInput.value = profile.industry || "";
        if (emailInput) emailInput.value = profile.email || "";
        if (phoneInput) phoneInput.value = profile.phone || "";
        if (locInput) locInput.value = profile.location || "";
        if (webInput) webInput.value = profile.website || "";
        if (sizeInput) sizeInput.value = profile.size || "50-100 employees";
        if (aboutInput) aboutInput.value = profile.about || "";
        if (previewName) previewName.textContent = profile.name || "Your company";
        if (nameInput && previewName) listen(nameInput, "input", () => { previewName.textContent = nameInput.value.trim() || "Your company"; });

        function renderStack() {
            if (!stackContainer) return;
            stackContainer.innerHTML = "";
            (profile.techStack || []).forEach((tech, idx) => {
                const chip = el("span", null, "teacher-chip company-profile-chip");
                const label = el("span", tech, "company-profile-chip-label");
                const remove = el("button", "x", "btn-remove-tech");
                remove.type = "button";
                remove.dataset.idx = String(idx);
                remove.setAttribute("aria-label", `Remove ${tech}`);
                chip.append(label, remove);
                stackContainer.appendChild(chip);
            });
        }

        renderStack();

        const addTechBtn = document.getElementById("btn-add-tech");
        const newTechInput = document.getElementById("new-tech-input");
        if (addTechBtn && newTechInput) {
            listen(addTechBtn, "click", () => {
                const val = newTechInput.value.trim();
                if (val && !profile.techStack.includes(val)) {
                    profile.techStack.push(val);
                    newTechInput.value = "";
                    renderStack();
                }
            });
            listen(newTechInput, "keydown", (event) => {
                if (event.key === "Enter") {
                    event.preventDefault();
                    addTechBtn.click();
                }
            });
        }

        if (stackContainer) {
            listen(stackContainer, "click", (e) => {
                const removeBtn = e.target.closest(".btn-remove-tech");
                if (removeBtn) {
                    const idx = Number(removeBtn.dataset.idx);
                    profile.techStack.splice(idx, 1);
                    renderStack();
                }
            });
        }

        listen(form, "submit", (e) => {
            e.preventDefault();
            const updated = {
                name: nameInput.value.trim(),
                industry: industryInput.value.trim(),
                phone: phoneInput.value.trim(),
                location: locInput.value.trim(),
                website: webInput.value.trim(),
                size: sizeInput.value,
                about: aboutInput.value.trim(),
                techStack: profile.techStack
            };

            store.updateProfile(updated);

            if (store.getCompanySession() && !store.setCompanySession({
                email: profile.email,
                name: updated.name
            })) throw new Error("Profile saved, but the session display could not be updated. Sign in again to refresh it.");

            if (statusMsg) {
                statusMsg.textContent = "Company profile updated successfully.";
                statusMsg.classList.remove("is-error");
                setTimeout(() => { statusMsg.textContent = ""; }, 4000);
            }
        });
    }

    // Router on DOMContentLoaded
    listen(document, "DOMContentLoaded", () => {
        const filename = location.pathname.split("/").pop();
        if (filename === "company-dashboard.html") initDashboard();
        else if (filename === "company-jobs.html") initJobs();
        else if (filename === "company-talent.html") initTalent();
        else if (filename === "company-applications.html") initApplications();
        else if (filename === "company-messages.html") initMessages();
        else if (filename === "company-profile.html") initProfile();
    });
})();
