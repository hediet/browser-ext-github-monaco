declare let __webpack_public_path__: string;
__webpack_public_path__ = (window as any).hedietMonacoEditorPublicPath;

import { LexerFactory, matches, or } from "typed-lexer";
import { loadMonaco, Monaco } from "./monaco-loader";
import { editor, Position, languages } from "monaco-editor";

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

class GithubApi {
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

class EditorWrapper {
	constructor(
		private readonly textArea: HTMLTextAreaElement,
		private readonly monaco: Monaco,
		completionController: CompletionController
	) {
		textArea.style.display = "none";
		const editorRoot = textArea.parentNode!;

		const editorNode = document.createElement("div");
		editorNode.style.display = "flex";
		editorNode.style.boxSizing = "border-box";
		editorNode.style.paddingBottom = "10px";
		editorRoot.appendChild(editorNode);

		const onEditorFocusChanged = (isFocused: boolean) => {
			console.log("onEditorFocus", isFocused);
			if (isFocused) {
				editorNode.style.border = "1px solid #4a9eff";
				textArea.dispatchEvent(new Event("focus"));
			} else {
				editorNode.style.border = "1px solid #c3c8cf";
				textArea.dispatchEvent(new Event("blur"));
			}
		};

		onEditorFocusChanged(false);

		const monacoContainer = document.createElement("div");
		monacoContainer.className = "monaco-container";
		monacoContainer.style.minWidth = "300px";
		monacoContainer.style.minHeight = "0";
		monacoContainer.style.flex = "1";
		monacoContainer.style.height = `200px`;

		editorNode.appendChild(monacoContainer);

		const model = monaco.editor.createModel(textArea.value, "markdown");

		const { mentionUrl, issueUrl } = (editorRoot as any).dataset;
		completionController.registerUrls(model, { mentionUrl, issueUrl });

		const editor = monaco.editor.create(monacoContainer, {
			model,
			automaticLayout: true,
			minimap: { enabled: false },
			scrollBeyondLastLine: false,
			wordWrap: "on",
		});

		editor.onDidFocusEditorText(() => onEditorFocusChanged(true));
		editor.onDidFocusEditorWidget(() => onEditorFocusChanged(true));
		editor.onDidBlurEditorText(() => onEditorFocusChanged(false));
		editor.onDidBlurEditorWidget(() => onEditorFocusChanged(false));

		textArea.addEventListener("change", () => {
			if (model.getValue() !== textArea.value) {
				model.setValue(textArea.value);
			}
		});
		editor.onDidChangeCursorSelection((e) => {
			const startOffset = model.getOffsetAt(
				e.selection.getStartPosition()
			);
			const endOffset = model.getOffsetAt(e.selection.getEndPosition());

			textArea.selectionStart = startOffset;
			textArea.selectionEnd = endOffset;
		});

		model.onDidChangeContent((e) => {
			if (e.changes.length === 1 && e.changes[0].text === " ") {
				console.log("should cancel");
				editor.trigger("editor", "hideSuggestWidget", undefined);
			}
			const value = model.getValue();
			textArea.value = value;
			textArea.dispatchEvent(new Event("input"));
		});

		editor.onDidContentSizeChange((e) => {
			monacoContainer.style.height = `${Math.max(
				100,
				e.contentHeight + 2
			)}px`;
			console.log("Content size changed", monacoContainer.style.height);
			//editor.layout();
		});

		const resizeObserver = new ResizeObserver(() => {
			editor.layout();
		});
		resizeObserver.observe(editorRoot);
	}
}

class CompletionController {
	private readonly urls = new Map<
		editor.ITextModel,
		{ mentionUrl: string; issueUrl: string }
	>();

	constructor(
		private readonly monaco: Monaco,
		private readonly api: GithubApi
	) {
		monaco.languages.registerCompletionItemProvider("markdown", {
			triggerCharacters: ["@", "#"],
			provideCompletionItems: (model, position) =>
				this.provideCompletionItems(model, position),
		});
	}

	public registerUrls(
		model: editor.ITextModel,
		urls: { mentionUrl: string; issueUrl: string }
	): void {
		this.urls.set(model, urls);
	}

	private async provideCompletionItems(
		model: editor.ITextModel,
		position: Position
	): Promise<languages.CompletionList> {
		const urls = this.urls.get(model);
		if (!urls) {
			return { suggestions: [] };
		}

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
			const data = await this.api.getMentionSuggestions(urls.mentionUrl);
			console.log(data);
			return {
				suggestions: data.map((s) => ({
					label: s.name,
					insertText: `@${s.login}`,
					filterText: `@${s.name} ${s.login}`,
					detail: `@${s.login}`,
					kind: this.monaco.languages.CompletionItemKind.Function,
					documentation: s.type,
					range: range,
				})),
			};
		} else {
			const data = await this.api.getIssueSuggestions(urls.issueUrl);
			console.log(data);
			return {
				suggestions: data.suggestions.map((s) => ({
					label: s.title,
					filterText: `#${s.title} ${s.number}`,
					insertText: `#${s.number}`,
					detail: `#${s.number}`,
					kind: this.monaco.languages.CompletionItemKind.Function,
					documentation: s.type,
					range: range,
				})),
			};
		}
	}
}

async function main() {
	const githubApi = new GithubApi();
	const monaco = await loadMonaco();
	const completionController = new CompletionController(monaco, githubApi);

	for (const textArea of [
		...(document.getElementsByClassName("comment-form-textarea") as any),
	]) {
		console.log(textArea);
		new EditorWrapper(textArea, monaco, completionController);
	}
	/*
	const textArea: HTMLTextAreaElement = document.getElementById(
		"new_comment_field"
	) as any;
*/
}

main();
