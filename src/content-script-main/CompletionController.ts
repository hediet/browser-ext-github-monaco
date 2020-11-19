import { Monaco } from "../monaco-loader";
import { editor, Position, languages } from "monaco-editor";
import { GithubApi } from "./GithubApi";
import { LexerFactory } from "typed-lexer";

export class CompletionController {
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
		if (currentToken.kind === "mention") {
			const data = await this.api.getMentionSuggestions(urls.mentionUrl);
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

class TextLexerFactory extends LexerFactory<
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
