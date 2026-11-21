const loginForm = document.getElementById("login-form");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");

const emailError = document.getElementById("email-error");
const passwordError = document.getElementById("password-error");
const loginMessage = document.getElementById("login-message");

const submitButton = document.getElementById("login-submit");
const passwordToggle = document.getElementById("password-toggle");
const fillDemoButton = document.getElementById("fill-demo");

/* Public sample credentials for the frontend demo only */
const adminLogin = document.body.dataset.loginRole === "admin";
const demoEmail = adminLogin ? "admin@example.com" : "student@example.com";
const demoPassword = adminLogin ? "DemoAdmin123!" : "DemoStudent123!";
const requestedPage = !adminLogin && window.cmAccess?.returnTarget(new URLSearchParams(location.search).get("next"));
if (requestedPage) {
    const serviceNames = {
        "community.html": "Student Community",
        "peer-mentoring.html": "Student-led Sessions",
        "showcase.html": "Student Showcase",
        "freelance-services.html": "Student Freelance Services"
    };
    const serviceName = serviceNames[new URL(requestedPage).pathname.split("/").pop()];
    showMessage(serviceName ? "Sign in to continue to " + serviceName + "." : "Sign in with a student account to continue to the requested page.");
    const signup = document.querySelector('a[href$="/signup.html"]');
    if (signup) {
        const url = new URL(signup.href);
        url.searchParams.set("next", requestedPage);
        signup.href = url.href;
    }
}

function setFieldError(input, errorElement, message) {
    errorElement.textContent = message;
    input.setAttribute("aria-invalid", message ? "true" : "false");
}

function showMessage(message, isError = false) {
    loginMessage.textContent = message;
    loginMessage.classList.toggle("is-error", isError);
}

passwordToggle.addEventListener("click", function () {
    const showPassword = passwordInput.type === "password";

    passwordInput.type = showPassword ? "text" : "password";
    passwordToggle.textContent = showPassword ? "Hide" : "Show";
    passwordToggle.setAttribute("aria-pressed", String(showPassword));
    passwordToggle.setAttribute(
        "aria-label",
        showPassword ? "Hide password" : "Show password"
    );
});

fillDemoButton.addEventListener("click", function () {
    emailInput.value = demoEmail;
    passwordInput.value = demoPassword;

    setFieldError(emailInput, emailError, "");
    setFieldError(passwordInput, passwordError, "");
    showMessage("Demo details filled. Select Sign in to continue.");

    submitButton.focus();
});

emailInput.addEventListener("input", function () {
    setFieldError(emailInput, emailError, "");
    showMessage("");
});

passwordInput.addEventListener("input", function () {
    setFieldError(passwordInput, passwordError, "");
    showMessage("");
});

loginForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    if (submitButton.disabled) return;

    emailInput.value = emailInput.value.trim();

    const email = emailInput.value.toLowerCase();
    const password = passwordInput.value;

    let emailMessage = "";
    let passwordMessage = "";

    if (!email) {
        emailMessage = "Enter your email address.";
    } else if (emailInput.validity.typeMismatch) {
        emailMessage = "Enter a valid email address.";
    }

    if (!password) {
        passwordMessage = "Enter your password.";
    }

    setFieldError(emailInput, emailError, emailMessage);
    setFieldError(passwordInput, passwordError, passwordMessage);
    showMessage("");

    if (emailMessage || passwordMessage) {
        if (emailMessage) {
            emailInput.focus();
        } else {
            passwordInput.focus();
        }

        return;
    }

    // Server mode (npm start): the server verifies the password and issues the session.
    const serverInfo = window.cmServerAuth ? await window.cmServerAuth.status() : { server: false };
    if (serverInfo.server) {
        submitButton.disabled = true;
        showMessage("Signing in…");
        try {
            if (!adminLogin) window.platformStore?.assertAccess(email);
            let user;
            try {
                user = await window.cmServerAuth.passwordLogin(email, password, adminLogin ? "admin" : "student");
            } catch (error) {
                // One-time link: a student account that so far existed only in this browser is saved on
                // the server after its local password has been checked.
                if (adminLogin || error.code !== "invalid_credentials" || !window.studentAccount) throw error;
                let local;
                try { local = await window.studentAccount.authenticate(email, password); } catch { throw error; }
                user = await window.cmServerAuth.signup({ role: "student", name: local.name, email, age: local.age, password });
            }
            passwordInput.value = "";
            submitButton.textContent = adminLogin ? "Opening admin workspace…" : "Opening your workspace…";
            showMessage("Signed in.");
            window.cmServerAuth.completeSignIn(user);
        } catch (error) {
            submitButton.disabled = false;
            showMessage(error.message || "Sign-in failed. Try again.", true);
        }
        return;
    }

    if (adminLogin && (email !== demoEmail || password !== demoPassword)) {
        showMessage(
            "This frontend demo accepts the sample account shown below.",
            true
        );

        return;
    }

    if (adminLogin) {
        // Frontend preview only; real admin authorization requires a backend.
        try { sessionStorage.setItem("codementor-admin-session", JSON.stringify({ role: "admin", isDemo: true, signedInAt: Date.now() })); }
        catch { showMessage("Admin preview session could not be saved. Check browser storage.", true); return; }
        submitButton.disabled = true;
        submitButton.textContent = "Opening admin preview…";
        const requestedAdmin = new URLSearchParams(location.search).get("next");
        window.location.href = /^pages\/admin\/admin-[a-z0-9-]+\.html$/.test(requestedAdmin || "") ? "../admin/" + requestedAdmin.split("/").pop() : "../admin/admin-dashboard.html";
        return;
    }
    try { window.platformStore?.assertAccess(email); }
    catch (error) { showMessage(error.message, true); return; }
    let signedInProfile;
    submitButton.disabled = true;
    try {
        signedInProfile = email === demoEmail && password === demoPassword
            ? { name: "Demo Student (SAMPLE)", email: demoEmail, role: "student", isDemo: true }
            : await window.studentAccount.authenticate(email, password);
    } catch (error) { showMessage(error.message, true); return; }
    finally { submitButton.disabled = false; }

    /*
       Save demo identity only.
       This is not a real authentication session.
       Never save the password in browser storage.
    */
    try {
        const previousText = window.cmStorage.getItem("codementor-demo-session");
        const previous = previousText === null ? null : JSON.parse(previousText);
        if (previous !== null && (!previous || typeof previous.name !== "string" || typeof previous.email !== "string" || previous.role !== "student" || previous.isDemo !== true)) {
            showMessage("Existing demo account data could not be read. It has not been replaced.", true);
            return;
        }
        if (previous && previous.email.toLowerCase() !== email) {
            showMessage("A different student profile is active. Log out before signing in to another account. Your records have been kept.", true);
            return;
        }
        window.cmStorage.setItem(
            "codementor-demo-session",
            JSON.stringify({
                ...(previous || {}),
                ...signedInProfile,
                name: previous?.name || signedInProfile.name,
                email: email,
                role: "student",
                isDemo: true
            })
        );
    } catch {
        showMessage(
            "Storage is unavailable or existing demo data could not be read. Your saved records have not been replaced.",
            true
        );

        return;
    }

    submitButton.disabled = true;
    submitButton.textContent = "Opening demo…";

    if (requestedPage) {
        window.location.href = requestedPage;
        return;
    }

    try {
        const saved = window.cmStorage.getItem("codementor-demo-onboarding");
        const preferences = saved === null ? null : JSON.parse(saved);
        window.location.href = preferences && typeof preferences.language === "string"
            ? "../student/dashboard.html"
            : "../student/onboarding.html";
    } catch {
        window.location.href = "../student/profile.html";
    }
});
