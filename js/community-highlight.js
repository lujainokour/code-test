/* Lightweight syntax highlighting for community code blocks (Python, JavaScript, C#, C++).
   Returns plain-text tokens; the page renders each as a <span> with textContent, so no HTML is
   ever parsed. Joining the token texts always gives back the original code exactly. */
(() => {
    "use strict";
    const words = list => new Set(list.split(" "));
    const LANGS = {
        python: { line: "#", block: null, quotes: ["\"\"\"", "'''", "\"", "'"], keywords: words("and as assert async await break class continue def del elif else except False finally for from global if import in is lambda None nonlocal not or pass raise return True try while with yield print len range input int float str list dict set tuple self") },
        javascript: { line: "//", block: ["/*", "*/"], quotes: ["`", "\"", "'"], keywords: words("async await break case catch class const continue debugger default delete do else export extends false finally for function if import in instanceof let new null of return static super switch this throw true try typeof undefined var void while yield console") },
        csharp: { line: "//", block: ["/*", "*/"], quotes: ["\"", "'"], keywords: words("abstract as base bool break byte case catch char class const continue decimal default delegate do double else enum false finally float for foreach if in int interface internal is long namespace new null object out override private protected public readonly ref return static string struct switch this throw true try using var virtual void while Console") },
        cpp: { line: "//", block: ["/*", "*/"], quotes: ["\"", "'"], keywords: words("auto bool break case catch char class const constexpr continue default delete do double else enum false float for if include int long namespace new nullptr private protected public return short signed sizeof static std struct switch template this throw true try typedef unsigned using virtual void while cout cin endl string vector") }
    };
    function tokens(code, language) {
        const text = String(code ?? ""), lang = LANGS[language];
        if (!lang) return text ? [{ type: "plain", text }] : [];
        const out = [];
        const push = (type, value) => { if (!value) return; const last = out[out.length - 1]; if (last && last.type === type && type === "plain") last.text += value; else out.push({ type, text: value }); };
        let i = 0;
        while (i < text.length) {
            const rest = text.slice(i);
            if (lang.line && rest.startsWith(lang.line)) { const end = text.indexOf("\n", i); const stop = end < 0 ? text.length : end; push("com", text.slice(i, stop)); i = stop; continue; }
            if (lang.block && rest.startsWith(lang.block[0])) { const end = text.indexOf(lang.block[1], i + 2); const stop = end < 0 ? text.length : end + lang.block[1].length; push("com", text.slice(i, stop)); i = stop; continue; }
            const quote = lang.quotes.find(q => rest.startsWith(q));
            if (quote) {
                let j = i + quote.length;
                while (j < text.length) {
                    if (text[j] === "\\") { j += 2; continue; }
                    if (text.startsWith(quote, j)) { j += quote.length; break; }
                    if (quote.length === 1 && quote !== "`" && text[j] === "\n") break;
                    j++;
                }
                j = Math.min(j, text.length); push("str", text.slice(i, j)); i = j; continue;
            }
            const number = /^\d[\d_]*(\.\d+)?/.exec(rest);
            if (number && !/[\w$]/.test(text[i - 1] || "")) { push("num", number[0]); i += number[0].length; continue; }
            const word = /^[A-Za-z_$][\w$]*/.exec(rest);
            if (word) {
                const value = word[0], after = text.slice(i + value.length).match(/^\s*\(/);
                push(lang.keywords.has(value) ? "kw" : after ? "fn" : "plain", value); i += value.length; continue;
            }
            push("plain", text[i]); i++;
        }
        return out;
    }
    window.communityHighlight = Object.freeze({ tokens, languages: Object.keys(LANGS) });
})();
