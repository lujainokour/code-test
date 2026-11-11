/* Persist the demo profile and its learning records; no passwords are stored. */
(() => {
    "use strict";
    const sessionKey = "codementor-demo-session";
    const profileKey = "codementor-profile-v1";
    function profile() {
        const saved = localStorage.getItem(profileKey);
        if (saved !== null) {
            let account;
            try { account = JSON.parse(saved); } catch { /* Return malformed data unchanged for the caller to report. */ }
            if (account?.role === "student") window.platformStore?.assertAccess(account.email);
            sessionStorage.removeItem(sessionKey);
            return saved;
        }
        const legacy = sessionStorage.getItem(sessionKey);
        if (legacy !== null) {
            let account;
            try { account = JSON.parse(legacy); } catch { /* Preserve unreadable legacy values. */ }
            if (account?.role === "student") window.platformStore?.assertAccess(account.email);
            localStorage.setItem(profileKey, legacy);
            sessionStorage.removeItem(sessionKey);
        }
        return legacy;
    }
    const persistent = key => ["codementor-demo-language", "codementor-demo-language-notifications", "codementor-demo-learning", "codementor-demo-onboarding", "codementor-demo-placement", "codementor-demo-subscription"].includes(key) || key.startsWith("codementor-demo-code-");
    const languageScoped = key => ["codementor-demo-learning", "codementor-demo-placement"].includes(key) || key.startsWith("codementor-demo-code-");
    const shared = key => ["codementor-demo-peer-bookings", "codementor-demo-service-requests", "codementor-demo-service-drafts"].includes(key);
    function sharedRecords(key) {
        const saved = localStorage.getItem(key), legacy = sessionStorage.getItem(key);
        if (legacy === null) return saved;
        const parse = raw => {
            const value = JSON.parse(raw);
            if (value?.version !== 1 || !Array.isArray(value.records)) throw new Error("Existing service records could not be migrated. They were kept.");
            return value;
        };
        const incoming = parse(legacy), existing = saved === null ? { version: 1, records: [] } : parse(saved);
        const records = [...existing.records];
        for (const record of incoming.records) {
            const prior = records.find(item => item.id === record.id);
            if (!prior) records.push(record);
        }
        const merged = JSON.stringify({ ...existing, records });
        localStorage.setItem(key, merged);
        sessionStorage.removeItem(key);
        return merged;
    }
    function owner() {
        const raw = profile();
        if (!raw) return "guest";
        const account = JSON.parse(raw);
        if (typeof account.email !== "string" || !account.email.trim()) throw new Error("Learning account unavailable");
        return account.email.trim().toLowerCase();
    }
    function ownerKey(key) { return `codementor-learning-v1:${encodeURIComponent(owner())}:${key}`; }
    function activeLanguage() {
        const selected = localStorage.getItem(ownerKey("codementor-demo-language"));
        if (selected !== null) {
            const id = JSON.parse(selected);
            if (typeof id !== "string" || !/^[a-z][a-z0-9-]*$/.test(id)) throw new Error("Saved language selection is invalid. Existing data was kept.");
            return id;
        }
        const legacyOwner = sessionStorage.getItem("codementor-legacy-learning-owner");
        const legacy = legacyOwner === null || legacyOwner === owner() ? sessionStorage.getItem("codementor-demo-onboarding") : null;
        const raw = localStorage.getItem(ownerKey("codementor-demo-onboarding")) || legacy;
        if (legacy !== null && legacyOwner === null) sessionStorage.setItem("codementor-legacy-learning-owner", owner());
        if (raw) { const preferences = JSON.parse(raw); if (typeof preferences?.language === "string") return preferences.language; }
        return "python";
    }
    // The original Python key is retained byte for byte. New languages get their own namespace.
    function storageKey(key) {
        const language = languageScoped(key) ? activeLanguage() : "python";
        return ownerKey(language === "python" ? key : `${language}:${key}`);
    }
    let pageLanguage;
    try { pageLanguage = activeLanguage(); } catch { /* Existing readers report unreadable preferences. */ }
    window.cmStorage = Object.freeze({
        activeLanguage,
        captureOwner: owner,
        assertOwner(expectedOwner) {
            if (owner() !== expectedOwner) throw new Error("Your account changed. Reload this page before saving. Existing records were kept.");
        },
        getItem(key) {
            if (key === sessionKey) return profile();
            if (shared(key)) return sharedRecords(key);
            if (!persistent(key)) return sessionStorage.getItem(key);
            const saved = localStorage.getItem(storageKey(key));
            if (saved !== null) return saved;
            if (languageScoped(key) && activeLanguage() !== "python") return null;
            // Import existing tab data only for the first owner of this legacy tab.
            const currentOwner = owner(), marker = "codementor-legacy-learning-owner";
            const previousOwner = sessionStorage.getItem(marker);
            if (previousOwner === null) sessionStorage.setItem(marker, currentOwner);
            if (previousOwner !== null && previousOwner !== currentOwner) return null;
            const legacy = sessionStorage.getItem(key);
            if (legacy !== null) localStorage.setItem(storageKey(key), legacy);
            return legacy;
        },
        setItem(key, value) {
            if (key === sessionKey) {
                let account;
                try { account = JSON.parse(String(value)); } catch { /* Preserve the storage facade's raw-value contract. */ }
                if (account?.role === "student" && account.isDemo === true && account.name?.trim() && account.email?.trim()) {
                    window.platformStore?.assertAccess(account.email);
                    window.platformStore?.registerStudent(account);
                }
                localStorage.setItem(profileKey, String(value));
                sessionStorage.removeItem(sessionKey);
                window.dispatchEvent(new CustomEvent("student-account-changed"));
                return;
            }
            if (shared(key)) {
                localStorage.setItem(key, String(value));
                sessionStorage.removeItem(key);
                window.dispatchEvent(new CustomEvent("service-store-changed", { detail: { key } }));
                return;
            }
            if (!persistent(key)) return sessionStorage.setItem(key, value);
            if (languageScoped(key) && pageLanguage !== activeLanguage()) throw new Error("Your learning language changed. Reload before saving. Existing progress was kept.");
            localStorage.setItem(storageKey(key), String(value));
            window.dispatchEvent(new CustomEvent("learning-progress-changed", { detail: { key } }));
        },
        removeItem(key) {
            if (key === sessionKey) {
                sessionStorage.removeItem(sessionKey);
                localStorage.removeItem(profileKey);
                window.dispatchEvent(new CustomEvent("student-account-changed"));
                return;
            }
            if (shared(key)) { localStorage.removeItem(key); sessionStorage.removeItem(key); return; }
            if (!persistent(key)) return sessionStorage.removeItem(key);
            if (languageScoped(key) && pageLanguage !== activeLanguage()) throw new Error("Your learning language changed. Reload before changing progress.");
            localStorage.removeItem(storageKey(key));
            if ((!languageScoped(key) || activeLanguage() === "python") && sessionStorage.getItem("codementor-legacy-learning-owner") === owner()) sessionStorage.removeItem(key);
        }
    });
})();
