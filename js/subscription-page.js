(() => {
    "use strict";
    const store = window.subscriptionStore;
    const status = document.getElementById("subscription-current-plan");
    const message = document.getElementById("subscription-message");
    const upgrade = document.getElementById("subscription-upgrade");
    const cancel = document.getElementById("subscription-cancel");
    let owner;
    function render() {
        try {
            const plan = store.read();
            const premium = plan.plan === "premium" && plan.status === "demo-active";
            status.textContent = premium ? "Current plan: Premium (local preview)" : "Current plan: Free";
            upgrade.hidden = premium;
            cancel.hidden = !premium;
            const raw = window.cmStorage.getItem("codementor-demo-session");
            const account = raw === null ? null : JSON.parse(raw);
            const valid = account?.role === "student" && account.isDemo === true && typeof account.email === "string" && Boolean(account.email.trim());
            owner = valid ? account.email.trim().toLowerCase() : null;
            upgrade.disabled = !valid;
            cancel.disabled = !valid;
            if (!valid) {
                message.replaceChildren("Sign in to a student account to change your preview plan. ");
                const signIn = document.createElement("a");
                signIn.href = "../auth/login.html";
                signIn.textContent = "Sign in";
                message.append(signIn);
            }
        } catch (error) {
            status.textContent = "Current plan: Unavailable";
            message.textContent = error.message;
            message.classList.add("is-error");
            upgrade.disabled = true;
            cancel.disabled = true;
        }
    }
    upgrade.addEventListener("click", () => {
        try {
            store.activateDemoPremium(owner);
            message.classList.remove("is-error");
            message.textContent = "Premium preview enabled for this student account. No payment was collected.";
            render();
        } catch (error) {
            message.classList.add("is-error");
            message.textContent = error.message;
            let account;
            try { account = window.cmStorage.getItem("codementor-demo-session"); } catch { return; }
            if (account === null) {
                const signIn = document.createElement("a");
                signIn.href = "../auth/login.html";
                signIn.className = "button button-outline";
                signIn.textContent = "Sign in to your student account";
                message.append(" ", signIn);
            }
        }
    });
    cancel.addEventListener("click", () => {
        try {
            store.returnToFree(owner);
            message.classList.remove("is-error");
            message.textContent = "Free plan restored. Your learning progress was kept.";
            render();
        } catch (error) {
            message.classList.add("is-error");
            message.textContent = error.message;
        }
    });
    render();
})();
