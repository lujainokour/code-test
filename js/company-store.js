/**
 * CodeMentor AI - Company / Employer Store
 * Handles persistent state for company profiles, posted internships/projects,
 * candidate applications, student talent exploration, and interview communication.
 */
(() => {
    "use strict";

    const STORE_KEY = "codementor-company-store-v1";
    const SESSION_KEY = "codementor-company-session";

    const defaultInitialData = {
        profile: {
            name: "CloudPeak Innovations",
            industry: "Software Engineering & Cloud Systems",
            email: "company@example.com",
            phone: "+962 6 500 1234",
            location: "Amman, Jordan",
            website: "https://cloudpeak.example.com",
            size: "50-100 employees",
            foundedYear: 2021,
            about: "CloudPeak Innovations is a high-growth technology solutions provider building enterprise web platforms, data pipelines, and AI systems. We actively collaborate with universities like Irbid National University to mentor and recruit rising software talent through virtual internships and practical freelance milestones.",
            techStack: [
                "Python (FastAPI / Django)",
                "SQL Server & PostgreSQL",
                "React & TypeScript",
                "Machine Learning & AI",
                "Docker & Cloud DevOps"
            ],
            hiringStatus: "Actively Hiring"
        },
        opportunities: [
            {
                id: "opp-101",
                title: "Python Backend & API Engineering Intern",
                type: "Virtual Internship",
                department: "Core Engineering",
                location: "Remote / Hybrid (Jordan)",
                duration: "3 Months (Part-Time)",
                stipend: "$350 / month",
                status: "Active",
                applicantsCount: 6,
                skillsRequired: ["Python", "Object-Oriented Programming (OOP)", "RESTful APIs", "SQL"],
                description: "Collaborate directly with our senior backend engineers to develop RESTful microservices, optimize data structures, and write automated test suites. Weekly code reviews and structured mentorship provided.",
                postedAt: "2026-10-24T10:00:00Z"
            },
            {
                id: "opp-102",
                title: "Relational Database Schema Refactoring & Indexing",
                type: "Freelance Project",
                department: "Data Infrastructure",
                location: "Remote",
                duration: "4 Weeks (Milestone-based)",
                stipend: "$500 Project Fixed Fee",
                status: "Active",
                applicantsCount: 4,
                skillsRequired: ["SQL Server", "3NF Normalization", "Complex Joins", "Index Optimization"],
                description: "Audit existing schema tables, eliminate redundant keys, write comprehensive verification queries, and optimize query execution plans for an enterprise billing service.",
                postedAt: "2026-10-30T14:30:00Z"
            },
            {
                id: "opp-103",
                title: "Machine Learning Model Evaluation Assistant",
                type: "Virtual Internship",
                department: "AI & Data Science",
                location: "Remote",
                duration: "2 Months",
                stipend: "$300 / month",
                status: "Active",
                applicantsCount: 5,
                skillsRequired: ["Python", "Pandas", "Scikit-Learn", "Model Evaluation Metrics"],
                description: "Work on evaluating educational AI models, calculating precision/recall curves, curating benchmark evaluation sets, and documenting experimental findings.",
                postedAt: "2026-11-02T09:15:00Z"
            },
            {
                id: "opp-104",
                title: "Frontend Dashboard UI Components (HTML/CSS/JS)",
                type: "Freelance Project",
                department: "Product Design",
                location: "Remote",
                duration: "2 Weeks",
                stipend: "$350 Fixed Fee",
                status: "Active",
                applicantsCount: 3,
                skillsRequired: ["Semantic HTML5", "Responsive CSS", "Vanilla JavaScript", "A11y"],
                description: "Build clean, accessible analytics dashboard widgets following an established design token system. Strict compliance with WCAG accessibility guidelines required.",
                postedAt: "2026-11-04T12:00:00Z"
            }
        ],
        talentPool: [
            {
                id: "tal-1",
                name: "Lujain Okour",
                email: "student@example.com",
                initials: "LO",
                university: "Irbid National University",
                major: "Data Science & Artificial Intelligence",
                gpa: "3.88 / 4.0",
                graduationYear: "2027",
                topSkills: ["Python", "Algorithms", "Data Structures", "SQL Server", "AI Ethics"],
                completedLessons: 12,
                solvedTasks: 6,
                portfolioProjects: [
                    "Task Manager with Execution Limits",
                    "Enterprise SQL Schema with 23 Tables",
                    "Adaptive Learning Evaluation Methodology"
                ],
                bio: "Honor student in Data Science & AI with strong foundations in Python programming, automated test authoring, and relational database modeling.",
                availability: "Available for Virtual Internship & Freelance",
                preferredRole: "Junior AI / Backend Developer"
            },
            {
                id: "tal-2",
                name: "Omar Khaled",
                email: "omar.k@example.com",
                initials: "OK",
                university: "Irbid National University",
                major: "Computer Science",
                gpa: "3.75 / 4.0",
                graduationYear: "2027",
                topSkills: ["SQL Server", "C# .NET", "Database Indexing", "Concurrency Control"],
                completedLessons: 12,
                solvedTasks: 5,
                portfolioProjects: [
                    "CourseHub Relational Database",
                    "E-Commerce Inventory Manager"
                ],
                bio: "Passionate about database internals, high-concurrency transactions, and scalable backend services.",
                availability: "Available for Freelance Projects",
                preferredRole: "Database Developer"
            },
            {
                id: "tal-3",
                name: "Noor Al-Hassan",
                email: "noor.h@example.com",
                initials: "NH",
                university: "Irbid National University",
                major: "Software Engineering",
                gpa: "3.82 / 4.0",
                graduationYear: "2027",
                topSkills: ["Python OOP", "Design Patterns", "FastAPI", "Unit Testing"],
                completedLessons: 10,
                solvedTasks: 6,
                portfolioProjects: [
                    "Design Patterns Interactive Catalog",
                    "RESTful Bookings Microservice"
                ],
                bio: "Focused on clean code, software architecture, SOLID principles, and building maintainable web microservices.",
                availability: "Available for Internship",
                preferredRole: "Software Engineer Intern"
            },
            {
                id: "tal-4",
                name: "Zaid Ahmad",
                email: "zaid.a@example.com",
                initials: "ZA",
                university: "Irbid National University",
                major: "Artificial Intelligence",
                gpa: "3.70 / 4.0",
                graduationYear: "2026",
                topSkills: ["Machine Learning", "Scikit-Learn", "Feature Engineering", "Data Analysis"],
                completedLessons: 12,
                solvedTasks: 6,
                portfolioProjects: [
                    "Educational Knowledge Tracing Model",
                    "Predictive Student Retention Classifier"
                ],
                bio: "Data enthusiast with experience training machine learning baseline models and evaluating precision-recall trade-offs.",
                availability: "Available for Part-time AI Work",
                preferredRole: "Junior ML Engineer"
            }
        ],
        applications: [
            {
                id: "app-301",
                opportunityId: "opp-101",
                opportunityTitle: "Python Backend & API Engineering Intern",
                studentName: "Lujain Okour",
                studentEmail: "student@example.com",
                studentInitials: "LO",
                university: "Irbid National University",
                major: "Data Science & AI",
                gpa: "3.88",
                coverNote: "I have completed all three Python levels on CodeMentor AI, built a comprehensive Task Manager application in WebAssembly, and designed verified SQL Server databases. Eager to contribute to CloudPeak's engineering team.",
                status: "Under Review",
                appliedAt: "2026-11-04T11:20:00Z",
                interviewDate: null,
                meetingLink: null
            },
            {
                id: "app-302",
                opportunityId: "opp-102",
                opportunityTitle: "Relational Database Schema Refactoring & Indexing",
                studentName: "Omar Khaled",
                studentEmail: "omar.k@example.com",
                studentInitials: "OK",
                university: "Irbid National University",
                major: "Computer Science",
                gpa: "3.75",
                coverNote: "Strong command of T-SQL, foreign key integrity rules, composite keys, and dead-lock prevention with UPDLOCK. I can deliver this milestone ahead of deadline.",
                status: "Accepted",
                appliedAt: "2026-11-01T15:45:00Z",
                interviewDate: "2026-11-03",
                meetingLink: "https://meet.google.com/new"
            },
            {
                id: "app-303",
                opportunityId: "opp-103",
                opportunityTitle: "Machine Learning Model Evaluation Assistant",
                studentName: "Zaid Ahmad",
                studentEmail: "zaid.a@example.com",
                studentInitials: "ZA",
                university: "Irbid National University",
                major: "Artificial Intelligence",
                gpa: "3.70",
                coverNote: "Experienced in scikit-learn metrics, confusion matrix interpretation, and preventing data leakage across temporal splits. Excited about the research focus.",
                status: "Interview Scheduled",
                appliedAt: "2026-11-03T16:10:00Z",
                interviewDate: "2026-11-10 at 02:00 PM",
                meetingLink: "https://meet.google.com/cpk-eval-interview"
            },
            {
                id: "app-304",
                opportunityId: "opp-104",
                opportunityTitle: "Frontend Dashboard UI Components (HTML/CSS/JS)",
                studentName: "Noor Al-Hassan",
                studentEmail: "noor.h@example.com",
                studentInitials: "NH",
                university: "Irbid National University",
                major: "Software Engineering",
                gpa: "3.82",
                coverNote: "I build responsive, accessible web components with semantic HTML, fluid typography, and clean CSS variables. I can start immediately.",
                status: "Under Review",
                appliedAt: "2026-11-05T09:30:00Z",
                interviewDate: null,
                meetingLink: null
            }
        ],
        messages: [
            {
                id: "msg-1",
                studentEmail: "student@example.com",
                studentName: "Lujain Okour",
                studentInitials: "LO",
                lastUpdated: "2026-11-05T14:30:00Z",
                thread: [
                    {
                        sender: "company",
                        text: "Hello Lujain! We thoroughly reviewed your application for the Python Backend Internship. Your coursework in Data Science and your practical project code look impressive.",
                        time: "2026-11-05T10:00:00Z"
                    },
                    {
                        sender: "student",
                        text: "Thank you so much! I am very excited about the opportunity to collaborate with CloudPeak Innovations.",
                        time: "2026-11-05T11:15:00Z"
                    },
                    {
                        sender: "company",
                        text: "Would you be available for a 20-minute introductory virtual interview next Tuesday around 11:00 AM via Google Meet?",
                        time: "2026-11-05T14:30:00Z"
                    }
                ]
            },
            {
                id: "msg-2",
                studentEmail: "omar.k@example.com",
                studentName: "Omar Khaled",
                studentInitials: "OK",
                lastUpdated: "2026-11-03T16:00:00Z",
                thread: [
                    {
                        sender: "company",
                        text: "Hi Omar, we have officially accepted your proposal for the Database Refactoring project. Welcome aboard!",
                        time: "2026-11-03T15:30:00Z"
                    },
                    {
                        sender: "student",
                        text: "Thank you! I will review the schema specification and begin the first milestone today.",
                        time: "2026-11-03T16:00:00Z"
                    }
                ]
            }
        ]
    };

    function readStore() {
        let raw;
        try { raw = localStorage.getItem(STORE_KEY); }
        catch { throw new Error("Browser storage is unavailable. Your saved records have not been changed."); }
        if (raw === null) return JSON.parse(JSON.stringify(defaultInitialData));
        let value;
        try { value = JSON.parse(raw); } catch { throw new Error("Saved company data could not be read. It has not been replaced."); }
        if (!value || typeof value !== "object" || !value.profile || typeof value.profile.name !== "string" || typeof value.profile.email !== "string" || !Array.isArray(value.opportunities) || !Array.isArray(value.talentPool) || !Array.isArray(value.applications) || !Array.isArray(value.messages)) {
            throw new Error("Saved company data is invalid. It has not been replaced.");
        }
        return value;
    }

    function writeStore(data) {
        try { localStorage.setItem(STORE_KEY, JSON.stringify(data)); }
        catch { throw new Error("Changes could not be saved. Browser storage is unavailable or full. Your previous records were kept."); }
        return true;
    }

    function requireCompany(data) {
        let account;
        try { account = JSON.parse(localStorage.getItem(SESSION_KEY)); } catch { throw new Error("The company session could not be read."); }
        if (!account || account.role !== "company" || account.isDemo !== true || account.email.toLowerCase() !== data.profile.email.toLowerCase()) throw new Error("Sign in to this company account to continue.");
    }

    function conversation(data, studentEmail, studentName) {
        const target = studentEmail.trim();
        const linked = window.platformStore?.getStudents().find(s => s.id === target || s.email === target.toLowerCase());
        if (linked) requireCompany(data);
        if (linked && !linked.publicProfile && !data.applications.some(a => a.studentEmail.toLowerCase() === linked.email)) throw new Error("This candidate is no longer published and has not applied to your company.");
        const email = linked ? linked.email : target.toLowerCase();
        let thread = data.messages.find(m => m.studentEmail.toLowerCase() === email);
        if (!thread) {
            const eligible = data.talentPool.some(s => s.email.toLowerCase() === email) || data.applications.some(a => a.studentEmail.toLowerCase() === email) || Boolean(linked?.publicProfile);
            if (!eligible) throw new Error("Choose a published candidate or an applicant before starting a conversation.");
            const name = linked?.name || studentName;
            thread = {id: "msg-" + crypto.randomUUID(), studentEmail: email, studentName: name, studentInitials: name.trim().split(/\s+/).slice(0,2).map(w => Array.from(w)[0]).join("").toUpperCase(), lastUpdated: new Date().toISOString(), thread: []};
            data.messages.unshift(thread);
        }
        if (linked) thread.linkedStudent = true;
        return thread;
    }

    // ---------- Admin company directory (Part 4) ----------
    // Admin-only state: verification status + history, review flags and labelled SAMPLE companies.
    // The live portal company is derived from STORE_KEY and never modified by the admin directory.
    const DIRECTORY_KEY = "codementor-company-directory-v1";
    const VERIFICATION = ["Unverified", "Under review", "Verified", "Suspended"];
    const FUNNEL = ["applied", "interview", "accepted", "rejected", "completed"];
    const portalId = email => "portal:" + String(email || "").trim().toLowerCase();
    const isoOk = value => typeof value === "string" && Number.isFinite(Date.parse(value));
    function adminSession() {
        let a = null;
        try { a = JSON.parse(sessionStorage.getItem("codementor-admin-session") || "null"); } catch { a = null; }
        if (a?.role !== "admin" || a.isDemo !== true || !Number.isFinite(a.signedInAt) || a.signedInAt > Date.now() || Date.now() - a.signedInAt >= 8 * 3600000) throw new Error("Sign in as an administrator to manage companies.");
    }
    function readDirectory() {
        let raw;
        try { raw = localStorage.getItem(DIRECTORY_KEY); } catch { throw new Error("Browser storage is unavailable."); }
        if (raw === null) return { version: 1, records: {}, samples: [] };
        let d;
        try { d = JSON.parse(raw); } catch { throw new Error("Company administration records could not be read. They have not been replaced."); }
        const validRecord = r => r && VERIFICATION.includes(r.verification?.status) && typeof r.verification.notes === "string" && Array.isArray(r.verification.history) &&
            r.verification.history.every(h => VERIFICATION.includes(h.status) && isoOk(h.at) && typeof h.note === "string") && (r.flag === null || (typeof r.flag?.reason === "string" && isoOk(r.flag.at)));
        if (d?.version !== 1 || !d.records || typeof d.records !== "object" || !Object.values(d.records).every(validRecord) || !Array.isArray(d.samples) || !d.samples.every(s => typeof s?.id === "string" && s.sample === true && typeof s.profile?.name === "string" && Array.isArray(s.opportunities))) throw new Error("Company administration records are invalid. They have not been replaced.");
        return d;
    }
    function writeDirectory(d) {
        try { localStorage.setItem(DIRECTORY_KEY, JSON.stringify(d)); }
        catch { throw new Error("Company administration changes could not be saved. Browser storage is unavailable or full."); }
        window.dispatchEvent?.(new Event("company-directory-changed"));
    }
    // Enforced by every portal action that posts or messages.
    function assertNotSuspended(data) {
        let directory;
        try { directory = readDirectory(); } catch { throw new Error("Company status could not be checked. Posting and messaging are paused; existing records were kept."); }
        const record = directory.records[portalId(data.profile.email)];
        if (record?.verification.status === "Suspended") throw new Error(`This company account is suspended by an administrator${record.verification.notes ? ": " + record.verification.notes : ""}. Posting opportunities and messaging candidates are disabled.`);
    }
    const defaultRecord = () => ({ verification: { status: "Unverified", notes: "", history: [] }, flag: null });

    // ---- normalising both sources into one safe, whitelisted view ----
    const portalStage = a => a.status === "Interview Scheduled" ? "interview" : a.status === "Declined" ? "rejected" : a.status === "Accepted" ? (a.training?.review?.status === "Completed" ? "completed" : "accepted") : "applied";
    function consentedName(application) {
        if (!application.linkedStudent) return "Portal demo applicant (not a real student)";
        let students = [];
        try { students = window.platformStore?.getStudents() || []; } catch { students = []; }
        const student = students.find(s => s.email === String(application.studentEmail || "").toLowerCase());
        return student && student.status === "enabled" && student.publicProfile ? student.name : "Private applicant (profile not published)";
    }
    function funnelOf(applications) {
        const funnel = Object.fromEntries(FUNNEL.map(k => [k, 0]));
        applications.forEach(a => { funnel[a.stage]++; });
        return funnel;
    }
    function portalView(data, record) {
        const p = data.profile, text = v => typeof v === "string" ? v : "";
        const messagesFor = email => data.messages.filter(m => String(m.studentEmail).toLowerCase() === String(email).toLowerCase()).reduce((n, m) => n + (Array.isArray(m.thread) ? m.thread.length : 0), 0);
        const applications = data.applications.map(a => ({ id: String(a.id), opportunityId: String(a.opportunityId), stage: portalStage(a), status: text(a.status), appliedAt: isoOk(a.appliedAt) ? a.appliedAt : null, applicant: consentedName(a), messages: messagesFor(a.studentEmail) }));
        const opportunities = data.opportunities.filter(o => o && typeof o.id === "string").map(o => {
            const apps = applications.filter(a => a.opportunityId === o.id);
            return { id: o.id, title: text(o.title), description: text(o.description), status: text(o.status), department: text(o.department), location: text(o.location), duration: text(o.duration), compensation: text(o.stipend), skills: Array.isArray(o.skillsRequired) ? o.skillsRequired.filter(s => typeof s === "string") : [], publishedAt: isoOk(o.postedAt) ? o.postedAt : null, applications: apps, funnel: funnelOf(apps) };
        });
        const events = [
            ...opportunities.filter(o => o.publishedAt).map(o => ({ at: o.publishedAt, type: "opportunity", text: `Opportunity published: ${o.title}` })),
            ...applications.filter(a => a.appliedAt).map(a => ({ at: a.appliedAt, type: "application", text: `Application received (${opportunities.find(o => o.id === a.opportunityId)?.title || "opportunity"})` })),
            ...data.messages.filter(m => isoOk(m.lastUpdated)).map(m => ({ at: m.lastUpdated, type: "message", text: `Conversation updated (${Array.isArray(m.thread) ? m.thread.length : 0} messages)` }))
        ];
        return { id: portalId(p.email), sample: false, source: "Company portal in this browser", profile: { name: text(p.name), industry: text(p.industry), size: text(p.size), location: text(p.location), website: text(p.website), description: text(p.about) },
            contact: { name: text(p.contactName) || "Not provided", email: text(p.email).toLowerCase() }, createdAt: isoOk(p.createdAt) ? p.createdAt : null,
            talentViews: Number.isInteger(data.talentViews) ? data.talentViews : 0, opportunities, events, record };
    }
    function sampleView(s, record) {
        const applications = s.opportunities.flatMap(o => o.applications.map(a => ({ ...a, opportunityId: o.id })));
        const opportunities = s.opportunities.map(o => ({ ...o, applications: o.applications.map(a => ({ ...a, opportunityId: o.id })), funnel: funnelOf(o.applications) }));
        const events = [
            { at: s.createdAt, type: "created", text: "Company account created (SAMPLE)" },
            ...opportunities.filter(o => o.publishedAt).map(o => ({ at: o.publishedAt, type: "opportunity", text: `Opportunity published: ${o.title}` })),
            ...applications.map(a => ({ at: a.appliedAt, type: "application", text: `Application received (${opportunities.find(o => o.id === a.opportunityId).title})` }))
        ];
        return { id: s.id, sample: true, source: "SAMPLE data", profile: { ...s.profile }, contact: { ...s.contact }, createdAt: s.createdAt, talentViews: s.talentViews, opportunities, events, record };
    }
    function finish(view) {
        const record = view.record || defaultRecord();
        const events = [...view.events,
            ...record.verification.history.map(h => ({ at: h.at, type: "verification", text: `Verification set to ${h.status}${h.note ? " — " + h.note : ""}` })),
            ...(record.flagHistory || []).map(f => ({ at: f.at, type: "flag", text: f.text }))
        ].filter(e => isoOk(e.at)).sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
        const applications = view.opportunities.flatMap(o => o.applications);
        return {
            id: view.id, sample: view.sample, source: view.source, profile: view.profile, contact: view.contact, createdAt: view.createdAt,
            lastActivityAt: events[0]?.at || null, talentViews: view.talentViews,
            verification: { status: record.verification.status, notes: record.verification.notes, history: record.verification.history.map(h => ({ ...h })) },
            flag: record.flag ? { ...record.flag } : null,
            opportunities: view.opportunities, applicationsTotal: applications.length,
            messagesTotal: applications.reduce((n, a) => n + a.messages, 0),
            funnel: funnelOf(applications), timeline: events.slice(0, 25)
        };
    }
    function adminCompanies() {
        adminSession();
        const directory = readDirectory(), list = [];
        if (localStorage.getItem(STORE_KEY) !== null) { const data = readStore(); list.push(finish(portalView(data, directory.records[portalId(data.profile.email)]))); }
        directory.samples.forEach(s => list.push(finish(sampleView(s, directory.records[s.id]))));
        return JSON.parse(JSON.stringify(list));
    }
    function adminSummary(companies, nowMs = Date.now()) {
        const week = nowMs - 7 * 86400000;
        return {
            total: companies.length,
            verified: companies.filter(c => c.verification.status === "Verified").length,
            activeOpportunities: companies.reduce((n, c) => n + c.opportunities.filter(o => o.status === "Active").length, 0),
            applicationsThisWeek: companies.reduce((n, c) => n + c.opportunities.flatMap(o => o.applications).filter(a => a.appliedAt && Date.parse(a.appliedAt) >= week && Date.parse(a.appliedAt) <= nowMs).length, 0)
        };
    }
    function adminFilter(companies, { search = "", status = "all", flagged = false, sample = "all", sort = "name" } = {}) {
        const q = search.trim().toLowerCase();
        let list = companies.filter(c => (!q || [c.profile.name, c.profile.industry, c.profile.location, c.contact.name].join(" ").toLowerCase().includes(q)) &&
            (status === "all" || c.verification.status === status) && (!flagged || c.flag) && (sample === "all" || (sample === "sample") === c.sample));
        const time = v => v ? Date.parse(v) : 0;
        const sorters = { name: (a, b) => a.profile.name.localeCompare(b.profile.name), newest: (a, b) => time(b.createdAt) - time(a.createdAt) || a.profile.name.localeCompare(b.profile.name), activity: (a, b) => time(b.lastActivityAt) - time(a.lastActivityAt), applications: (a, b) => b.applicationsTotal - a.applicationsTotal || a.profile.name.localeCompare(b.profile.name) };
        return list.sort(sorters[sort] || sorters.name);
    }
    function knownCompany(directory, id) {
        if (directory.samples.some(s => s.id === id)) return true;
        if (localStorage.getItem(STORE_KEY) === null) return false;
        return portalId(readStore().profile.email) === id;
    }
    // Verification changes. Suspending and restoring need a reason and an explicit confirmation.
    function adminSetVerification(id, status, note = "", options = {}) {
        adminSession();
        if (!VERIFICATION.includes(status)) throw new Error("Choose a valid verification status.");
        const directory = readDirectory();
        if (!knownCompany(directory, id)) throw new Error("This company was not found. Refresh the directory.");
        const record = directory.records[id] || defaultRecord(), from = record.verification.status;
        note = typeof note === "string" ? note.trim() : "";
        if (note.length > 500) throw new Error("Keep the note under 500 characters.");
        if (from === status) throw new Error(`This company is already ${status}.`);
        const sensitive = status === "Suspended" || from === "Suspended";
        if (sensitive && note.length < 5) throw new Error(status === "Suspended" ? "Give a reason for suspending this company." : "Give a reason for restoring this company.");
        if (sensitive && options.confirmed !== true) throw new Error("Confirm this action before it is applied.");
        record.verification = { status, notes: note, history: [...record.verification.history, { status, from, note, at: new Date().toISOString(), by: "admin" }] };
        directory.records[id] = record; writeDirectory(directory);
        return status;
    }
    // Restore returns to the status the company had before it was suspended.
    function adminRestore(id, note, options = {}) {
        adminSession();
        const record = readDirectory().records[id];
        if (record?.verification.status !== "Suspended") throw new Error("Only a suspended company can be restored.");
        const before = [...record.verification.history].reverse().find(h => h.status === "Suspended")?.from;
        return adminSetVerification(id, before && before !== "Suspended" ? before : "Under review", note, options);
    }
    function adminFlag(id, reason, active = true) {
        adminSession();
        const directory = readDirectory();
        if (!knownCompany(directory, id)) throw new Error("This company was not found. Refresh the directory.");
        reason = typeof reason === "string" ? reason.trim() : "";
        if (reason.length < 5 || reason.length > 500) throw new Error(active ? "Explain why this company needs review (5-500 characters)." : "Add a note for clearing the flag (5-500 characters).");
        const record = directory.records[id] || defaultRecord();
        if (active && record.flag) throw new Error("This company is already flagged for review.");
        if (!active && !record.flag) throw new Error("This company is not flagged.");
        const at = new Date().toISOString();
        record.flag = active ? { reason, at } : null;
        record.flagHistory = [...(record.flagHistory || []), { at, text: active ? `Flagged for review — ${reason}` : `Review flag cleared — ${reason}` }];
        directory.records[id] = record; writeDirectory(directory);
    }

    // ---- SAMPLE companies (explicit admin buttons only) ----
    function sampleCompanies(base) {
        const at = days => new Date(base - days * 86400000).toISOString();
        const apps = (prefix, list) => list.map(([stage, days, messages], i) => ({ id: `${prefix}-a${i + 1}`, stage, status: stage, appliedAt: at(days), applicant: `Sample applicant ${i + 1} (SAMPLE)`, messages }));
        const opp = (id, title, status, department, location, duration, compensation, skills, days, applications) => ({ id, title: "[SAMPLE] " + title, status, department, location, duration, compensation, skills, publishedAt: at(days), applications });
        const company = (n, name, industry, size, location, days, talentViews, opportunities) => ({
            id: `sample-company-${n}`, sample: true, createdAt: at(days), talentViews,
            profile: { name: `${name} (SAMPLE)`, industry, size, location, website: `https://${name.toLowerCase().replace(/[^a-z]+/g, "-")}.example`, description: `SAMPLE company for demonstrations. ${name} is fictional.` },
            contact: { name: `Sample Contact ${n}`, email: `contact${n}@company.sample.invalid` }, opportunities
        });
        return [
            company(1, "Alpha Data Studio", "Data analytics", "11-50", "Remote", 120, 14, [
                opp("s1-o1", "Python data cleaning intern", "Active", "Data", "Remote", "3 months", "Unpaid (sample)", ["Python", "pandas"], 30, apps("s1-o1", [["applied", 1, 0], ["interview", 3, 4], ["accepted", 12, 6], ["rejected", 20, 1], ["completed", 60, 9]])),
                opp("s1-o2", "SQL reporting project", "Closed", "Analytics", "Remote", "4 weeks", "Fixed fee (sample)", ["SQL"], 90, apps("s1-o2", [["completed", 80, 5], ["rejected", 85, 0]]))]),
            company(2, "Bright Path Learning", "Education technology", "1-10", "Amman", 45, 3, [
                opp("s2-o1", "JavaScript UI helper", "Active", "Product", "Hybrid", "2 months", "Stipend (sample)", ["JavaScript", "HTML"], 10, apps("s2-o1", [["applied", 2, 0], ["applied", 5, 1]]))]),
            company(3, "Cedar Cloud Works", "Cloud services", "51-200", "Irbid", 200, 22, [
                opp("s3-o1", "DevOps scripting intern", "Active", "Platform", "On site", "6 months", "Stipend (sample)", ["Python", "Linux"], 15, apps("s3-o1", [["interview", 4, 3], ["accepted", 9, 7], ["applied", 6, 0]])),
                opp("s3-o2", "API testing project", "Draft", "QA", "Remote", "6 weeks", "Fixed fee (sample)", ["JavaScript", "Testing"], 2, [])]),
            company(4, "Delta Robotics Lab", "Hardware and robotics", "11-50", "Zarqa", 15, 0, []),
            company(5, "Echo Commerce", "Online retail", "201-500", "Remote", 300, 9, [
                opp("s5-o1", "Frontend bug-fix sprint", "Closed", "Web", "Remote", "2 weeks", "Fixed fee (sample)", ["JavaScript"], 100, apps("s5-o1", [["rejected", 95, 2], ["rejected", 96, 0]]))]),
            company(6, "Fjord Health Apps", "Health software", "51-200", "Aqaba", 70, 5, [
                opp("s6-o1", "Python automation intern", "Active", "Engineering", "Hybrid", "3 months", "Stipend (sample)", ["Python"], 5, apps("s6-o1", [["applied", 0, 0], ["interview", 4, 2]]))])
        ];
    }
    // Admin states for the samples, so the directory shows every status. History entries are labelled SAMPLE.
    function sampleRecords(base) {
        const at = days => new Date(base - days * 86400000).toISOString();
        const h = (status, from, note, days) => ({ status, from, note: "SAMPLE: " + note, at: at(days), by: "admin" });
        return {
            "sample-company-1": { verification: { status: "Verified", notes: "SAMPLE: registration documents checked.", history: [h("Under review", "Unverified", "documents requested", 110), h("Verified", "Under review", "registration documents checked", 100)] }, flag: null },
            "sample-company-2": { verification: { status: "Under review", notes: "SAMPLE: waiting for website ownership proof.", history: [h("Under review", "Unverified", "waiting for website ownership proof", 40)] }, flag: null },
            "sample-company-3": { verification: { status: "Verified", notes: "SAMPLE: verified partner.", history: [h("Verified", "Unverified", "verified partner", 190)] }, flag: { reason: "SAMPLE: unpaid internship wording needs review.", at: at(3) }, flagHistory: [{ at: at(3), text: "Flagged for review — SAMPLE: unpaid internship wording needs review." }] },
            "sample-company-4": { verification: { status: "Unverified", notes: "", history: [] }, flag: null },
            "sample-company-5": { verification: { status: "Suspended", notes: "SAMPLE: repeated reports of no-show interviews.", history: [h("Verified", "Unverified", "documents checked", 280), h("Suspended", "Verified", "repeated reports of no-show interviews", 20)] }, flag: null },
            "sample-company-6": { verification: { status: "Unverified", notes: "", history: [] }, flag: null }
        };
    }
    function adminSampleStatus() { adminSession(); const d = readDirectory(); return { loaded: d.samples.length > 0, companies: d.samples.length }; }
    function adminLoadSample() {
        adminSession();
        const d = readDirectory(), now = Date.now(), records = sampleRecords(now);
        let added = 0;
        for (const s of sampleCompanies(now)) {
            if (d.samples.some(x => x.id === s.id)) continue;
            d.samples.push(s); if (!d.records[s.id]) d.records[s.id] = records[s.id]; added++;
        }
        if (added) writeDirectory(d);
        return added;
    }
    function adminRemoveSample() {
        adminSession();
        const d = readDirectory(), ids = d.samples.map(s => s.id);
        d.samples = []; ids.forEach(id => { delete d.records[id]; });
        writeDirectory(d);
        return ids.length;
    }

    // Public API
    window.companyStore = {
        admin: Object.freeze({ companies: adminCompanies, summary: adminSummary, filter: adminFilter, setVerification: adminSetVerification, restore: adminRestore, flag: adminFlag, sampleStatus: adminSampleStatus, loadSample: adminLoadSample, removeSample: adminRemoveSample, VERIFICATION, FUNNEL, key: DIRECTORY_KEY }),
        // Counts only: the admin directory shows how many published talent profiles the company opened.
        recordTalentView() {
            const data = readStore(); requireCompany(data);
            data.talentViews = (Number.isInteger(data.talentViews) ? data.talentViews : 0) + 1; writeStore(data); return data.talentViews;
        },
        getAdminSnapshot() {
            if (!window.peerMentoringStore) throw new Error("Admin sign in is required.");
            window.peerMentoringStore.admin();
            if (localStorage.getItem(STORE_KEY) === null) return null;
            const data = readStore();
            if (!data.opportunities.every(item => item && typeof item.id === "string" && typeof item.title === "string" && typeof item.status === "string")) throw new Error("Saved company opportunities could not be read. Existing records were kept.");
            const profile = Object.fromEntries(["name", "email", "industry", "phone", "website", "location", "size", "about"].map(field => [field, typeof data.profile[field] === "string" ? data.profile[field] : ""]));
            const opportunities = data.opportunities.map(item => ({
                id: item.id, title: item.title, type: item.type || "Opportunity", status: item.status,
                ...Object.fromEntries(["department", "location", "duration", "stipend", "description", "postedAt"].map(field => [field, typeof item[field] === "string" ? item[field] : ""])),
                skillsRequired: Array.isArray(item.skillsRequired) ? item.skillsRequired.filter(skill => typeof skill === "string") : [],
                connectedApplications: data.applications.filter(application => application.linkedStudent === true && application.opportunityId === item.id).length
            }));
            return { profile, sample: profile.email.toLowerCase() === "company@example.com", opportunities, applications: data.applications.length, connectedApplications: data.applications.filter(item => item.linkedStudent === true).length };
        },
        // --- Session Management ---
        getCompanySession() {
            try {
                const raw = localStorage.getItem(SESSION_KEY);
                return raw ? JSON.parse(raw) : null;
            } catch {
                return null;
            }
        },

        setCompanySession(account) {
            try {
                localStorage.setItem(SESSION_KEY, JSON.stringify({
                    email: account.email.toLowerCase().trim(),
                    name: account.name || "CloudPeak Innovations",
                    role: "company",
                    isDemo: true,
                    loginTime: new Date().toISOString()
                }));
                return true;
            } catch {
                return false;
            }
        },

        logoutCompany() {
            try {
                localStorage.removeItem(SESSION_KEY);
                return true;
            } catch {
                return false;
            }
        },

        // --- Profile Management ---
        getProfile() {
            return readStore().profile;
        },

        hasConnectedRecords() {
            const data = readStore();
            return data.applications.some(a => a.linkedStudent) || data.messages.some(m => m.linkedStudent);
        },

        updateProfile(updatedFields) {
            const store = readStore();
            if (updatedFields.name !== undefined && !updatedFields.name.trim()) throw new Error("Enter a company name.");
            store.profile = { ...store.profile, ...updatedFields };
            writeStore(store);
            return store.profile;
        },

        // --- Opportunities (Internships & Freelance Projects) ---
        getOpportunities() {
            return readStore().opportunities || [];
        },

        addOpportunity(data) {
            const store = readStore(); assertNotSuspended(store);
            if (!data.title?.trim() || !data.description?.trim()) throw new Error("Enter an opportunity title and description.");
            const newOpp = {
                id: "opp-" + Date.now().toString(36),
                title: data.title.trim(),
                type: data.type || "Virtual Internship",
                department: data.department || "Engineering",
                location: data.location || "Remote",
                duration: data.duration || "3 Months",
                stipend: data.stipend || "$300 / month",
                status: "Active",
                applicantsCount: 0,
                skillsRequired: Array.isArray(data.skillsRequired) ? data.skillsRequired : [data.skillsRequired],
                description: data.description.trim(),
                postedAt: new Date().toISOString()
            };
            store.opportunities.unshift(newOpp);
            writeStore(store);
            return newOpp;
        },

        updateOpportunity(id, fields) {
            const store = readStore();
            // A suspended company may still close or pause a listing, but cannot edit or (re)publish one.
            const closingOnly = fields && Object.keys(fields).length === 1 && typeof fields.status === "string" && fields.status !== "Active";
            if (!closingOnly) assertNotSuspended(store);
            const index = store.opportunities.findIndex(o => o.id === id);
            if (index === -1) return null;
            store.opportunities[index] = { ...store.opportunities[index], ...fields };
            writeStore(store);
            return store.opportunities[index];
        },

        deleteOpportunity(id) {
            const store = readStore();
            store.opportunities = store.opportunities.filter(o => o.id !== id);
            writeStore(store);
            return true;
        },

        // --- Student Talent Pool ---
        getTalentPool() {
            return [...readStore().talentPool, ...(window.platformStore?.publishedTalent() || [])];
        },

        // --- Applications Management ---
        getApplications() {
            const data = readStore(); let authorized = true;
            try { requireCompany(data); } catch { authorized = false; }
            return data.applications.filter(a => !a.linkedStudent || authorized);
        },

        applyToOpportunity(opportunityId, coverNote, expectedOwner) {
            const account = window.platformStore.student(expectedOwner), data = readStore();
            const opportunity = data.opportunities.find(o => o.id === opportunityId && o.status === "Active");
            if (!opportunity) throw new Error("This opportunity is no longer open. Refresh the list.");
            try { assertNotSuspended(data); } catch { throw new Error("Applications to this company are paused while an administrator reviews it."); }
            if (typeof coverNote !== "string" || !coverNote.trim() || coverNote.length > 3000) throw new Error("Enter an application note of up to 3000 characters.");
            const email = account.email.trim().toLowerCase();
            if (data.applications.some(a => a.linkedStudent && a.studentEmail.toLowerCase() === email && a.opportunityId === opportunityId)) throw new Error("You already applied to this opportunity. Check My applications.");
            const application = {id: "app-" + crypto.randomUUID(), opportunityId, opportunityTitle: opportunity.title, opportunityDescription: opportunity.description, companyEmail: data.profile.email.toLowerCase(), companyName: data.profile.name, studentEmail: email, studentName: account.name, studentInitials: account.name.split(/\s+/).slice(0,2).map(s => Array.from(s)[0]).join("").toUpperCase(), major: "Local student account", university: "Not shared", gpa: "Not shared", coverNote: coverNote.trim(), status: "Under Review", appliedAt: new Date().toISOString(), linkedStudent: true, training: {tasks: {plan: "To Do", build: "To Do", test: "To Do", deliver: "To Do"}, submission: null, review: null}};
            data.applications.push(application); opportunity.applicantsCount = (opportunity.applicantsCount || 0) + 1; writeStore(data); return application;
        },

        getStudentApplications(expectedOwner) {
            const account = window.platformStore.student(expectedOwner);
            return readStore().applications.filter(a => a.linkedStudent && a.studentEmail.toLowerCase() === account.email.trim().toLowerCase());
        },

        updateStudentTraining(id, patch, expectedSnapshot, expectedOwner) {
            const account = window.platformStore.student(expectedOwner), data = readStore();
            const application = data.applications.find(a => a.id === id && a.linkedStudent && a.studentEmail.toLowerCase() === account.email.trim().toLowerCase());
            if (!application || application.status !== "Accepted") throw new Error("Training is available after the company accepts your application.");
            if (JSON.stringify(application.training) !== expectedSnapshot) throw new Error("This training changed. Reload before saving.");
            if (application.training.review?.status === "Completed") throw new Error("The company already completed its review. Training is read-only.");
            const next = {...application.training};
            if (patch.tasks) {
                if (!["plan","build","test","deliver"].every(id => ["To Do","In Progress","Done"].includes(patch.tasks[id]))) throw new Error("Choose a valid task status.");
                next.tasks = {...patch.tasks};
            }
            if (patch.submission) {
                const url = window.platformStore.repository(patch.submission.url);
                if (!url || typeof patch.submission.notes !== "string" || patch.submission.notes.length > 3000 || !Object.values(next.tasks).every(s => s === "Done")) throw new Error("Complete the task board and enter a valid GitHub repository with notes up to 3000 characters.");
                next.submission = {url, notes: patch.submission.notes.trim(), submittedAt: new Date().toISOString()}; next.review = null;
            }
            application.training = next; writeStore(data); return application;
        },

        reviewStudentTraining(id, status, expectedSnapshot) {
            const data = readStore(), application = data.applications.find(a => a.id === id && a.linkedStudent);
            const company = this.getCompanySession();
            if (!company || company.email.toLowerCase() !== data.profile.email.toLowerCase()) throw new Error("Sign in to the company account to review training.");
            if (!application || application.status !== "Accepted" || !application.training?.submission || !["Completed", "Changes requested"].includes(status)) throw new Error("A submitted accepted training project is required.");
            if (JSON.stringify(application.training) !== expectedSnapshot) throw new Error("The submission changed. Reload before reviewing.");
            if (application.training.review?.status === "Completed") throw new Error("This training review is already complete.");
            application.training.review = {status, reviewedAt: new Date().toISOString()}; writeStore(data); return application;
        },

        updateApplicationStatus(id, newStatus, extraData = {}) {
            const store = readStore();
            const index = store.applications.findIndex(a => a.id === id);
            if (index === -1) return null;
            const previousStatus = store.applications[index].status;
            if (store.applications[index].linkedStudent) requireCompany(store);
            if (previousStatus === newStatus) return store.applications[index];
            const transitions = { "Under Review": ["Interview Scheduled", "Accepted", "Declined"], "Interview Scheduled": ["Accepted", "Declined"], Accepted: [], Declined: [] };
            if (!transitions[previousStatus]?.includes(newStatus)) throw new Error("This application changed. Reload before updating its status.");
            if (extraData.meetingLink) {
                let url;
                try { url = new URL(extraData.meetingLink); } catch { throw new Error("Enter a valid HTTPS meeting link."); }
                if (url.protocol !== "https:") throw new Error("Enter a valid HTTPS meeting link.");
            }
            store.applications[index].status = newStatus;
            if (extraData.interviewDate) store.applications[index].interviewDate = extraData.interviewDate;
            if (extraData.meetingLink) store.applications[index].meetingLink = extraData.meetingLink;
            store.applications[index].updatedAt = new Date().toISOString();
            writeStore(store);
            return store.applications[index];
        },

        // --- Candidate Messages & Interviews ---
        getMessages() {
            const data = readStore(); let authorized = true;
            try { requireCompany(data); } catch { authorized = false; }
            return data.messages.filter(m => !m.linkedStudent || authorized);
        },

        getStudentMessages(expectedOwner) {
            const account = window.platformStore.student(expectedOwner);
            return readStore().messages.filter(m => m.studentEmail.toLowerCase() === account.email.trim().toLowerCase());
        },

        openConversation(studentEmail) {
            const data = readStore(); requireCompany(data); assertNotSuspended(data);
            const thread = conversation(data, studentEmail, "Student candidate");
            writeStore(data); return thread;
        },

        sendStudentMessage(text, expectedOwner) {
            const account = window.platformStore.student(expectedOwner), data = readStore();
            if (typeof text !== "string" || !text.trim() || text.length > 3000) throw new Error("Enter a message of up to 3000 characters.");
            const conversation = data.messages.find(m => m.studentEmail.toLowerCase() === account.email.trim().toLowerCase());
            if (!conversation) throw new Error("No company conversation is available yet. Wait for a company message or invitation.");
            conversation.thread.push({sender: "student", text: text.trim(), time: new Date().toISOString()}); conversation.lastUpdated = new Date().toISOString(); writeStore(data);
        },

        sendMessage(studentEmail, studentName, text) {
            const store = readStore(); assertNotSuspended(store);
            if (!studentEmail?.trim() || !studentName?.trim() || !text?.trim()) throw new Error("Choose a candidate and enter a message.");
            if (text.length > 3000) throw new Error("Use up to 3000 characters for a message.");
            const threadObj = conversation(store, studentEmail, studentName);
            threadObj.thread.push({
                sender: "company",
                text: text.trim(),
                time: new Date().toISOString()
            });
            threadObj.lastUpdated = new Date().toISOString();
            writeStore(store);
            return threadObj;
        },

        // Reset to initial demo state
        resetToDefault() {
            writeStore(defaultInitialData);
            return defaultInitialData;
        }
    };
})();
