console.log("hello world from content script");

/**
 * @param url {string}
 */
function loadScript(url) {
    const pluginScript = document.createElement("script");
    pluginScript.type = "text/javascript";
    const p = new Promise((res) => {
        pluginScript.onload = res;
    });
    pluginScript.src = url;
    document.getElementsByTagName("head")[0].appendChild(pluginScript);
    return p;
}

async function main() {
    await loadScript(
        "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.20.0/min/vs/loader.min.js"
    );
    require.config({
        paths: {
            vs:
                "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.20.0/min/vs",
        },
    });
    require(["vs/editor/editor.main"], function () {
        monaco.languages.registerCompletionItemProvider("markdown", {
            triggerCharacters: ["@", "#"],
            provideCompletionItems: async function (model, position) {
                const r = await fetch(
                    "/suggestions/issue?repository=TypeScript&user_id=microsoft&issue_suggester=1",
                    {
                        method: "GET",
                        headers: {
                            accept: "application/json",
                            "cache-control": "no-cache",
                            pragma: "no-cache",
                            "sec-fetch-dest": "empty",
                            "sec-fetch-mode": "cors",
                            "sec-fetch-site": "same-origin",
                            "x-requested-with": "XMLHttpRequest",
                        },
                    }
                );
                /**
                 * @type {{ suggestions: { id: number, number: number, title: string, type: "issue" | "pr" }[] }}
                 */
                const data = await r.json();

                var range = {
                    startLineNumber: position.lineNumber,
                    endLineNumber: position.lineNumber,
                    startColumn: position.column,
                    endColumn: position.column,
                };

                return {
                    suggestions: data.suggestions.map((s) => ({
                        label: s.title,
                        kind: monaco.languages.CompletionItemKind.Function,
                        documentation: s.type,
                        range: range,
                    })),
                };
            },
        });

        console.log("initializing editor...");
        //const container = document.createElement("div");
        //container.id = "myContainer";
        const f = document.getElementById("new_comment_field");
        f.style.display = "none";
        const editorRoot = document.getElementById("new_comment_field")
            .parentNode;

        //editorRoot.dataset.mentionUrl

        const editorNode = document.createElement("div");
        editorNode.style.display = "flex";
        editorNode.style.boxSizing = "border-box";
        editorNode.style.border = "1px solid #c3c8cf";
        editorNode.style.paddingBottom = "10px";
        editorRoot.appendChild(editorNode);

        const monacoContainer = document.createElement("div");
        monacoContainer.className = "monaco-container";
        monacoContainer.style.minWidth = 0;
        monacoContainer.style.minHeight = 0;
        monacoContainer.style.flex = 1;

        editorNode.appendChild(monacoContainer);

        var editor = monaco.editor.create(monacoContainer, {
            value: "test\ntest\n\n\n\n\n",
            language: "markdown",
            automaticLayout: true,
            scrollBeyondLastLine: false,
        });

        const model = editor.getModel();
        model.onDidChangeContent(() => {
            const value = model.getValue();
            f.value = value;
            f.dispatchEvent(new Event("change"));
        });

        editor.onDidContentSizeChange((e) => {
            monacoContainer.style.height = `${e.contentHeight + 2}px`;
            editor.layout();
        });

        window.ed = editor;
    });
}

main();
