declare let __webpack_public_path__: string;
__webpack_public_path__ = (window as any).hedietMonacoEditorPublicPath;

import { LexerFactory, matches, or } from "typed-lexer";
import { loadMonaco } from "./monaco-loader";

export class TextLexerFactory extends LexerFactory<
	"mention" | "reference" | "text",
	undefined
> {
	constructor() {
		super(undefined);
		this.addSimpleRule(/#([a-zA-Z0-9]*)/, "reference");
		this.addSimpleRule(/@([a-zA-Z0-9]*)/, "mention");
		this.addSimpleRule(/./, "text");
	}
}

class GithubQuery {
	private cache = new Map<string, any>();

	public async getMentionSuggestions(
		mentionUrl: string
	): Promise<
		{
			type: "user";
			id: number;
			login: string;
			name: string;
		}[]
	> {
		if (this.cache.has(mentionUrl)) {
			return this.cache.get(mentionUrl);
		}

		const r = await fetch(mentionUrl, {
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
		});

		const data = await r.json();
		this.cache.set(mentionUrl, data);
		return data;
	}

	public async getIssueSuggestions(
		issueUrl: string
	): Promise<{
		suggestions: {
			type: "issue" | "pr";
			id: number;
			number: number;
			title: string;
		}[];
	}> {
		if (this.cache.has(issueUrl)) {
			return this.cache.get(issueUrl);
		}

		const r = await fetch(issueUrl, {
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
		});

		const data = await r.json();
		this.cache.set(issueUrl, data);
		return data;
	}
}

async function main() {
	const q = new GithubQuery();

	const textArea: HTMLTextAreaElement = document.getElementById(
		"new_comment_field"
	) as any;
	textArea.style.display = "none";
	const editorRoot = textArea.parentNode!;

	const { mentionUrl, issueUrl } = (editorRoot as any).dataset;

	const editorNode = document.createElement("div");
	editorNode.style.display = "flex";
	editorNode.style.boxSizing = "border-box";
	editorNode.style.border = "1px solid #c3c8cf";
	editorNode.style.paddingBottom = "10px";
	editorRoot.appendChild(editorNode);

	const monacoContainer = document.createElement("div");
	monacoContainer.className = "monaco-container";
	monacoContainer.style.minWidth = "0";
	monacoContainer.style.minHeight = "0";
	monacoContainer.style.flex = "1";
	monacoContainer.style.height = `200px`;

	editorNode.appendChild(monacoContainer);

	const monaco = await loadMonaco();
	const model = monaco.editor.createModel(textArea.value, "markdown");

	monaco.languages.registerCompletionItemProvider("markdown", {
		triggerCharacters: ["@", "#"],
		provideCompletionItems: async function (model, position) {
			const line = model.getLineContent(position.lineNumber);
			const result = new TextLexerFactory().getLexerFor(line);

			let currentToken:
				| {
						kind: "mention" | "reference";
						startPos: number;
						length: number;
				  }
				| undefined = undefined;
			while (result.next()) {
				const c = result.getCur();
				if (
					c.startPos <= position.column &&
					position.column <= c.startPos + c.length + 1
				) {
					console.log("token", c.token);
					if (c.token !== "text") {
						currentToken = {
							kind: c.token,
							length: c.length,
							startPos: c.startPos,
						};
					}
					break;
				}
			}
			if (!currentToken) {
				return {
					suggestions: [],
				};
			}

			const range = {
				startLineNumber: position.lineNumber,
				endLineNumber: position.lineNumber,
				startColumn: currentToken.startPos + 1,
				endColumn: currentToken.startPos + 1 + currentToken.length,
			};
			console.log(range, position.column);
			if (currentToken.kind === "mention") {
				const data = await q.getMentionSuggestions(mentionUrl);
				console.log(data);
				return {
					suggestions: data.map((s) => ({
						label: s.name,
						insertText: `@${s.login}`,
						filterText: `@${s.name} ${s.login}`,
						detail: `@${s.login}`,
						kind: monaco.languages.CompletionItemKind.Function,
						documentation: s.type,
						range: range,
					})),
				};
			} else {
				const data = await q.getIssueSuggestions(issueUrl);
				console.log(data);
				return {
					suggestions: data.suggestions.map((s) => ({
						label: s.title,
						filterText: `#${s.title} ${s.number}`,
						insertText: `#${s.number}`,
						detail: `#${s.number}`,
						kind: monaco.languages.CompletionItemKind.Function,
						documentation: s.type,
						range: range,
					})),
				};
			}
		},
	});

	const editor = monaco.editor.create(monacoContainer, {
		model,
		automaticLayout: true,
		minimap: { enabled: false },
		scrollBeyondLastLine: false,
	});

	model.onDidChangeContent(() => {
		const value = model.getValue();
		textArea.value = value;
		textArea.dispatchEvent(new Event("input"));
	});

	editor.onDidContentSizeChange((e) => {
		monacoContainer.style.height = `${Math.max(
			100,
			e.contentHeight + 2
		)}px`;
		editor.layout();
	});
}

main();
