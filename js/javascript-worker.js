/* Worker body is instantiated inside an opaque-origin sandbox, never in the app window. */
(() => {
    function workerBody() {
        "use strict";
        const send = self.postMessage.bind(self);
        self.onmessage = ({ data }) => {
            let output = "", position = 0;
            const lines = String(data.input || "").replace(/\r\n/g, "\n").split("\n");
            const input = () => { if (position >= lines.length) throw Error("No more input lines."); return lines[position++]; };
            const format = value => typeof value === "string" ? value : value === undefined ? "undefined" : typeof value === "object" && value !== null ? JSON.stringify(value) : String(value);
            const log = (...values) => { const line = values.map(format).join(" ") + "\n"; if (output.length + line.length > 65536) throw Error("Output exceeded 64 KB."); output += line; };
            const console = Object.freeze({ log, info: log, warn: log, error: log });
            // The frame CSP additionally blocks network access and external code imports.
            for (const name of ["postMessage", "fetch", "XMLHttpRequest", "WebSocket", "EventSource", "importScripts", "Worker", "SharedWorker", "BroadcastChannel"]) {
                try { Object.defineProperty(self, name, { value: undefined, writable: false, configurable: false }); } catch { /* Opaque origin and CSP remain enforced by the browser. */ }
            }
            try {
                new Function("input", "readLine", "console", '"use strict";\n' + data.code)(input, input, console);
                send({ type: "result", output, error: "" });
            } catch (error) { send({ type: "result", output, error: `${error.name || "Error"}: ${String(error.message || error).slice(0, 2000)}` }); }
        };
    }
    window.javascriptWorkerSource = `(${workerBody.toString()})();`;
})();
