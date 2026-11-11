(async () => {
    if (new URLSearchParams(location.search).get("run") !== "disposable-profile") return;
    const frame = document.getElementById("subject"), output = document.getElementById("results"), checks = [];
    const identity = "codementor-demo-session";
    const a = { name: "Owner Alpha", email: "alpha@example.com", role: "student", isDemo: true };
    const b = { name: "Owner Beta", email: "beta@example.com", role: "student", isDemo: true };
    const legacyKey = "codementor-demo-chat-general";
    const legacy = JSON.stringify([{ role: "user", text: "Unassigned historical private message" }]);
    const key = (email, context = "general") => `codementor-demo-chat-v2:${email ? "student:" + encodeURIComponent(email) : "guest"}:${context}`;
    let doc, win;
    function check(name, value) {
        checks.push({ name, passed: Boolean(value) });
        output.textContent = JSON.stringify({ passed: checks.filter(c => c.passed).length, total: checks.length, checks }, null, 2);
    }
    function account(value) {
        if (value === null) cmStorage.removeItem(identity);
        else cmStorage.setItem(identity, typeof value === "string" ? value : JSON.stringify(value));
    }
    function load(query = "") {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => reject(new Error("Mentor navigation timed out")), 8000);
            frame.onload = () => { clearTimeout(timer); setTimeout(() => { win = frame.contentWindow; doc = win.document; resolve(); }, 100); };
            frame.src = testPageUrl("mentor.html" + query);
        });
    }
    const history = () => doc.getElementById("chat-messages").textContent;
    function send(text) {
        doc.getElementById("chat-input").value = text;
        doc.getElementById("chat-form").dispatchEvent(new win.Event("submit", { bubbles: true, cancelable: true }));
    }
    const unchangedLegacy = () => sessionStorage.getItem(legacyKey) === legacy;
    try {
        localStorage.clear(); sessionStorage.clear();
        sessionStorage.setItem(legacyKey, legacy);
        account(a); await load();
        check("Unknown historical chat is not shown or claimed by Alpha", !history().includes("historical private") && unchangedLegacy() && cmStorage.getItem(key(a.email)) === null);
        send("Alpha private variables question");
        check("Alpha chat and prepared response use an owner-specific key", cmStorage.getItem(key(a.email))?.includes("Alpha private") && history().includes("A variable is a name"));
        check("Sending a new chat preserves unknown historical bytes", unchangedLegacy());
        await load(); check("Alpha conversation survives refresh", history().includes("Alpha private"));
        account(b); await load();
        check("Beta cannot see Alpha or unassigned historical conversations", !history().includes("Alpha private") && !history().includes("historical private"));
        send("Beta private input question");
        check("Beta gets an independent conversation", cmStorage.getItem(key(b.email))?.includes("Beta private") && !cmStorage.getItem(key(b.email))?.includes("Alpha private"));
        account({ ...a, email: " ALPHA@EXAMPLE.COM " }); await load();
        check("Normalized identity restores only Alpha history", history().includes("Alpha private") && !history().includes("Beta private"));
        await load("?lesson=variables");
        check("Owner conversations are also isolated by learning context", !history().includes("Alpha private"));
        send("Alpha lesson-specific question");
        check("Lesson conversation is saved separately", cmStorage.getItem(key(a.email, "variables"))?.includes("lesson-specific"));
        await load(); check("Returning to general keeps the original owner history", history().includes("Alpha private") && !history().includes("lesson-specific"));
        account(null); await load();
        check("Logout does not expose student history to a guest", !history().includes("Alpha private") && !history().includes("Beta private") && !history().includes("historical private"));
        send("Guest-only range question"); await load();
        check("Guest history has a separate namespace and survives refresh", history().includes("Guest-only") && cmStorage.getItem(key(null))?.includes("Guest-only"));
        account(a); await load();
        check("Signing in does not adopt guest conversations", history().includes("Alpha private") && !history().includes("Guest-only"));
        const beforeA = cmStorage.getItem(key(a.email)), beforeB = cmStorage.getItem(key(b.email));
        doc.getElementById("chat-input").value = "Stale Alpha input must not be sent";
        account(b);
        doc.getElementById("chat-form").dispatchEvent(new win.Event("submit", { bubbles: true, cancelable: true }));
        check("Account switch blocks sending stale input to either account", cmStorage.getItem(key(a.email)) === beforeA && cmStorage.getItem(key(b.email)) === beforeB);
        check("Stale page removes Alpha messages and draft from display", !history().includes("Alpha private") && doc.getElementById("chat-input").value === "");
        account(a); await load(); doc.getElementById("clear-chat").click(); account(b);
        doc.getElementById("confirm-clear").click();
        check("Stale clear confirmation cannot delete either account history", cmStorage.getItem(key(a.email)) === beforeA && cmStorage.getItem(key(b.email)) === beforeB && unchangedLegacy());
        await load(); doc.getElementById("clear-chat").click(); doc.getElementById("cancel-clear").click();
        check("Cancel clear preserves the current owner's messages", cmStorage.getItem(key(b.email)) === beforeB && history().includes("Beta private"));
        doc.getElementById("clear-chat").click(); doc.getElementById("confirm-clear").click();
        check("Explicit clear affects only the current owner and context", cmStorage.getItem(key(b.email)) === null && cmStorage.getItem(key(a.email)) === beforeA && unchangedLegacy());
        account(a); await load(); account(b);
        win.dispatchEvent(new win.StorageEvent("storage", { key: "codementor-profile-v1", storageArea: localStorage }));
        check("Cross-tab profile event removes previous owner messages immediately", !history().includes("Alpha private"));
        account(a); await load(); account(b); win.dispatchEvent(new win.Event("pageshow"));
        check("Back/forward pageshow rechecks the current owner", !history().includes("Alpha private"));
        account(a);
        cmStorage.setItem("codementor-demo-code-receipt", JSON.stringify({ version: 1, taskId: "receipt", code: "Alpha private draft" }));
        await load("?task=receipt");
        check("Task context still displays the current owner's saved code", !doc.getElementById("context-code").hidden && doc.getElementById("context-code-text").textContent === "Alpha private draft");
        account(b);
        cmStorage.setItem("codementor-demo-code-receipt", JSON.stringify({ version: 1, taskId: "receipt", code: "Beta private draft" }));
        win.dispatchEvent(new win.StorageEvent("storage", { key: "codementor-profile-v1", storageArea: localStorage }));
        check("Changing owner also replaces private task context code", doc.getElementById("context-code-text").textContent === "Beta private draft" && !doc.body.textContent.includes("Alpha private draft"));
        account("{bad-identity"); win.dispatchEvent(new win.Event("pageshow"));
        check("Unreadable profile hides private context and blocks stale sends", doc.getElementById("context-code").hidden && doc.getElementById("context-code-text").textContent === "");
        account(a); cmStorage.setItem(key(a.email), "{bad-owner-chat"); await load(); send("Do not replace corrupt records");
        check("Corrupt owned history remains unchanged and is explained", cmStorage.getItem(key(a.email)) === "{bad-owner-chat" && doc.getElementById("chat-status").textContent.includes("this visit only"));
        account("{bad-identity"); await load();
        if (doc.getElementById("chat-form")) send("No owner available");
        check("Malformed identity never exposes historical or other owner messages", !doc.body.textContent.includes("Alpha private") && !doc.body.textContent.includes("historical private") && cmStorage.getItem(identity) === "{bad-identity" && cmStorage.getItem(key(a.email)) === "{bad-owner-chat");
        account(a); await load(); account({ ...b, role: "admin" }); send("Invalid role must not own student chats");
        check("Invalid role on a stale page cannot write to a student history", cmStorage.getItem(key(a.email)) === "{bad-owner-chat" && cmStorage.getItem(key(b.email)) === null);
        check("All historical conversation data remains byte-for-byte unchanged", unchangedLegacy());
    } catch (error) { check("Unexpected regression harness failure: " + error.message, false); }
    output.dataset.done = "true";
})();
