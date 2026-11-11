(async () => {
    if (new URLSearchParams(location.search).get("run") !== "disposable-profile") return;
    const frame = document.getElementById("subject"), output = document.getElementById("results"), checks = [];
    let win, doc;
    function check(name, passed, details) { checks.push({name, passed:Boolean(passed), ...(!passed && details ? {details} : {})}); output.textContent = JSON.stringify({passed:checks.filter(c=>c.passed).length,total:checks.length,checks},null,2); }
    const wait = ms => new Promise(resolve=>setTimeout(resolve,ms));
    function load(path) { return new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error(path)),8000);frame.onload=()=>{clearTimeout(timer);win=frame.contentWindow;doc=win.document;setTimeout(resolve,40);};frame.src=testPageUrl(path);}); }
    const style = (node,pseudo)=>win.getComputedStyle(node,pseudo);
    try {
        // These visual values describe the light palette; dark mode has its own suite.
        localStorage.setItem("codementor-ui-theme", "light");
        const storageBefore = JSON.stringify({...sessionStorage});
        await load("../index.html");
        const section = doc.getElementById("student-services"), cards=[...section.querySelectorAll(".services-card")], links=cards.map(c=>c.querySelector("a"));
        check("Exactly four original services and destinations", links.map(a=>new URL(a.href).pathname.split("/").pop()).join("|") === "community.html|peer-mentoring.html|showcase.html|freelance-services.html");
        check("Prominent numbers 01–04", cards.map(c=>c.querySelector(".service-number").textContent).join() === "01,02,03,04" && parseFloat(style(cards[0].querySelector(".service-number")).fontSize)===34);
        check("Visible by default before JS entry", cards.every(c=>style(c).visibility === "visible" && !c.hidden));
        check("No section looping separator or pointer-intercepting decoration", style(section,"::after").display === "none" && cards.every(c=>style(c.querySelector(".service-cherry-video")).pointerEvents === "none" && c.querySelector(".service-cherry-video").getAttribute("aria-hidden") === "true"));
        section.scrollIntoView({behavior:"instant"}); await wait(160);
        const reduced = win.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (!reduced) {
            // Entry timing is tested with real browser time in services-input.ps1.
            check("Cards remain accessible regardless of observer timing", cards.every(c=>style(c).display!=="none" && style(c).visibility==="visible"));
            cards.forEach(c=>c.getAnimations().forEach(a=>a.finish()));
        } else check("Reduced motion skips entry", cards.every(c=>!c.classList.contains("service-enter") && style(c).animationName === "none"));
        check("Laptop four balanced columns", style(section.querySelector(".services-grid")).gridTemplateColumns.split(" ").length === 4 && Math.abs(cards[0].getBoundingClientRect().height-cards[1].getBoundingClientRect().height)<1);
        check("Desktop no horizontal overflow", doc.documentElement.scrollWidth<=win.innerWidth+1);
        links[0].focus(); await wait(240);
        // Headless virtual time does not reliably advance compositor transitions.
        cards[0].getAnimations({subtree:true}).forEach(animation=>animation.finish());
        check("Keyboard focus reaches link with visible outline", doc.activeElement === links[0] && style(links[0]).outlineStyle === "solid" && style(links[0]).outlineWidth === "2px", {active: doc.activeElement.outerHTML.slice(0,200), focused:doc.hasFocus(), outline:style(links[0]).outline, classes:cards.map(card=>card.className)});
        check("Focus edge visible and movement respects reduced motion", style(cards[0],"::before").opacity === "1" && (reduced ? style(cards[0]).transform === "none" : style(cards[0]).transform.includes("-4")));
        if(reduced) check("Reduced motion removes transition and arrow motion", style(cards[0]).transitionDuration === "0s" && style(cards[0].querySelector(".service-arrow")).transform === "none");
        links[0].blur(); win.scrollTo({top:0,behavior:"instant"}); await wait(40); section.scrollIntoView({behavior:"instant"}); await wait(100);
        check("Keyboard cancels pending entrance; return never replays it", cards.every(c=>!c.classList.contains("service-enter")));
        for(const width of [390,320]) {
            frame.style.width=width+"px"; await wait(100);
            check(`${width}px single-column and no overflow`, style(section.querySelector(".services-grid")).gridTemplateColumns.split(" ").length===1 && doc.documentElement.scrollWidth<=win.innerWidth+1);
            check(`${width}px direct links and touch targets`, links.every(a=>a.getBoundingClientRect().height>=44 && style(a).pointerEvents!=="none"));
        }
        check("No storage writes", JSON.stringify({...sessionStorage})===storageBefore);
        for(const href of ["community.html","peer-mentoring.html","showcase.html","freelance-services.html"]) {
            await load("../"+href); check(`${href} still loads without services restyling`, doc.querySelector("main") && !doc.getElementById("student-services"));
        }
    } catch(error) {check(`Unexpected: ${error.message}`,false);}
    document.documentElement.dataset.done="true";
})();
