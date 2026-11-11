/* Keep each homepage service linked to its own sign-in return destination. */
(() => {
    const links = document.querySelectorAll("[data-service-target]");
    function refresh() {
        links.forEach(link => {
            const target = window.cmAccess.returnTarget(link.dataset.serviceTarget);
            if (!target) return;
            const companyAllowed = ["showcase.html", "freelance-services.html"].includes(new URL(target).pathname.split("/").pop());
            const allowed = window.cmAccess.student() || (companyAllowed && window.cmAccess.company());
            const login = new URL("pages/auth/login.html", new URL("../../", target));
            login.searchParams.set("next", link.dataset.serviceTarget);
            link.href = allowed ? target : login.href;
            link.querySelector(".service-access-note").textContent = allowed ? "Open service" : "Sign in required";
        });
    }
    refresh();
    window.addEventListener("pageshow", refresh);
    window.addEventListener("storage", refresh);
    window.addEventListener("student-account-changed", refresh);
    links.forEach(link => link.addEventListener("click", refresh));
})();
