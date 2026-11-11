/* Explicit opt-in; this harness replaces fixture data in a disposable profile. */
(async () => {
    if (new URLSearchParams(location.search).get("run") !== "disposable-profile") return;
    const frame = document.getElementById("subject"), output = document.getElementById("results");
    const checks = [], references = new Set(), root = new URL("../", location.href);
    const account = {name:"Stability Student",email:"stability@example.com",role:"student",isDemo:true};
    const routes = Object.values(await (await fetch("../docs/page-routes.json")).json());
    // The legacy route manifest predates the separate administrator sign-in.
    if (!routes.includes("pages/auth/admin-login.html")) routes.push("pages/auth/admin-login.html");
    const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
    function check(name, passed, details) {
        checks.push({name,passed:Boolean(passed),...(!passed ? {details} : {})});
        output.textContent = JSON.stringify({passed:checks.filter(c=>c.passed).length,total:checks.length,checks},null,2);
    }
    async function load(route) {
        await new Promise((resolve,reject) => {
            const timer=setTimeout(()=>reject(new Error("Load timed out: "+route)),10000);
            frame.onload=()=>{clearTimeout(timer);resolve();};
            frame.src=new URL(route,root).href;
        });
        await wait(35);
        const win=frame.contentWindow,doc=win.document;
        doc.querySelector("#cm-user-guide[open] .cm-guide-skip")?.click();
        // Finish finite entrance animations to measure the settled layout.
        doc.getAnimations().forEach(animation=>{if(Number.isFinite(animation.effect?.getComputedTiming().endTime))animation.finish();});
        return {win,doc};
    }
    try {
        const manifest = Object.values(await (await fetch("../docs/page-routes.json")).json());
        check("All manifest routes and the admin sign-in are included once", manifest.every(route => routes.includes(route)) && routes.includes("pages/auth/admin-login.html") && new Set(routes).size === routes.length);
        testStorage.clear();
        const legacyKey="codementor-demo-chat-variables",legacy='[{"role":"user","text":"Unassigned historical conversation"}]';
        sessionStorage.setItem(legacyKey,legacy);
        for (const role of ["guest","student"]) {
            if(role==="student") {
                testStorage.setItem("codementor-demo-session",JSON.stringify(account));
                testStorage.setItem("codementor-demo-onboarding",JSON.stringify({language:"python",experience:"beginner",goal:"foundations"}));
            } else testStorage.removeItem("codementor-demo-session");
            for(const theme of ["light"]) {
                localStorage.setItem("codementor-ui-theme",theme);
                for(const width of [390,768,1366]) {
                    frame.style.width=width+"px";
                    for(const route of routes) {
                        const {win,doc}=await load(route), label=`${role}/${theme}/${width}: ${route}`;
                        check(label+": main content renders",route==="pages/auth/signup.html"
                            ? doc.querySelector("main .auth-panel[aria-labelledby='signup-title'] #signup-title")?.textContent.trim()==="Start your learning journey." && !!doc.querySelector("main #signup-form")
                            : !!doc.querySelector("main h1"),win.location.href);
                        check(label+": no horizontal overflow",doc.documentElement.scrollWidth<=win.innerWidth+1,{scroll:doc.documentElement.scrollWidth,viewport:win.innerWidth});
                        check(label+": current light palette is applied",doc.documentElement.dataset.theme === "light");
                        if(width===1366 && theme==="light") {
                            for(const node of doc.querySelectorAll("[href],[src],[action],[poster]")) for(const attr of ["href","src","action","poster"]) {
                                const raw=node.getAttribute(attr);if(!raw || /^(?:data:|blob:|mailto:|tel:|javascript:)/.test(raw))continue;
                                const url=new URL(raw,doc.baseURI);if(url.origin===location.origin){url.hash="";references.add(url.href);}
                            }
                            await Promise.all([...doc.images].map(image=>image.decode().catch(()=>{})));
                            check(label+": local images decode",[...doc.images].filter(image=>new URL(image.src).origin===location.origin).every(image=>image.complete&&image.naturalWidth>0));
                        }
                    }
                }
            }
        }
        for(const url of references) {
            const response=await fetch(url,{method:"HEAD"});
            check("Local reference: "+new URL(url).pathname+new URL(url).search,response.ok,{status:response.status});
        }
        frame.style.width="390px";
        const before=testStorage.getItem("codementor-demo-learning");
        for(const page of ["module","lesson","level-assessment"]) for(const level of ["0","-1","7","text"]) {
            const {doc}=await load(`pages/student/${page}.html?level=${level}`);
            check(`${page}: invalid level ${level} cannot open Level 1`,doc.querySelector("main h1").textContent==="Level not available yet"&&!doc.querySelector("#level-assessment-form:not([hidden])")&&testStorage.getItem("codementor-demo-learning")===before);
        }
        check("Page audit preserves unassigned historical mentor records byte for byte",sessionStorage.getItem(legacyKey)===legacy);
    } catch(error) {check("Audit execution error: "+error.message,false,{stack:error.stack});}
    output.dataset.done="true";
})();
