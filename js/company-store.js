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

    // Public API
    window.companyStore = {
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
            const store = readStore();
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
            const data = readStore(); requireCompany(data);
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
            const store = readStore();
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
