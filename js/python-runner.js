(() => {
    "use strict";
    const workerURL = new URL("python-worker.js", document.currentScript.src);
    let active = null;
    function execute(code, input = "", onStatus = () => {}) {
        if (active) return Promise.reject(new Error("A program is already running."));
        return new Promise((resolve, reject) => {
            const worker = new Worker(workerURL);
            let timer;
            const finish = (error, result) => {
                clearTimeout(timer); worker.terminate(); active = null;
                if (error) reject(error); else resolve(result);
            };
            active = { stop: () => finish(new Error("Execution stopped. Your code was kept.")) };
            timer = setTimeout(() => finish(new Error("Python could not load. Reload the page and check that the runtime files are available.")), 90000);
            worker.onerror = () => finish(new Error("Python could not start. Open the site through a local HTTP server."));
            worker.onmessage = ({ data }) => {
                if (data.type === "status") onStatus(data.message);
                else if (data.type === "ready") {
                    clearTimeout(timer); onStatus("Running Python...");
                    timer = setTimeout(() => finish(new Error("Execution exceeded 5 seconds. Check for an infinite loop.")), 5000);
                    worker.postMessage({ type: "run", code, input });
                } else if (data.type === "result") finish(null, data);
                else if (data.type === "failure") finish(new Error(data.error));
            };
            onStatus("Loading Python. The first run can take a moment...");
            worker.postMessage({ type: "init" });
        });
    }
    window.pythonRunner = Object.freeze({ execute, stop: () => active?.stop() });
})();
