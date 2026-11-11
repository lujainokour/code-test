/* Certificate "printing" reveal. certificates.js decides eligibility and toggles
   body.certificate-locked; this module only watches that class. When the requirements are met
   the certificate document plays a short print-in once per page view. The locked state is never
   animated or altered, and nothing plays under prefers-reduced-motion. */
(() => {
    "use strict";
    let played = false;
    function check() {
        const doc = document.querySelector(".certificate-document");
        if (!doc || played || document.body.classList.contains("certificate-locked")) return false;
        if (window.interactionKit?.reducedMotion?.()) { played = true; return false; }
        played = true;
        doc.classList.add("cm-printing");
        setTimeout(() => doc.classList.remove("cm-printing"), 1600);
        return true;
    }
    window.certificateReveal = Object.freeze({ check });
    // certificates.js renders while deferred scripts run; check after that and on later unlocks.
    const start = () => {
        check();
        if (window.MutationObserver) new MutationObserver(check).observe(document.body, { attributes: true, attributeFilter: ["class"] });
    };
    if (document.readyState !== "complete") document.addEventListener("DOMContentLoaded", start, { once: true }); else start();
})();
