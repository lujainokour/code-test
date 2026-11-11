/* Shared local identities and explicitly published student profiles.
   This prototype store is not a substitute for server-side authorization. */
(() => {
    "use strict";
    const key = "codementor-platform-v1";
    const emailOf = value => String(value || "").trim().toLowerCase();
    const object = value => value && typeof value === "object" && !Array.isArray(value);
    function repository(value) {
        try {
            const url = new URL(value);
            return url.protocol === "https:" && ["github.com", "www.github.com"].includes(url.hostname) && !url.username && !url.password && !url.search && !url.hash && /^\/[\w-]+\/[\w.-]+\/?$/.test(url.pathname) ? url.href : null;
        } catch { return null; }
    }
    function read() {
        let value;
        try { const raw = localStorage.getItem(key); value = raw === null ? {version: 1, students: []} : JSON.parse(raw); }
        catch { throw new Error("Shared account records could not be read. Existing data was kept."); }
        const validProfile = p => p === null || (object(p) && typeof p.bio === "string" && Array.isArray(p.skills) && p.skills.every(x => typeof x === "string") && Array.isArray(p.projects) && p.projects.every(project => object(project) && typeof project.title === "string" && typeof project.description === "string" && repository(project.url)));
        const validStudent = s => object(s) && typeof s.id === "string" && typeof s.name === "string" && typeof s.email === "string" && s.email === emailOf(s.email) && s.email && Number.isFinite(Date.parse(s.createdAt)) && ["enabled", "suspended"].includes(s.status) && validProfile(s.publicProfile);
        if (!object(value) || value.version !== 1 || !Array.isArray(value.students) || !value.students.every(validStudent) || new Set(value.students.map(s => s.email)).size !== value.students.length || new Set(value.students.map(s => s.id)).size !== value.students.length) throw new Error("Shared account records are invalid. Existing data was kept.");
        return value;
    }
    function write(value) {
        try { localStorage.setItem(key, JSON.stringify(value)); }
        catch { throw new Error("Shared changes could not be saved. Browser storage is unavailable or full."); }
        window.dispatchEvent(new CustomEvent("platform-changed"));
    }
    function registerStudent(account) {
        if (!account || account.role !== "student" || account.isDemo !== true || typeof account.name !== "string" || !account.name.trim() || typeof account.email !== "string" || !account.email.trim()) throw new Error("A valid student profile is required.");
        const data = read(), email = emailOf(account.email), existing = data.students.find(s => s.email === email);
        if (existing) {
            if (existing.name !== account.name.trim() && existing.status === "enabled") { existing.name = account.name.trim(); write(data); }
            return existing;
        }
        const student = {id: "local-" + crypto.randomUUID(), name: account.name.trim(), email, status: "enabled", publicProfile: null, createdAt: new Date().toISOString()};
        data.students.push(student); write(data); return student;
    }
    function assertAccess(email) {
        const student = read().students.find(s => s.email === emailOf(email));
        if (student?.status === "suspended") throw new Error("This student account is suspended. Ask the administrator to restore access.");
    }
    function student(expectedOwner) {
        const raw = window.cmStorage.getItem("codementor-demo-session"), account = raw === null ? null : JSON.parse(raw);
        if (!account || account.role !== "student" || account.isDemo !== true || !account.email?.trim()) throw new Error("Sign in to a student account to continue.");
        if (expectedOwner !== undefined && emailOf(account.email) !== emailOf(expectedOwner)) throw new Error("Your student account changed. Reload before continuing.");
        assertAccess(account.email); return account;
    }
    function setStatus(id, status) {
        if (!["enabled", "suspended"].includes(status)) throw new Error("Choose a valid account status.");
        const data = read(), record = data.students.find(s => s.id === id);
        if (!record) throw new Error("Student account not found.");
        record.status = status; write(data);
    }
    function publish(profile, expectedOwner) {
        const account = student(expectedOwner), data = read(), record = data.students.find(s => s.email === emailOf(account.email));
        if (!record) throw new Error("Reload your profile before publishing.");
        if (!profile || typeof profile.bio !== "string" || profile.bio.trim().length > 1000 || !Array.isArray(profile.skills) || !profile.skills.length || profile.skills.length > 20 || profile.skills.some(s => typeof s !== "string" || !s.trim() || s.length > 80) || !Array.isArray(profile.projects) || !profile.projects.length || profile.projects.some(p => !p.title?.trim() || p.title.length > 120 || typeof p.description !== "string" || p.description.length > 1000 || !repository(p.url))) throw new Error("Add skills and a valid GitHub project before publishing.");
        const languageId = window.cmStorage.activeLanguage();
        if (!window.languageCatalog?.has(languageId)) throw new Error("Choose a valid learning language before publishing.");
        record.publicProfile = {languageId, bio: profile.bio.trim(), skills: profile.skills.map(s => s.trim()), projects: profile.projects.map(p => ({title: p.title.trim(), description: p.description, url: repository(p.url)})), publishedAt: new Date().toISOString()};
        write(data);
    }
    function unpublish(expectedOwner) {
        const account = student(expectedOwner), data = read(), record = data.students.find(s => s.email === emailOf(account.email));
        if (!record) return;
        record.publicProfile = null; write(data);
    }
    function publishedStudents() {
        return read().students.filter(s => s.status === "enabled" && s.publicProfile).map(s => ({id: s.id, name: s.name, initials: s.name.split(/\s+/).slice(0,2).map(w => Array.from(w)[0]).join("").toUpperCase(), bio: s.publicProfile.bio, skills: [...s.publicProfile.skills], languageId: s.publicProfile.languageId || null, language: window.languageCatalog?.get(s.publicProfile.languageId)?.name || "Not specified", learning: [window.languageCatalog?.get(s.publicProfile.languageId)?.name || "Self-reported profile"], projects: s.publicProfile.projects.map(p => ({...p})), links: s.publicProfile.projects.map(p => ({label: p.title, url: p.url})), localPublished: true}));
    }
    function publishedTalent() {
        return publishedStudents().map(s => ({...s, contactRef: s.id, major: "Student-published profile", university: "Not shared", graduationYear: "Not shared", preferredRole: "Open to opportunities", availability: "Published locally", gpa: "Not shared", topSkills: s.skills, portfolioProjects: s.projects.map(p => p.title)}));
    }
    window.platformStore = Object.freeze({registerStudent, assertAccess, student, setStatus, publish, unpublish, publishedStudents, publishedTalent, repository, getStudents: () => read().students.map(s => ({...s}))});
    try {
        const raw = localStorage.getItem("codementor-profile-v1") || sessionStorage.getItem("codementor-demo-session");
        if (raw) { const account = JSON.parse(raw); if (account?.role === "student" && account.isDemo === true && account.name?.trim() && account.email?.trim()) registerStudent(account); }
    } catch { /* Consumers show storage errors; never replace a damaged record. */ }
    function guard() {
        if (!/\/pages\/student\//.test(location.pathname)) return;
        let error = "";
        try { const raw = localStorage.getItem("codementor-profile-v1"); if (raw) assertAccess(JSON.parse(raw).email); }
        catch (cause) { error = cause.message; }
        const main = document.querySelector("main"); if (!main) return;
        let notice = document.getElementById("account-access-block");
        if (!error) { if (notice) notice.remove(); main.inert = false; main.hidden = false; return; }
        main.inert = true; main.hidden = true;
        if (!notice) { notice = document.createElement("section"); notice.id = "account-access-block"; notice.className = "services-panel"; notice.setAttribute("role", "alert"); main.before(notice); }
        notice.replaceChildren(); const h = document.createElement("h1"), p = document.createElement("p"), button = document.createElement("button"); h.textContent = "Student access unavailable"; p.textContent = error; button.className = "button button-outline"; button.textContent = "Sign out";
        button.onclick = () => { try { cmStorage.removeItem("codementor-demo-session"); location.href = "../auth/login.html"; } catch (cause) { p.textContent = cause.message; } }; notice.append(h,p,button);
    }
    window.addEventListener("storage", event => { if (event.key === key) guard(); });
    window.addEventListener("platform-changed", guard);
    window.addEventListener("pageshow", guard);
    document.addEventListener("DOMContentLoaded", guard);
})();
