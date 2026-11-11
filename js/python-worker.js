/* Runs only in a disposable worker, never in the UI thread or on the server. */
const runtimeURL = new URL("../vendor/pyodide/", self.location.href).href;
let runtime;
self.onmessage = async ({ data }) => {
    try {
        if (data.type === "init") {
            self.postMessage({ type: "status", message: "Loading the Python runtime..." });
            importScripts(`${runtimeURL}pyodide.js`);
            // Load the synchronous bootstrap before binary downloads. This also
            // supports simple development servers that handle one request at a time.
            importScripts(`${runtimeURL}pyodide.asm.js`);
            self.postMessage({ type: "status", message: "Preparing Python and its standard library..." });
            runtime = await loadPyodide({ indexURL: runtimeURL, stdout: text => self.postMessage({ type: "status", message: text }), stderr: text => self.postMessage({ type: "status", message: text }) });
            self.postMessage({ type: "ready" });
            return;
        }
        let count = 0;
        const lines = data.input.replace(/\r\n/g, "\n").split("\n");
        let output = "", errors = "";
        const append = (text, error = false) => {
            if (output.length + errors.length + text.length > 20000) throw new Error("Output limit reached. Check your loop or print statements.");
            if (error) errors += text + "\n"; else output += text + "\n";
        };
        runtime.setStdin({ stdin: () => count < lines.length ? lines[count++] : null });
        runtime.setStdout({ batched: text => append(text) });
        runtime.setStderr({ batched: text => append(text, true) });
        const scope = runtime.toPy({ __name__: "__main__" });
        try {
            await runtime.runPythonAsync(data.code, { globals: scope });
            self.postMessage({ type: "result", output, error: errors });
        } catch (error) {
            self.postMessage({ type: "result", output, error: String(error) });
        } finally { scope.destroy(); }
    } catch (error) { self.postMessage({ type: "failure", error: String(error) }); }
};
