/* Browser-local student accounts; never a substitute for server authentication. */
(() => {
    "use strict";
    const key = "codementor-student-accounts-v1", iterations = 210000;
    const hex = value => Array.from(new Uint8Array(value), byte => byte.toString(16).padStart(2, "0")).join("");
    function read() {
        const raw = localStorage.getItem(key); if (raw === null) return { version: 1, accounts: [] };
        let data; try { data = JSON.parse(raw); } catch { throw Error("Saved student accounts could not be read. Existing data was kept."); }
        if (data?.version !== 1 || !Array.isArray(data.accounts) || !data.accounts.every(a => typeof a.email === "string" && a.email === a.email.trim().toLowerCase() && typeof a.name === "string" && a.name.trim() && a.role === "student" && a.isDemo === true && /^[a-f0-9]{32}$/.test(a.credential?.salt) && /^[a-f0-9]{64}$/.test(a.credential?.hash)) || new Set(data.accounts.map(a => a.email)).size !== data.accounts.length) throw Error("Saved student accounts are invalid. Existing data was kept.");
        return data;
    }
    async function derive(password, salt) {
        if (!crypto.subtle) throw Error("Local accounts require localhost or HTTPS.");
        const material = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
        return hex(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: Uint8Array.from(salt.match(/../g), value => parseInt(value, 16)), iterations }, material, 256));
    }
    const publicProfile = account => { const { credential, ...profile } = account; return profile; };
    async function register(profile, password) {
        if (typeof password !== "string" || password.length < 12 || password.length > 256) throw Error("Use a password between 12 and 256 characters.");
        if (!profile || typeof profile.name !== "string" || !profile.name.trim() || profile.name.length > 160 || typeof profile.email !== "string" || profile.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email.trim()) || !Number.isInteger(profile.age) || profile.age < 1 || profile.age > 120) throw Error("Enter a valid name, email and age.");
        const email = profile.email.trim().toLowerCase();
        if (email === "student@example.com" || email === "admin@example.com") throw Error("Use your own email address. Sample account addresses are reserved.");
        read(); const salt = hex(crypto.getRandomValues(new Uint8Array(16))), hash = await derive(password, salt);
        if (!navigator.locks?.request) throw Error("A supported browser on localhost or HTTPS is required to save an account safely.");
        return navigator.locks.request(key, async () => {
            const data = read(); if (data.accounts.some(a => a.email === email)) throw Error("This student account already exists in this browser. Sign in instead.");
            const account = { name: profile.name, email, age: profile.age, role: "student", isDemo: true, credential: { salt, hash } };
            data.accounts.push(account); localStorage.setItem(key, JSON.stringify(data)); return publicProfile(account);
        });
    }
    async function authenticate(email, password) {
        const account = read().accounts.find(a => a.email === email.trim().toLowerCase());
        if (!account || await derive(password, account.credential.salt) !== account.credential.hash) throw Error("Email or password is incorrect. Use an account created in this browser or the sample details.");
        return publicProfile(account);
    }
    const reserved = email => email === "student@example.com" || email === "admin@example.com";
    const normal = email => typeof email === "string" ? email.trim().toLowerCase() : "";
    // Changing a password keeps every learning record: data is keyed by email, which never changes here.
    // `stillCurrent` is called inside the lock right before writing; it must throw if the signed-in
    // account changed while the (slow) key derivation was running.
    async function changePassword(email, currentPassword, newPassword, stillCurrent = () => {}) {
        email = normal(email);
        if (reserved(email)) throw Error("The sample account's password is shown on the login page and cannot be changed.");
        if (typeof newPassword !== "string" || newPassword.length < 12 || newPassword.length > 256 || !newPassword.trim()) throw Error("Use a new password between 12 and 256 characters.");
        if (newPassword === currentPassword) throw Error("Choose a password different from your current one.");
        const before = read().accounts.find(a => a.email === email);
        if (!before) throw Error("No local account with this email exists in this browser.");
        if (typeof currentPassword !== "string" || await derive(currentPassword, before.credential.salt) !== before.credential.hash) throw Error("Your current password is incorrect. Nothing was changed.");
        const salt = hex(crypto.getRandomValues(new Uint8Array(16))), hash = await derive(newPassword, salt);
        if (!navigator.locks?.request) throw Error("A supported browser on localhost or HTTPS is required to change a password safely.");
        return navigator.locks.request(key, async () => {
            stillCurrent();
            const data = read(), account = data.accounts.find(a => a.email === email);
            if (!account || account.credential.hash !== before.credential.hash || account.credential.salt !== before.credential.salt) throw Error("This account changed in another tab. Nothing was changed; try again.");
            account.credential = { salt, hash };
            localStorage.setItem(key, JSON.stringify(data));
            return publicProfile(account);
        });
    }
    const resetPhrase = email => "RESET " + normal(email);
    // Local-only "recovery": nobody can be emailed, so the honest option is to remove this one
    // browser account (sign-in record + its learning records) after a typed confirmation.
    async function resetLocalAccount(email, typedConfirmation) {
        email = normal(email);
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw Error("Enter the email of the local account.");
        if (reserved(email)) throw Error("The sample account cannot be reset. Its details are shown on the login page.");
        if (typeof typedConfirmation !== "string" || typedConfirmation.trim() !== resetPhrase(email)) throw Error(`Type ${resetPhrase(email)} exactly to confirm. Nothing was changed.`);
        if (!navigator.locks?.request) throw Error("A supported browser on localhost or HTTPS is required to reset safely.");
        return navigator.locks.request(key, async () => {
            const data = read(), index = data.accounts.findIndex(a => a.email === email);
            if (index < 0) throw Error("No local account with this email exists in this browser. Nothing was changed.");
            data.accounts.splice(index, 1);
            const prefix = `codementor-learning-v1:${encodeURIComponent(email)}:`, removed = [];
            for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith(prefix)) removed.push(k); }
            localStorage.setItem(key, JSON.stringify(data));
            removed.forEach(k => localStorage.removeItem(k));
            const active = localStorage.getItem("codementor-profile-v1");
            try { if (active && normal(JSON.parse(active).email) === email) localStorage.removeItem("codementor-profile-v1"); } catch { /* Keep unreadable profile data. */ }
            return { email, removedRecords: removed.length };
        });
    }
    window.studentAccount = Object.freeze({ register, authenticate, changePassword, resetLocalAccount, resetPhrase });
})();
