const requestedServicePage = window.cmAccess?.returnTarget(new URLSearchParams(location.search).get("next"));
if (requestedServicePage) {
    const login = document.querySelector('a[href$="/login.html"]');
    if (login) {
        const url = new URL(login.href);
        url.searchParams.set("next", requestedServicePage);
        login.href = url.href;
    }
}
const signupForm = document.getElementById("signup-form");

const nameInput = document.getElementById("full-name");
const emailInput = document.getElementById("email");
const ageInput = document.getElementById("age");
const passwordInput = document.getElementById("password");
const confirmInput = document.getElementById("confirm-password");

const nameError = document.getElementById("name-error");
const emailError = document.getElementById("email-error");
const ageError = document.getElementById("age-error");
const passwordError = document.getElementById("password-error");
const confirmError = document.getElementById("confirm-error");

const signupMessage = document.getElementById("signup-message");
const submitButton = document.getElementById("signup-submit");

/* Generate locally with browser cryptography; never persist the suggestion. */
const suggestionPanel = document.getElementById("password-suggestion");
const suggestionText = document.getElementById("suggested-password");
const suggestionStatus = document.getElementById("password-suggestion-status");
const useSuggestionButton = document.getElementById("use-suggested-password");

function refreshPasswordSuggestion() {
    if (!window.crypto?.getRandomValues) return;
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
    const bytes = window.crypto.getRandomValues(new Uint8Array(20));
    // A 64-character alphabet divides the 256 possible byte values evenly.
    suggestionText.textContent = Array.from(bytes, value => alphabet[value & 63]).join("");
    closePasswordSuggestion();
    suggestionStatus.textContent = "";
}

refreshPasswordSuggestion();

function closePasswordSuggestion() {
    suggestionPanel.hidden = true;
    passwordInput.setAttribute("aria-expanded", "false");
}

function openPasswordSuggestion() {
    if (!suggestionText.textContent) return;
    suggestionPanel.hidden = false;
    passwordInput.setAttribute("aria-expanded", "true");
}

passwordInput.addEventListener("focus", openPasswordSuggestion);
passwordInput.addEventListener("click", openPasswordSuggestion);

document.addEventListener("pointerdown", function (event) {
    if (!passwordInput.parentElement.contains(event.target)) closePasswordSuggestion();
});

document.addEventListener("focusin", function (event) {
    if (!passwordInput.parentElement.contains(event.target)) closePasswordSuggestion();
});

document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && !suggestionPanel.hidden) {
        event.preventDefault();
        passwordInput.focus();
        closePasswordSuggestion();
    }
});

useSuggestionButton.addEventListener("click", function () {
    passwordInput.value = suggestionText.textContent;
    confirmInput.value = suggestionText.textContent;
    passwordInput.dispatchEvent(new Event("input", { bubbles: true }));
    confirmInput.dispatchEvent(new Event("input", { bubbles: true }));
    suggestionStatus.textContent = "Strong password added to both fields.";
    passwordInput.focus();
    closePasswordSuggestion();
});

function setFieldError(input, errorElement, message) {
    errorElement.textContent = message;
    input.setAttribute("aria-invalid", message ? "true" : "false");
}

function showMessage(message, isError = false) {
    signupMessage.textContent = message;
    signupMessage.classList.toggle("is-error", isError);
}

/* Show or hide each password independently */
document.querySelectorAll("[data-password-target]").forEach(function (button) {
    button.addEventListener("click", function () {
        const input = document.getElementById(button.dataset.passwordTarget);
        const showPassword = input.type === "password";

        input.type = showPassword ? "text" : "password";

        button.textContent = showPassword ? "Hide" : "Show";
        button.setAttribute("aria-pressed", String(showPassword));

        const label = input === confirmInput
            ? "confirmation password"
            : "password";

        button.setAttribute(
            "aria-label",
            `${showPassword ? "Hide" : "Show"} ${label}`
        );
    });
});

/* Clear a field's error when its value changes */
const fields = [
    { input: nameInput, error: nameError },
    { input: emailInput, error: emailError },
    { input: ageInput, error: ageError },
    { input: passwordInput, error: passwordError },
    { input: confirmInput, error: confirmError }
];

fields.forEach(function (field) {
    field.input.addEventListener("input", function () {
        setFieldError(field.input, field.error, "");
        showMessage("");
    });
});

passwordInput.addEventListener("input", function () {
    setFieldError(confirmInput, confirmError, "");
});

signupForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    if (submitButton.disabled) return;

    if (submitButton.disabled) {
        return;
    }

    nameInput.value = nameInput.value.trim();
    emailInput.value = emailInput.value.trim();

    const name = nameInput.value;
    const email = emailInput.value.toLowerCase();
    const age = Number(ageInput.value);

    /* Keep passwords exactly as entered, including spaces */
    const password = passwordInput.value;
    const confirmation = confirmInput.value;

    let nameMessage = "";
    let emailMessage = "";
    let ageMessage = "";
    let passwordMessage = "";
    let confirmMessage = "";

    if (!name) {
        nameMessage = "Enter your name.";
    } else if (name.length < 2 || name.split(/\s+/u).length < 2) {
        nameMessage = "Enter your full name, including your first and last name.";
    } else if (!/\p{L}/u.test(name) || /[^\p{L}\p{M}\s.'’\-]/u.test(name)) {
        nameMessage = "Use letters, spaces, apostrophes, periods or hyphens in your full name.";
    } else if (name.length > 80) {
        nameMessage = "Use no more than 80 characters.";
    }

    if (!email) {
        emailMessage = "Enter your email address.";
    } else if (emailInput.validity.typeMismatch) {
        emailMessage = "Enter a valid email address.";
    }

    if (!password.trim()) {
        passwordMessage = "Enter a password.";
    } else if (password.length < 12) {
        passwordMessage = "Use at least 12 characters.";
    }

    if (!ageInput.value.trim() || !Number.isInteger(age) || age < 1 || age > 120) {
        ageMessage = "Enter your age as a whole number between 1 and 120.";
    }

    if (!confirmation) {
        confirmMessage = "Confirm your password.";
    } else if (confirmation !== password) {
        confirmMessage = "Passwords do not match.";
    }

    setFieldError(nameInput, nameError, nameMessage);
    setFieldError(emailInput, emailError, emailMessage);
    setFieldError(ageInput, ageError, ageMessage);
    setFieldError(passwordInput, passwordError, passwordMessage);
    setFieldError(confirmInput, confirmError, confirmMessage);
    showMessage("");

    const firstInvalidField = [
        { input: nameInput, message: nameMessage },
        { input: emailInput, message: emailMessage },
        { input: ageInput, message: ageMessage },
        { input: passwordInput, message: passwordMessage },
        { input: confirmInput, message: confirmMessage }
    ].find(function (field) {
        return Boolean(field.message);
    });

    if (firstInvalidField) {
        firstInvalidField.input.focus();
        return;
    }

    /*
       Persistent browser-local account (js/student-account.js).
       Only a salt and PBKDF2 hash are stored, never the password.
    */
    try {
        const previousText = window.cmStorage.getItem("codementor-demo-session");
        const previous = previousText === null ? null : JSON.parse(previousText);
        if (previous !== null && (!previous || typeof previous.name !== "string" || typeof previous.email !== "string" || previous.role !== "student" || previous.isDemo !== true)) {
            throw new Error("Invalid existing identity");
        }
        if (previous && previous.email.toLowerCase() !== email) {
            showMessage("A different student account is signed in on this browser. Log out before starting another profile. Existing records were kept.", true);
            return;
        }
        submitButton.disabled = true;
        const account = await window.studentAccount.register({ name, email, age }, password);
        if (window.cmStorage.getItem("codementor-demo-session") !== previousText) throw new Error("The active account changed while registering. Your new local account was saved; log out and sign in to it before continuing.");
        window.cmStorage.setItem(
            "codementor-demo-session",
            JSON.stringify({
                ...(previous || {}),
                ...account,
                role: "student",
                isDemo: true
            })
        );

        /* Preserve saved onboarding, learning and admin content records. */
    } catch (error) {
        submitButton.disabled = false;
        showMessage(
            error.message || "Your profile could not be saved. Existing records were kept.",
            true
        );
        return;
    }

    signupForm.reset();

    submitButton.disabled = true;
    submitButton.textContent = requestedServicePage ? "Opening service…" : "Opening onboarding…";

    window.location.href = requestedServicePage || "../student/onboarding.html";
});

/* Restore the button when returning with the browser Back button */
window.addEventListener("pageshow", function () {
    submitButton.disabled = false;
    submitButton.textContent = requestedServicePage ? "Create account and continue" : "Continue to onboarding";
    refreshPasswordSuggestion();
});
