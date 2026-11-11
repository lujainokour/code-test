/* Change the password of the local student account signed in on this browser. */
(() => {
    "use strict";
    const form = document.getElementById("change-password-form");
    const message = document.getElementById("password-message");
    const currentPassword = document.getElementById("current-password");
    const newPassword = document.getElementById("new-password");
    const confirmPassword = document.getElementById("confirm-password");
    const inputs = [currentPassword, newPassword, confirmPassword];
    const toggleButtons = form.querySelectorAll("[data-password-target]");
    const submit = form.querySelector('button[type="submit"]');

    // The account whose password is changed is the one signed in when this page opened.
    let owner = null;
    try { owner = window.cmStorage.captureOwner(); } catch { owner = null; }

    function say(text, error = false) {
        message.textContent = text;
        message.classList.toggle("is-error", error);
    }
    function clearError(input) {
        input.removeAttribute("aria-invalid");
        document.getElementById(`${input.id}-error`).textContent = "";
    }
    function showError(input, text) {
        input.setAttribute("aria-invalid", "true");
        document.getElementById(`${input.id}-error`).textContent = text;
    }
    function hidePasswords() {
        toggleButtons.forEach(button => {
            const input = document.getElementById(button.dataset.passwordTarget);
            input.type = "password";
            button.textContent = "Show";
            button.setAttribute("aria-pressed", "false");
            button.setAttribute("aria-label", button.dataset.showLabel);
        });
    }

    toggleButtons.forEach(button => {
        button.dataset.showLabel = button.getAttribute("aria-label");
        button.addEventListener("click", () => {
            const input = document.getElementById(button.dataset.passwordTarget);
            const show = input.type === "password";
            input.type = show ? "text" : "password";
            button.textContent = show ? "Hide" : "Show";
            button.setAttribute("aria-pressed", String(show));
            button.setAttribute("aria-label", show ? button.dataset.showLabel.replace("Show", "Hide") : button.dataset.showLabel);
        });
    });

    inputs.forEach(input => input.addEventListener("input", () => {
        clearError(input);
        say("");
        if (input === newPassword) clearError(confirmPassword);
    }));

    form.addEventListener("submit", async event => {
        event.preventDefault();
        if (submit.disabled) return;
        inputs.forEach(clearError);
        say("");

        if (currentPassword.value.length === 0) showError(currentPassword, "Enter your current password.");
        if (newPassword.value.trim().length === 0 || newPassword.value.length < 12) showError(newPassword, "Use a new password with at least 12 characters.");
        else if (newPassword.value.length > 256) showError(newPassword, "Use at most 256 characters.");
        else if (newPassword.value === currentPassword.value) showError(newPassword, "Choose a password different from your current one.");
        if (confirmPassword.value.length === 0) showError(confirmPassword, "Confirm your new password.");
        else if (confirmPassword.value !== newPassword.value) showError(confirmPassword, "The passwords do not match.");

        const firstInvalid = inputs.find(input => input.getAttribute("aria-invalid") === "true");
        if (firstInvalid) {
            say("Please check the highlighted fields.", true);
            firstInvalid.focus();
            return;
        }
        if (!owner || owner === "guest") {
            say("Sign in to a local student account before changing its password.", true);
            return;
        }

        submit.disabled = true;
        say("Checking your current password…");
        try {
            await window.studentAccount.changePassword(owner, currentPassword.value, newPassword.value, () => window.cmStorage.assertOwner(owner));
            form.reset();
            hidePasswords();
            say("Password changed for this browser's local account. Your progress and code drafts were kept. Use the new password next time you sign in here.");
        } catch (error) {
            if (/current password is incorrect/i.test(error.message)) {
                showError(currentPassword, "This is not your current password.");
                currentPassword.focus();
            }
            say(error.message, true);
        } finally {
            submit.disabled = false;
        }
    });

    window.addEventListener("pagehide", () => {
        form.reset();
        hidePasswords();
        inputs.forEach(clearError);
        say("");
    });
})();
