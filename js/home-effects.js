(() => {
    if (!document.body.classList.contains("home-page")) return;

    // إزالة طبقة الدخان القديمة.
    // فيديو الهيرو الحالي تديره hero-background.js بشكل مستقل.
    document.querySelectorAll(".home-smoke").forEach(element => {
        element.remove();
    });

    const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
    );

    const elements = Array.from(
        document.querySelectorAll(
            ".home-band .section-heading, " +
            ".home-band .feature-card, " +
            ".home-band .step-card, " +
            ".home-band .module-card, " +
            ".home-band .mentor-section, " +
            ".home-band .faq-list details, " +
            ".home-band .final-cta"
        )
    );

    // إزالة كلاسات الحركة السابقة حتى لا تتعارض.
    elements.forEach(element => {
        element.classList.remove("home-reveal", "is-visible");
    });

    let observer;

    function revealAll() {
        elements.forEach(element => {
            element.classList.add("design-visible");
        });

        observer?.disconnect();
    }

    if (
        !reducedMotion.matches &&
        "IntersectionObserver" in window
    ) {
        observer = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;

                entry.target.classList.add("design-visible");
                observer.unobserve(entry.target);
            });
        }, {
            threshold: 0.08
        });

        elements.forEach(element => {
            // العناصر الظاهرة أصلًا تبقى مرئية.
            if (element.getBoundingClientRect().top < innerHeight) {
                return;
            }

            const siblings = Array.from(
                element.parentElement.children
            );

            const position = siblings.indexOf(element);

            element.style.setProperty(
                "--design-delay",
                `${Math.min(position, 3) * 100}ms`
            );

            element.classList.add("design-reveal");
            observer.observe(element);
        });
    }

    // ميل الكروت مع حركة الماوس.
    const cards = document.querySelectorAll(
        "#features .feature-card"
    );

    cards.forEach(card => {
        card.addEventListener("pointermove", event => {
            if (
                reducedMotion.matches ||
                event.pointerType !== "mouse"
            ) {
                return;
            }

            const bounds = card.getBoundingClientRect();

            const x =
                (event.clientX - bounds.left) / bounds.width - 0.5;

            const y =
                (event.clientY - bounds.top) / bounds.height - 0.5;

            card.style.setProperty(
                "--tilt-x",
                `${-y * 7}deg`
            );

            card.style.setProperty(
                "--tilt-y",
                `${x * 7}deg`
            );
        });

        card.addEventListener("pointerleave", () => {
            card.style.removeProperty("--tilt-x");
            card.style.removeProperty("--tilt-y");
        });
    });

    // أي عنصر يصل إليه التركيز يظهر فورًا.
    document.addEventListener("focusin", event => {
        const element = event.target.closest(".design-reveal");

        if (element) {
            element.classList.add("design-visible");
            observer?.unobserve(element);
        }
    });

    reducedMotion.addEventListener("change", event => {
        if (event.matches) {
            revealAll();

            cards.forEach(card => {
                card.style.removeProperty("--tilt-x");
                card.style.removeProperty("--tilt-y");
            });
        }
    });
})();

/* Language cards stay visible without JavaScript and enter once on arrival. */
(() => {
    const grid = document.querySelector("#modules .hc-languages");
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    if (!grid || reduced.matches || !("IntersectionObserver" in window)) return;
    const cards = [...grid.children];
    const observer = new IntersectionObserver(entries => {
        if (!entries.some(entry => entry.isIntersecting)) return;
        if (!grid.contains(document.activeElement)) cards.forEach(card => card.classList.add("language-enter"));
        observer.disconnect();
    }, { threshold: 0.12 });
    observer.observe(grid);
    grid.addEventListener("focusin", () => {
        observer.disconnect();
        cards.forEach(card => card.classList.remove("language-enter"));
    });
})();

/* Play visible cherries one at a time, repeating in card order. */
(() => {
    const videos = [...document.querySelectorAll(".service-cherry-video")];
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const visible = new Set();
    let active = null;
    let nextIndex = 0;
    function sync() {
        if (active && (reduced.matches || document.hidden || !visible.has(active))) {
            active.pause();
            if (!visible.has(active)) active = null;
        }
        if (reduced.matches || document.hidden) return;
        if (!active) {
            for (let offset = 0; offset < videos.length; offset++) {
                const index = (nextIndex + offset) % videos.length;
                if (!visible.has(videos[index])) continue;
                active = videos[index];
                active.currentTime = 0;
                nextIndex = (index + 1) % videos.length;
                break;
            }
        }
        if (active) active.play().catch(() => {});
    }
    videos.forEach(video => {
        video.muted = true;
        video.loop = false;
        video.pause();
        video.defaultPlaybackRate = 0.75;
        video.playbackRate = 0.75;
        video.addEventListener("ended", () => {
            if (active !== video) return;
            video.pause();
            active = null;
            sync();
        });
    });
    if ("IntersectionObserver" in window) {
        const observer = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting) visible.add(entry.target);
                else visible.delete(entry.target);
            });
            sync();
        }, { threshold: 0.1 });
        videos.forEach(video => observer.observe(video));
    } else {
        videos.forEach(video => visible.add(video));
        sync();
    }
    reduced.addEventListener("change", sync);
    document.addEventListener("visibilitychange", sync);
})();

/* Four service cards only. Visible by default; one finite entry, no hidden JS state. */
(() => {
    const section = document.getElementById("student-services");
    if (!section) return;
    const header = document.querySelector(".site-header");
    function syncServicesOffset() {
        section.style.setProperty("--services-header-height", `${header?.getBoundingClientRect().height || 0}px`);
        section.style.setProperty("--services-page-scroll-padding", `${parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0}px`);
    }
    if (header) {
        syncServicesOffset();
        if ("ResizeObserver" in window) new ResizeObserver(syncServicesOffset).observe(header);
        else window.addEventListener("resize", syncServicesOffset);
    }
    const cards = [...section.querySelectorAll(".services-card")];
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    if (reduced.matches || !("IntersectionObserver" in window)) return;
    let entered = false;
    const observer = new IntersectionObserver(entries => {
        if (entered || !entries.some(entry => entry.isIntersecting)) return;
        entered = true;
        // Fragment arrival is immediate; reserve the reveal for ordinary scrolling.
        if (location.hash !== "#student-services") cards.forEach(card => card.classList.add("service-enter"));
        observer.disconnect();
    }, { threshold: 0.02 });
    observer.observe(section.querySelector(".services-grid"));
    section.addEventListener("focusin", () => {
        // Keyboard users never wait for an entry animation to reach a link.
        entered = true; observer.disconnect();
        cards.forEach(card => card.classList.remove("service-enter"));
    });
    reduced.addEventListener("change", event => {
        if (event.matches) {
            entered = true; observer.disconnect();
            cards.forEach(card => card.classList.remove("service-enter"));
        }
    });
})();
