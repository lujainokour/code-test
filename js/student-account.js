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
        return navigator.locks.request(key, () => {
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
    window.studentAccount = Object.freeze({ register, authenticate });
})();
