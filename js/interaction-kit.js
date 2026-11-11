/* Interaction kit: toasts (aria-live, optional Undo), count-up on first render only, staggered
   entrance, confetti/rocket celebrations and a per-account "seen" store. No dependencies.
   Everything respects prefers-reduced-motion: information is never conveyed by motion alone. */
(() => {
    "use strict";
    const UNDO_MS = 6000;
    const reducedMotion = () => Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
    document.documentElement.classList.add("ik");

    // ---- Toasts ----
    function region() {
        let r = document.querySelector("#ik-toasts");
        if (!r) {
            r = document.createElement("div"); r.id = "ik-toasts"; r.className = "ik-toasts";
            r.setAttribute("role", "status"); r.setAttribute("aria-live", "polite"); r.setAttribute("aria-atomic", "false");
            document.body.append(r);
        }
        return r;
    }
    /* toast(message, { tone, duration, undo, undoLabel, onExpire })
       undo: async function that really restores the data. The Undo button exists only while the
       window is open; after it closes the toast disappears and onExpire runs. */
    function toast(message, options = {}) {
        const { tone = "info", undo = null, undoLabel = "Undo", onExpire = null } = options;
        const duration = options.duration ?? (undo ? UNDO_MS : 5000);
        const el = document.createElement("div"); el.className = "ik-toast"; el.dataset.tone = tone;
        const text = document.createElement("span"); text.className = "ik-toast-text"; text.textContent = message; el.append(text);
        let settled = false, timer = null;
        const remove = () => { el.classList.add("is-leaving"); setTimeout(() => el.remove(), reducedMotion() ? 0 : 220); };
        const handle = { element: el, undone: false, get settled() { return settled; } };
        function expire() { if (settled) return; settled = true; clearTimeout(timer); remove(); try { onExpire?.(); } catch { /* caller reports */ } }
        if (typeof undo === "function") {
            const button = document.createElement("button"); button.type = "button"; button.textContent = undoLabel;
            button.addEventListener("click", async () => {
                if (settled) return; settled = true; clearTimeout(timer); button.disabled = true;
                try { await undo(); handle.undone = true; text.textContent = "Restored."; el.dataset.tone = "success"; }
                catch (error) { text.textContent = error?.message || "Undo failed. Nothing else was changed."; el.dataset.tone = "error"; }
                button.remove(); setTimeout(remove, 2500);
            });
            el.append(button);
        }
        region().append(el);
        timer = setTimeout(expire, duration);
        handle.dismiss = expire;
        return handle;
    }

    // ---- Count-up: animates only the first time an element is rendered ----
    function countUp(el, value, { duration = 450, format = v => String(v) } = {}) {
        if (!el) return;
        const target = Number(value);
        const final = format(target);
        if (el.dataset.ikCounted === "true" || reducedMotion() || !Number.isFinite(target) || target <= 0 || !window.requestAnimationFrame) {
            el.textContent = final; el.dataset.ikCounted = "true"; return;
        }
        el.dataset.ikCounted = "true";
        el.setAttribute("aria-label", final); // screen readers get the real value immediately
        const start = performance.now();
        const step = now => {
            const t = Math.min(1, (now - start) / duration), eased = 1 - Math.pow(1 - t, 3);
            el.textContent = t < 1 ? format(Math.round(target * eased)) : final;
            if (t < 1) requestAnimationFrame(step); else el.removeAttribute("aria-label");
        };
        el.textContent = format(0);
        requestAnimationFrame(step);
    }

    // ---- Staggered entrance: once per container ----
    function stagger(container) {
        if (!container || container.dataset.ikStaggered === "true") return;
        container.dataset.ikStaggered = "true";
        if (reducedMotion()) return;
        [...container.children].forEach((child, i) => child.style.setProperty("--ik-i", String(Math.min(i, 12))));
        container.classList.add("ik-stagger");
        setTimeout(() => container.classList.remove("ik-stagger"), 1400);
    }

    // ---- Celebrations (< 2 s; skipped entirely under reduced motion) ----
    function confetti({ pieces = 90, duration = 1600 } = {}) {
        if (reducedMotion() || !document.createElement("canvas").getContext) return false;
        const canvas = document.createElement("canvas"); canvas.className = "ik-celebrate-canvas"; canvas.setAttribute("aria-hidden", "true");
        canvas.width = innerWidth; canvas.height = innerHeight; document.body.append(canvas);
        const ctx = canvas.getContext("2d"); if (!ctx) { canvas.remove(); return false; }
        const colors = ["#70151c", "#b1d4e1", "#f2c14e", "#5fbf8f", "#99282c"];
        const parts = Array.from({ length: pieces }, () => ({ x: innerWidth / 2 + (Math.random() - .5) * 120, y: innerHeight * .7, vx: (Math.random() - .5) * 9, vy: -(6 + Math.random() * 9), r: 3 + Math.random() * 4, c: colors[Math.floor(Math.random() * colors.length)], a: Math.random() * Math.PI }));
        const start = performance.now();
        (function frame(now) {
            const t = now - start; ctx.clearRect(0, 0, canvas.width, canvas.height);
            for (const p of parts) { p.vy += .32; p.x += p.vx; p.y += p.vy; p.a += .2; ctx.save(); ctx.globalAlpha = Math.max(0, 1 - t / duration); ctx.translate(p.x, p.y); ctx.rotate(p.a); ctx.fillStyle = p.c; ctx.fillRect(-p.r, -p.r / 2, p.r * 2, p.r); ctx.restore(); }
            if (t < duration) requestAnimationFrame(frame); else canvas.remove();
        })(start);
        return true;
    }
    function rocket() {
        if (reducedMotion()) return false;
        const el = document.createElement("span"); el.className = "ik-rocket"; el.textContent = "🚀"; el.setAttribute("aria-hidden", "true");
        document.body.append(el); setTimeout(() => el.remove(), 1700);
        return true;
    }
    function checkMark() {
        const ns = "http://www.w3.org/2000/svg", svg = document.createElementNS(ns, "svg");
        svg.setAttribute("viewBox", "0 0 72 72"); svg.setAttribute("class", "ik-check"); svg.setAttribute("aria-hidden", "true");
        const c = document.createElementNS(ns, "circle"); c.setAttribute("cx", "36"); c.setAttribute("cy", "36"); c.setAttribute("r", "32");
        const p = document.createElementNS(ns, "path"); p.setAttribute("d", "M22 37l9 9 19-20");
        svg.append(c, p); return svg;
    }

    /* ---- Per-account "seen" store ----
       Key codementor-delight-v1:<owner>. New key; never touches existing data. Every write first
       checks that the account captured when the page loaded is still the signed-in account. */
    const SEEN_PREFIX = "codementor-delight-v1:";
    function seenStore(owner) {
        if (!owner || owner === "guest") return null;
        const key = SEEN_PREFIX + encodeURIComponent(owner);
        const read = () => { try { const v = JSON.parse(localStorage.getItem(key) || "{}"); return v && typeof v === "object" && !Array.isArray(v) ? v : {}; } catch { return null; } };
        return {
            key,
            get(name) { const v = read(); return v ? v[name] : undefined; },
            set(name, value) {
                try { if (window.cmStorage?.captureOwner && window.cmStorage.captureOwner() !== owner) return false; } catch { return false; }
                const v = read(); if (v === null) return false; // unreadable: keep the stored value untouched
                v[name] = value; localStorage.setItem(key, JSON.stringify(v)); return true;
            }
        };
    }

    window.interactionKit = Object.freeze({ UNDO_MS, reducedMotion, toast, countUp, stagger, confetti, rocket, checkMark, seenStore });
    // Opt-in entrance animation for static containers.
    const auto = () => document.querySelectorAll("[data-ik-stagger]").forEach(stagger);
    if (document.readyState !== "complete") document.addEventListener("DOMContentLoaded", auto, { once: true }); else auto();
})();
