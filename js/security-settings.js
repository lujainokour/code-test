/* Security & passkeys page (pages/auth/security.html). Works only with the CodeMentor AI server:
   every change is authorised and verified server-side; this script only renders state. */
(() => {
    "use strict";
    const auth = window.cmServerAuth;
    const $ = id => document.getElementById(id);
    const main = $("security-main"), message = $("security-message");
    const addButton = $("add-passkey"), addLabel = $("add-passkey-label");
    const list = $("passkey-list"), empty = $("passkey-empty");
    const dialog = $("reauth-dialog"), reauthForm = $("reauth-form"), reauthPassword = $("reauth-password"), reauthMessage = $("reauth-message");
    let passkeys = [], support = { supported: false }, busy = false;

    const say = (text, tone = "info") => { message.textContent = text; message.dataset.tone = tone; };
    const formatDate = value => value ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "Never";

    function setBusy(value) {
        busy = value;
        main.setAttribute("aria-busy", String(value));
        addButton.disabled = value || !support.supported;
        list.querySelectorAll("button, input").forEach(control => { control.disabled = value; });
    }

    // Ask for the password, then run `action` again once. Resolves with the action's result or null if cancelled.
    function confirmIdentity() {
        return new Promise(resolve => {
            reauthMessage.textContent = "";
            reauthPassword.value = "";
            const finish = ok => {
                reauthForm.removeEventListener("submit", onSubmit);
                $("reauth-cancel").removeEventListener("click", onCancel);
                dialog.removeEventListener("cancel", onCancel);
                reauthPassword.value = "";
                if (dialog.open) dialog.close();
                resolve(ok);
            };
            const onCancel = event => { event?.preventDefault(); finish(false); };
            const onSubmit = async event => {
                event.preventDefault();
                if (!reauthPassword.value) { reauthMessage.textContent = "Enter your password."; reauthMessage.dataset.tone = "error"; return; }
                $("reauth-submit").disabled = true;
                try {
                    await auth.api("auth/reauth", { method: "POST", body: { password: reauthPassword.value } });
                    finish(true);
                } catch (error) {
                    reauthMessage.textContent = error.message;
                    reauthMessage.dataset.tone = "error";
                    reauthPassword.select();
                } finally { $("reauth-submit").disabled = false; }
            };
            reauthForm.addEventListener("submit", onSubmit);
            $("reauth-cancel").addEventListener("click", onCancel);
            dialog.addEventListener("cancel", onCancel);
            dialog.showModal();
            reauthPassword.focus();
        });
    }
    async function withRecentAuth(action) {
        try { return await action(); }
        catch (error) {
            if (error.code !== "reauth_required") throw error;
            if (!(await confirmIdentity())) return null;
            return action();
        }
    }

    function render() {
        const count = passkeys.length;
        $("passkey-status").hidden = false;
        $("passkey-status").dataset.on = String(count > 0);
        $("passkey-status-title").textContent = count ? "Passkey sign-in is on" : "Passkey sign-in is off";
        $("passkey-status-text").textContent = count
            ? `${count} registered device${count === 1 ? "" : "s"}. Your password still works as a backup.`
            : "Sign in with your password, or turn on Face ID / passkey sign-in below.";
        addLabel.textContent = count ? "Register another device" : "Enable Face ID / Passkey";
        $("devices-card").hidden = false;
        empty.hidden = count > 0;
        list.replaceChildren(...passkeys.map(item));
        addButton.disabled = busy || !support.supported;
    }

    function item(passkey) {
        const li = document.createElement("li");
        li.className = "passkey-item";
        const icon = document.createElement("span");
        icon.className = "passkey-item-icon"; icon.setAttribute("aria-hidden", "true");
        icon.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="15" r="4"/><path d="M10.8 12.2 20 3"/><path d="m16 7 3 3"/><path d="m18 5 2 2"/></svg>';
        const body = document.createElement("div");
        const name = document.createElement("p"); name.className = "passkey-item-name"; name.textContent = passkey.deviceName;
        const meta = document.createElement("p"); meta.className = "passkey-item-meta";
        meta.textContent = `Added ${formatDate(passkey.createdAt)} · Last used ${formatDate(passkey.lastUsedAt)} · ${passkey.backupEligible ? "Synced passkey" : "Stays on this device"}`;
        body.append(name, meta);
        const actions = document.createElement("div"); actions.className = "passkey-item-actions";
        const rename = button("Rename", "pk-btn pk-btn-secondary pk-btn-small", () => startRename(li, passkey));
        rename.setAttribute("aria-label", `Rename ${passkey.deviceName}`);
        const remove = button("Remove", "pk-btn pk-btn-danger pk-btn-small", () => removePasskey(passkey));
        remove.setAttribute("aria-label", `Remove ${passkey.deviceName}`);
        actions.append(rename, remove);
        li.append(icon, body, actions);
        return li;
    }
    function button(text, className, onClick) {
        const node = document.createElement("button");
        node.type = "button"; node.className = className; node.textContent = text;
        node.addEventListener("click", onClick);
        return node;
    }

    function startRename(li, passkey) {
        const body = li.children[1];
        const form = document.createElement("form"); form.className = "passkey-rename";
        const label = document.createElement("label"); label.className = "visually-hidden sr-only"; label.textContent = "Device name";
        const input = document.createElement("input"); input.maxLength = 60; input.value = passkey.deviceName; input.required = true;
        input.id = `rename-${passkey.id}`; label.htmlFor = input.id;
        label.style.cssText = "position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)";
        const save = button("Save", "pk-btn pk-btn-primary pk-btn-small", () => {}); save.type = "submit";
        const cancel = button("Cancel", "pk-btn pk-btn-secondary pk-btn-small", () => render());
        form.append(label, input, save, cancel);
        form.addEventListener("submit", async event => {
            event.preventDefault();
            const value = input.value.trim();
            if (!value) { say("Enter a device name.", "error"); input.focus(); return; }
            setBusy(true);
            try {
                passkeys = (await auth.api(`passkeys/${passkey.id}`, { method: "PATCH", body: { deviceName: value } })).passkeys;
                render();
                say("Device renamed.", "success");
            } catch (error) { say(error.message, "error"); }
            finally { setBusy(false); }
        });
        body.replaceChildren(form);
        input.focus(); input.select();
    }

    async function removePasskey(passkey) {
        const last = passkeys.length === 1;
        const warning = last
            ? `Remove "${passkey.deviceName}"? It's your only passkey, so you'll sign in with your password from now on.`
            : `Remove "${passkey.deviceName}"? That device will no longer be able to sign in with a passkey.`;
        if (!window.confirm(warning)) return;
        setBusy(true);
        try {
            const result = await withRecentAuth(() => auth.api(`passkeys/${passkey.id}`, { method: "DELETE" }));
            if (!result) { say("Nothing was removed.", "info"); return; }
            passkeys = result.passkeys;
            render();
            say(last ? "Passkey removed. Your password is now your sign-in method." : "Passkey removed.", "success");
        } catch (error) { say(error.message, "error"); }
        finally { setBusy(false); }
    }

    addButton.addEventListener("click", async () => {
        if (busy || !support.supported) return;
        setBusy(true);
        say("Follow the prompt from your device: Face ID, Windows Hello, Touch ID or your device PIN.", "info");
        try {
            const result = await withRecentAuth(() => auth.registerPasskey(auth.guessDeviceName()));
            if (!result) { say("Passkey setup was cancelled. Nothing was saved.", "info"); return; }
            passkeys = result;
            render();
            say(`Passkey added for ${passkeys.at(-1).deviceName}. Next time, choose "Sign in with Face ID" on the sign-in page.`, "success");
        } catch (error) {
            say(error.message || "Passkey setup failed. Try again.", error.code === "cancelled" ? "info" : "error");
        } finally { setBusy(false); }
    });

    async function init() {
        if (!auth) { say("This page could not load. Reload and try again.", "error"); return; }
        const info = await auth.status();
        if (!info.server) {
            $("security-intro").textContent = "Passkeys and Face ID sign-in need the CodeMentor AI server. This copy of the site is running as static files, so accounts stay in this browser only.";
            say("To use passkeys, start the site with `npm start` (see docs/PASSKEYS.md).", "info");
            main.setAttribute("aria-busy", "false");
            return;
        }
        if (!info.user) {
            location.replace(new URL("login.html", location.href).href);
            return;
        }
        // The server session must belong to the account signed in on this browser; otherwise it is a
        // leftover from a local "Log out", so it is ended here.
        if (!window.cmAccess?.hasLocalIdentity(info.user.role)) {
            await auth.logout();
            location.replace(new URL(info.user.role === "admin" ? "admin-login.html" : info.user.role === "company" ? "company-login.html" : "login.html", location.href).href);
            return;
        }
        const back = $("security-back");
        const home = { student: "../student/dashboard.html", company: "../company/company-dashboard.html", admin: "../admin/admin-dashboard.html" }[info.user.role];
        if (home) back.href = home;
        if (info.user.role !== "student") $("change-password-link").hidden = true; // change-password.html is the student page
        $("security-actions").hidden = false;
        support = await auth.passkeySupport();
        if (!support.supported) {
            say(window.isSecureContext
                ? "This browser can't create passkeys. Try a current version of Chrome, Edge, Safari or Firefox, or add a passkey from another device."
                : "Passkeys need a secure (HTTPS) connection.", "error");
        } else if (!support.platform) {
            say("No built-in Face ID, Touch ID or Windows Hello was found on this device. You can still use a phone or security key.", "info");
        }
        try {
            passkeys = (await auth.api("passkeys")).passkeys;
            render();
        } catch (error) {
            say(error.code === "not_signed_in" ? "Your session has ended. Sign in again." : error.message, "error");
        } finally { main.setAttribute("aria-busy", "false"); }
    }
    init();
})();
