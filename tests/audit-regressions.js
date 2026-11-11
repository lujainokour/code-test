/* Explicit opt-in: run only in a disposable browser profile. */
(async () => {
    if (new URLSearchParams(location.search).get("run") !== "disposable-profile") return;
    const frame = document.getElementById("subject"), output = document.getElementById("results"), checks = [];
    let win, doc;
    const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
    function check(name, value) { checks.push({name, passed: Boolean(value)}); output.textContent = JSON.stringify({passed: checks.filter(c => c.passed).length, total: checks.length, checks}, null, 2); }
    async function load(route) {
        await new Promise((resolve, reject) => { const timer = setTimeout(() => reject(new Error(route)), 8000); frame.onload = () => { clearTimeout(timer); resolve(); }; frame.src = new URL("../" + route, location.href); });
        await wait(40); win = frame.contentWindow; doc = win.document;
    }
    function fill(id, value) { doc.getElementById(id).value = value; }
    function submit(id) { doc.getElementById(id).dispatchEvent(new win.Event("submit", {bubbles: true, cancelable: true})); }
    function throws(action) { try { action(); return false; } catch { return true; } }
    async function settled() { for (let n=0; n<100; n++) { await wait(50); if (!frame.contentWindow.document.getElementById("login-submit")?.disabled && !frame.contentWindow.document.getElementById("signup-submit")?.disabled) break; } win=frame.contentWindow; doc=win.document; }
    const payload = '<img src="/audit-missing-image" onerror="window.__auditExecuted=true">';
    // CloudPeak demo data exists only after an administrator loads the SAMPLE company workspace.
    async function loadSampleCompany(){await load("pages/auth/company-login.html");const had=win.sessionStorage.getItem("codementor-admin-session");win.sessionStorage.setItem("codementor-admin-session",JSON.stringify({role:"admin",isDemo:true,signedInAt:Date.now()}));try{win.companyStore.admin.loadSampleCompany();}finally{if(had===null)win.sessionStorage.removeItem("codementor-admin-session");}}
    try {
        testStorage.clear(); await loadSampleCompany();
        await load("pages/company/company-messages.html");
        fill("company-chat-input", payload); submit("company-chat-form"); await wait(60);
        check("New company message appears immediately as text", doc.getElementById("company-chat-messages").textContent.includes(payload) && !doc.querySelector('#company-chat-messages img') && !win.__auditExecuted);
        await load("pages/company/company-messages.html");
        check("Saved message remains inert after reload", doc.getElementById("company-chat-messages").textContent.includes(payload) && !win.__auditExecuted);
        const company = win.companyStore;
        const before = localStorage.getItem("codementor-company-store-v1");
        const setItem = win.Storage.prototype.setItem;
        win.Storage.prototype.setItem = function(key, value) { if (key === "codementor-company-store-v1") throw new Error("blocked"); return setItem.call(this, key, value); };
        fill("company-chat-input", "Unsaved message"); submit("company-chat-form");
        check("Failed message write keeps input, old records and shows error", doc.getElementById("company-chat-input").value === "Unsaved message" && localStorage.getItem("codementor-company-store-v1") === before && doc.getElementById("workspace-action-error")?.textContent.includes("could not be saved"));
        win.Storage.prototype.setItem = setItem;
        for (const role of ["company"]) {
            testStorage.clear(); await load(`pages/${role}/${role}-profile.html`);
            const key = `codementor-${role}-store-v1`, store = win[role + "Store"];
            localStorage.setItem(key, "{broken");
            check(role + ": corrupt JSON cannot be overwritten", throws(() => store.updateProfile({name: "Changed"})) && localStorage.getItem(key) === "{broken");
            localStorage.setItem(key, JSON.stringify({profile: {name: "Invalid", email: "invalid@example.com"}}));
            const malformed = localStorage.getItem(key);
            check(role + ": invalid record shape is preserved", throws(() => store.updateProfile({name: "Changed"})) && localStorage.getItem(key) === malformed);
            localStorage.removeItem(key);
            const original = win.Storage.prototype.setItem;
            win.Storage.prototype.setItem = () => { throw new Error("blocked"); };
            check(role + ": storage failure is reported", throws(() => store.updateProfile({name: "Changed"})) && localStorage.getItem(key) === null);
            win.Storage.prototype.setItem = original;
        }
        testStorage.clear(); await loadSampleCompany();
        sessionStorage.setItem("codementor-admin-session", JSON.stringify({role:"admin",isDemo:true,signedInAt:Date.now()}));
        await load("pages/admin/admin-sessions.html");
        const sessions = win.adminSessionsStore;
        const created = await sessions.addSession({title:payload,description:"A session with an inert text title.",subject:"Python Programming",duration:60,price:0});
        await load("pages/admin/admin-sessions.html");
        check("Admin session title renders as inert text", doc.body.textContent.includes(payload) && !win.__auditExecuted && !doc.querySelector('img[src="/audit-missing-image"]'));
        await win.adminSessionsStore.updateSchedule({...win.adminSessionsStore.getSchedule(), defaultRate:0});
        check("Admin can save a free default rate", win.adminSessionsStore.getSchedule().defaultRate===0);
        await win.adminSessionsStore.updateSession(created.id,{status:"Paused"});
        check("Paused platform session leaves the public catalogue", !win.adminSessionsStore.getPublicSessions().some(s=>s.sessionId===created.id));
        check("Retired teacher authentication APIs are unavailable", !win.teacherStore && !win.adminSessionsStore.setTeacherSession);
        await load("pages/company/company-applications.html");
        const application = win.companyStore.getApplications().find(a => a.status === "Under Review");
        win.companyStore.updateApplicationStatus(application.id, "Declined");
        await load("pages/company/company-applications.html");
        check("Declined application is never labelled accepted", doc.getElementById("app-" + application.id).textContent.includes("Declined") && !doc.getElementById("app-" + application.id).textContent.includes("Candidate Accepted"));
        const opportunity = win.companyStore.getOpportunities().find(o => o.status === "Active"); win.companyStore.updateOpportunity(opportunity.id, {status: "Paused"});
        await load("pages/company/company-dashboard.html");
        check("Company active posting count excludes paused opportunities", Number(doc.querySelector("#company-stat-grid .company-stat-num").textContent) === win.companyStore.getOpportunities().filter(o => o.status === "Active").length);
        testStorage.clear(); await load("pages/student/subscription.html");
        check("Guest plan changes are blocked by store and UI", doc.getElementById("subscription-upgrade").disabled && throws(() => win.subscriptionStore.activateDemoPremium()) && throws(() => win.subscriptionStore.returnToFree()));
        win.cmStorage.setItem("codementor-demo-session", JSON.stringify({name: "Plan Student", email: "plan@example.com", role: "student", isDemo: true}));
        check("Valid student can activate local Premium", win.subscriptionStore.activateDemoPremium().plan === "premium");
        await load("pages/student/subscription.html");
        win.cmStorage.setItem("codementor-demo-session", JSON.stringify({name: "Other Student", email: "other@example.com", role: "student", isDemo: true}));
        doc.getElementById("subscription-cancel").click();
        check("Stale plan form cannot change another student's plan", win.cmStorage.getItem("codementor-demo-subscription") === null && doc.getElementById("subscription-message").textContent.includes("account changed"));
        win.cmStorage.setItem("codementor-demo-subscription", "{broken");
        check("Changing a corrupt plan never replaces it", throws(() => win.subscriptionStore.returnToFree()) && win.cmStorage.getItem("codementor-demo-subscription") === "{broken");
        for (const role of ["company"]) {
            testStorage.clear(); await load(`pages/auth/${role}-login.html`);
            fill("email", role + "@example.com"); fill("password", "DemoCompany123!"); submit(role + "-login-form"); await settled();
            check(role + ": sample credentials are refused until an admin loads sample company data", localStorage.getItem(`codementor-${role}-session`) === null && doc.getElementById("login-message").textContent.includes("sample company data"));
            await loadSampleCompany(); await load(`pages/auth/${role}-login.html`);
            fill("email", role + "@example.com"); fill("password", "WRONG"); submit(role + "-login-form"); await settled();
            check(role + ": sample email with wrong password is rejected", localStorage.getItem(`codementor-${role}-session`) === null && doc.getElementById("login-message").classList.contains("is-error"));
            fill("password", "DemoCompany123!"); submit(role + "-login-form"); await settled();
            check(role + ": correct sample credentials work", !!localStorage.getItem(`codementor-${role}-session`) && win.location.pathname.endsWith(role + "-dashboard.html"));
            testStorage.clear(); await load(`pages/auth/${role}-signup.html`);
            fill("company-name", "Audit Account");
            fill("industry", "Software");
            fill("email", "bad-email"); fill("password", "a"); submit(role + "-signup-form"); await settled();
            check(role + ": invalid signup leaves records untouched", localStorage.getItem(`codementor-${role}-store-v1`) === null);
            fill("email", role + "-audit@example.com"); submit(role + "-signup-form"); await settled();
            check(role + ": short password is rejected", localStorage.getItem(`codementor-${role}-store-v1`) === null);
            fill("password", "AuditPassword123!"); submit(role + "-signup-form"); await settled();
            const saved = JSON.parse(localStorage.getItem(`codementor-${role}-store-v1`));
            check(role + ": registration saves verifier, never plaintext", saved?.profile.localCredential?.hash.length === 64 && !JSON.stringify(saved).includes("AuditPassword123!") && win.location.pathname.endsWith(role + "-dashboard.html"));
            localStorage.removeItem(`codementor-${role}-session`); await load(`pages/auth/${role}-login.html`);
            fill("email", role + "-audit@example.com"); fill("password", "WRONG"); submit(role + "-login-form"); await settled();
            check(role + ": registered account rejects wrong password", localStorage.getItem(`codementor-${role}-session`) === null);
            fill("password", "AuditPassword123!"); submit(role + "-login-form"); await settled();
            check(role + ": registered account can sign in again", !!localStorage.getItem(`codementor-${role}-session`) && win.location.pathname.endsWith(role + "-dashboard.html"));
            localStorage.removeItem(`codementor-${role}-session`); await load(`pages/auth/${role}-login.html`);
            const originalSet = win.Storage.prototype.setItem;
            win.Storage.prototype.setItem = function(key, value) { if (key === `codementor-${role}-session`) throw new Error("blocked"); return originalSet.call(this, key, value); };
            fill("email", role + "-audit@example.com"); fill("password", "AuditPassword123!"); submit(role + "-login-form"); await settled();
            check(role + ": failed session save stays on login with error", win.location.pathname.endsWith(role + "-login.html") && doc.getElementById("login-message").textContent.includes("could not be saved") && !doc.getElementById("login-submit").disabled);
            win.Storage.prototype.setItem = originalSet;
        }
    } catch (error) { check("Unexpected: " + error.message, false); }
    output.dataset.done = "true";
})();
