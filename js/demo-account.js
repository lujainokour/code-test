/* Local prototype credentials only. Real authorization requires a server. */
(() => {
    "use strict";
    const iterations = 210000;
    const bytes = value => Uint8Array.from(value.match(/.{2}/g) || [], part => parseInt(part, 16));
    const hex = value => Array.from(new Uint8Array(value), n => n.toString(16).padStart(2, "0")).join("");
    async function derive(password, salt) {
        if (!window.crypto?.subtle) throw new Error("Local password setup requires localhost or HTTPS.");
        const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
        return hex(await crypto.subtle.deriveBits({ name: "PBKDF2", salt: bytes(salt), iterations, hash: "SHA-256" }, key, 256));
    }
    function init(role) {
        if (role !== "company") throw new Error("This account role is no longer supported.");
        const store = window.companyStore;
        const demoEmail = role + "@example.com", demoPassword = "DemoCompany123!";
        const login = document.getElementById(role + "-login-form"), signup = document.getElementById(role + "-signup-form");
        const form = login || signup;
        if (!form) return;
        const email = document.getElementById("email"), password = document.getElementById("password");
        const button = document.getElementById(login ? "login-submit" : "signup-submit"), label = button.textContent;
        const message = document.getElementById(login ? "login-message" : "signup-message");
        let busy = false;
        function say(text, error = false) { message.textContent = text; message.classList.toggle("is-error", error); }
        function reset() { busy = false; button.disabled = false; button.textContent = label; }
        function session(profile) {
            const save = store.setCompanySession.bind(store);
            if (!save(profile)) throw new Error("Your local session could not be saved. Check browser storage and try again.");
        }
        document.getElementById("password-toggle")?.addEventListener("click", event => {
            const show = password.type === "password";
            password.type = show ? "text" : "password";
            event.currentTarget.textContent = show ? "Hide" : "Show";
            event.currentTarget.setAttribute("aria-pressed", String(show));
            event.currentTarget.setAttribute("aria-label", show ? "Hide password" : "Show password");
        });
        document.getElementById("fill-company-demo")?.addEventListener("click", () => {
            email.value = demoEmail; password.value = demoPassword;
            say("Sample details filled. Sign in to open the local preview.");
        });
        form.addEventListener("input", () => say(""));
        form.addEventListener("submit", async event => {
            event.preventDefault();
            if (busy) return;
            email.value = email.value.trim();
            if (!form.reportValidity()) { say("Complete the highlighted fields.", true); return; }
            const address = email.value.toLowerCase(), secret = password.value;
            if (!secret.trim()) { say("Enter a password.", true); password.focus(); return; }
            busy = true; button.disabled = true;
            button.textContent = login ? "Checking local account…" : "Saving local profile…";
            try {
                if (!store) throw new Error("The local account service could not load. Reload and try again.");
                let profile = store.getProfile();
                if (login) {
                    let valid = false;
                    if (profile.localCredential !== undefined) {
                        const credential = profile.localCredential;
                        if (!credential || credential.version !== 1 || credential.iterations !== iterations || !/^[0-9a-f]{32}$/.test(credential.salt) || !/^[0-9a-f]{64}$/.test(credential.hash)) throw new Error("Saved local credentials could not be read. They have not been changed.");
                        if (address === profile.email.trim().toLowerCase()) valid = await derive(secret, credential.salt) === credential.hash;
                    } else if (profile.email.trim().toLowerCase() === demoEmail) {
                        valid = address === demoEmail && secret === demoPassword;
                    } else if (address === profile.email.trim().toLowerCase()) {
                        throw new Error("This saved preview has no local password yet. Open registration with this same email to set one; your existing workspace records will be kept.");
                    }
                    if (!valid) throw new Error("Email or password is incorrect for the saved local account. Sample details work when the sample profile is active.");
                } else {
                    const nameInput = document.getElementById("company-name"), name = nameInput.value.trim();
                    if (name.length < 2 || !/\p{L}/u.test(name)) { nameInput.focus(); throw new Error("Enter a name containing at least two characters and a letter."); }
                    if (secret.length < 12) { password.focus(); throw new Error("Use at least 12 characters for your password."); }
                    const existing = profile.email.trim().toLowerCase();
                    if (existing !== address && store.hasConnectedRecords?.()) throw new Error("This company workspace already has connected student records. Sign in with its existing account; it cannot be replaced by another company.");
                    if (existing !== address && (existing !== demoEmail || profile.localCredential)) throw new Error("A different local profile is already saved for this workspace. Its records have been kept. Use its email to sign in.");
                    if (profile.localCredential) throw new Error("This local profile is already registered. Sign in with its existing password.");
                    const salt = hex(crypto.getRandomValues(new Uint8Array(16)));
                    const localCredential = { version: 1, iterations, salt, hash: await derive(secret, salt) };
                    let fields;
                        fields = { name, email: address, industry: document.getElementById("industry").value.trim(), website: document.getElementById("website").value.trim(), location: document.getElementById("location").value.trim(), size: document.getElementById("size").value };

                    profile = store.updateProfile({ ...fields, localCredential });
                }
                session(profile);
                password.value = "";
                location.href = `../${role}/${role}-dashboard.html`;
            } catch (error) { say(error.message || "The local account could not be opened.", true); reset(); }
        });
        window.addEventListener("pageshow", reset);
    }
    window.demoAccount = Object.freeze({ init });
})();
