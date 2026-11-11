/* Honest local recovery: nobody can be emailed, so the only option is to reset this browser's account
   after an explicit typed confirmation. Never touches other accounts. */
(() => {
    "use strict";
    const form = document.getElementById("recovery-form");
    if (!form) return;
    const message = document.getElementById("recovery-message");
    const email = document.getElementById("recovery-email");
    const confirm = document.getElementById("recovery-confirm");
    const phrase = document.getElementById("recovery-phrase");
    const next = document.getElementById("recovery-next");
    const submit = form.querySelector('button[type="submit"]');

    function say(text, error = false) { message.textContent = text; message.classList.toggle("is-error", error); }
    function updatePhrase() {
        const value = email.value.trim().toLowerCase();
        phrase.textContent = window.studentAccount.resetPhrase(value || "your-email");
    }
    email.addEventListener("input", () => { updatePhrase(); say(""); });
    confirm.addEventListener("input", () => say(""));
    updatePhrase();

    form.addEventListener("submit", async event => {
        event.preventDefault();
        if (submit.disabled) return;
        next.replaceChildren();
        const value = email.value.trim();
        if (!value || email.validity.typeMismatch) { say("Enter the email of the local account.", true); email.focus(); return; }
        if (confirm.value.trim() !== window.studentAccount.resetPhrase(value)) {
            say(`Type ${window.studentAccount.resetPhrase(value)} exactly to confirm. Nothing was changed.`, true);
            confirm.focus();
            return;
        }
        submit.disabled = true;
        try {
            const result = await window.studentAccount.resetLocalAccount(value, confirm.value);
            form.reset();
            updatePhrase();
            say(`The local account ${result.email} was removed from this browser with ${result.removedRecords} saved learning record(s). Other accounts were not changed.`);
            const link = document.createElement("a");
            link.className = "button button-outline";
            link.href = "../auth/signup.html";
            link.textContent = "Create the account again";
            next.append(link);
        } catch (error) {
            say(error.message, true);
        } finally {
            submit.disabled = false;
        }
    });
})();
