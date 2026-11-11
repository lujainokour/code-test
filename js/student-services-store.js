/* Shared version-1 readers and writers for owner-scoped local service records. */
(() => {
    "use strict";
    const languages = window.languageCatalog.names;
    const sessionKey = "codementor-demo-session";
    const keys = { booking: "codementor-demo-peer-bookings", request: "codementor-demo-service-requests", draft: "codementor-demo-service-drafts" };
    function session() {
        const raw = window.cmStorage.getItem(sessionKey);
        if (raw === null) throw new Error("Sign in to a student demo account before saving. Nothing has been sent.");
        let value;
        try { value = JSON.parse(raw); } catch { throw new Error("Saved account data could not be read. Your records have not been changed."); }
        if (!value || value.role !== "student" || value.isDemo !== true || typeof value.name !== "string" || !value.name.trim() || typeof value.email !== "string" || !value.email.trim()) {
            throw new Error("A valid student demo session is required. Your records have not been changed.");
        }
        return value;
    }
    function requestSession() {
        const company = window.companyStore?.getCompanySession?.();
        if (company && company.role === "company" && company.isDemo === true && typeof company.email === "string" && company.email.trim()) {
            return { role: "company", name: company.name || "Demo company", email: company.email.trim().toLowerCase() };
        }
        const student = session();
        return { role: "student", name: student.name, email: student.email.trim().toLowerCase() };
    }
    const text = (value, max) => typeof value === "string" && value.trim().length > 0 && value.length <= max;
    function validRecord(record, type) {
        if (!record || !text(record.id, 100) || !text(record.owner, 254) || !text(record.createdAt, 40) || !Number.isFinite(Date.parse(record.createdAt))) return false;
        if (type === "booking") return text(record.mentorId, 100) && text(record.slot, 100) && text(record.notes, 1000) && record.status === "local-simulation";
        if (type === "request") return text(record.serviceId, 100) && text(record.brief, 1200) && record.status === "local-simulation" && (record.workflowStatus === undefined || ["New", "In discussion", "Accepted", "Declined", "Completed"].includes(record.workflowStatus)) && (record.budget === undefined || (Number.isFinite(record.budget) && record.budget >= 0 && record.budget <= 10000)) && (record.targetDays === undefined || (Number.isInteger(record.targetDays) && record.targetDays >= 1 && record.targetDays <= 180)) && (record.recipientEmail === undefined || text(record.recipientEmail, 254));
        return text(record.title, 80) && text(record.description, 1000) && text(record.skills, 200) && languages.includes(record.language) && Number.isFinite(record.price) && record.price > 0 && record.price <= 10000 && Number.isInteger(record.days) && record.days >= 1 && record.days <= 180 && ["draft", "published"].includes(record.status) && (record.portfolioProject === undefined || record.portfolioProject === "" || text(record.portfolioProject, 180));
    }
    function readRecords(type) {
        const raw = window.cmStorage.getItem(keys[type]);
        if (raw === null) return { version: 1, records: [] };
        let value;
        try { value = JSON.parse(raw); } catch { throw new Error("Saved local records could not be read. They have not been changed."); }
        if (!value || value.version !== 1 || !Array.isArray(value.records) || !value.records.every(record => validRecord(record, type))) {
            throw new Error("Saved local records are invalid. They have not been changed.");
        }
        return value;
    }
    function save(type, values, expectedOwner) {
        const owner = (type === "request" ? requestSession() : session()).email.trim().toLowerCase();
        if (owner !== String(expectedOwner).trim().toLowerCase()) throw new Error("Your demo account changed. Reload this page before saving.");
        const store = readRecords(type);
        const record = { ...values, id: `local-${crypto.randomUUID()}`, owner, createdAt: new Date().toISOString() };
        if (!validRecord(record, type)) throw new Error("Check the form values. Nothing was saved.");
        if (type === "booking" && store.records.some(item => item.owner === owner && item.mentorId === record.mentorId && item.slot === record.slot)) throw new Error("This demo slot is already in your local requests. Choose another slot.");
        window.cmStorage.setItem(keys[type], JSON.stringify({ ...store, records: [...store.records, record] }));
        return record;
    }
    function ownRecords(type, expectedOwner) {
        let owner = (type === "request" ? requestSession() : session()).email.toLowerCase();
        if (type === "request" && expectedOwner && owner !== expectedOwner.toLowerCase()) {
            try {
                const student = session().email.trim().toLowerCase();
                if (student === expectedOwner.toLowerCase()) owner = student;
            } catch { /* A company session can still read its own outgoing requests. */ }
        }
        if (expectedOwner !== undefined && owner !== String(expectedOwner).trim().toLowerCase()) throw new Error("Your demo account changed. Reload before reading private records.");
        return readRecords(type).records.filter(record => record.owner === owner);
    }
    function updateDraftStatus(id, status, expectedOwner) {
        const owner = session().email.trim().toLowerCase();
        if (owner !== String(expectedOwner).trim().toLowerCase()) throw new Error("Your demo account changed. Reload before updating a listing.");
        if (!["draft", "published"].includes(status)) throw new Error("Choose a valid listing status.");
        const store = readRecords("draft");
        let found = false;
        const records = store.records.map(record => {
            if (record.id !== id || record.owner.trim().toLowerCase() !== owner) return record;
            found = true;
            return { ...record, status };
        });
        if (!found) throw new Error("This service draft could not be found.");
        window.cmStorage.setItem(keys.draft, JSON.stringify({ ...store, records }));
    }
    function incomingRequests(expectedProvider) {
        const owner = session().email.trim().toLowerCase();
        if (owner !== expectedProvider) throw new Error("Your demo account changed. Reload before reading incoming requests.");
        return readRecords("request").records.filter(record => record.recipientEmail === owner);
    }
    const requestTransitions = { New: ["In discussion", "Accepted", "Declined"], "In discussion": ["Accepted", "Declined"], Accepted: ["Completed"], Declined: [], Completed: [] };
    function updateRequestStatus(id, status, expectedProvider, expectedStatus) {
        const owner = session().email.trim().toLowerCase();
        if (owner !== expectedProvider) throw new Error("Your demo account changed. Reload before updating a request.");
        if (!["In discussion", "Accepted", "Declined", "Completed"].includes(status)) throw new Error("Choose a valid request status.");
        const store = readRecords("request");
        let found = false;
        const records = store.records.map(record => {
            if (record.id !== id || record.recipientEmail !== owner) return record;
            const current = record.workflowStatus || "New";
            if (expectedStatus !== undefined && current !== expectedStatus) throw new Error("This request changed. Refresh before updating its status.");
            if (!requestTransitions[current]?.includes(status)) throw new Error("This status change is not available for the current request.");
            found = true;
            return { ...record, workflowStatus: status, updatedAt: new Date().toISOString() };
        });
        if (!found) throw new Error("This incoming request could not be found.");
        window.cmStorage.setItem(keys.request, JSON.stringify({ ...store, records }));
    }
    function publishedDrafts() {
        return readRecords("draft").records.filter(record => record.status === "published").map(record => ({
            id: `published-${record.id}`, draftId: record.id, studentId: null, providerName: record.providerName || "Student provider", ownerEmail: record.owner,
            language: record.language, title: record.title, description: record.description, skills: record.skills.split(",").map(value => value.trim()).filter(Boolean),
            price: record.price, days: record.days, currency: "JOD", deliverables: record.deliverables || [], portfolioProject: record.portfolioProject || ""
        }));
    }
    window.studentServicesStore = Object.freeze({ session, requestSession, readRecords, ownRecords, save, updateDraftStatus, incomingRequests, updateRequestStatus, publishedDrafts, requestTransitions });
})();
