(() => {
    "use strict";
    let active = null;
    function sandboxHost() {
        "use strict";
        let worker;
        window.addEventListener("message", ({ source, data }) => {
            if (source !== parent || !data || data.type !== "execute" || worker) return;
            const token = data.token;
            const url = URL.createObjectURL(new Blob([data.source], { type: "text/javascript" }));
            worker = new Worker(url); URL.revokeObjectURL(url);
            worker.onmessage = event => { if (event.data?.type === "result") parent.postMessage({ token, result: event.data }, "*"); };
            worker.onerror = () => parent.postMessage({ token, failure: "JavaScript worker could not start." }, "*");
            worker.postMessage({ code: data.code, input: data.input });
        });
        parent.postMessage({ type: "javascript-sandbox-ready" }, "*");
    }
    function execute(code, input = "", onStatus = () => {}) {
        if (active) return Promise.reject(Error("A program is already running."));
        if (typeof code !== "string" || code.length > 65536 || typeof input !== "string" || input.length > 65536) return Promise.reject(Error("Code and input must each be at most 64 KB."));
        return new Promise((resolve, reject) => {
            const frame = document.createElement("iframe"); frame.hidden = true; frame.title = "Isolated JavaScript execution"; frame.setAttribute("sandbox", "allow-scripts");
            const token = crypto.randomUUID(); let finished = false;
            const finish = (error, result) => { if (finished) return; finished = true; clearTimeout(timer); window.removeEventListener("message", receive); frame.remove(); active = null; if (error) reject(error); else resolve(result); };
            const receive = event => {
                if (event.source !== frame.contentWindow) return;
                const data = event.data;
                if (data?.type === "javascript-sandbox-ready") { onStatus("Running JavaScript..."); frame.contentWindow.postMessage({ type: "execute", token, source: window.javascriptWorkerSource, code, input }, "*"); }
                else if (data?.token === token) { if (data.failure) finish(Error(data.failure)); else if (data.result?.type === "result") finish(null, data.result); }
            };
            const timer = setTimeout(() => finish(Error("Execution exceeded 5 seconds. Check for an infinite loop.")), 5000);
            active = { stop: () => finish(Error("Execution stopped. Your code was kept.")) };
            window.addEventListener("message", receive);
            const policy = "default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval' blob:; worker-src blob:; connect-src 'none';";
            frame.srcdoc = '<!doctype html><meta http-equiv="Content-Security-Policy" content="' + policy + '"><script>(' + sandboxHost.toString() + ')();<\/script>';
            onStatus("Preparing isolated JavaScript worker..."); document.body.append(frame);
        });
    }
    window.javascriptRunner = Object.freeze({ execute, stop: () => active?.stop() });
})();
