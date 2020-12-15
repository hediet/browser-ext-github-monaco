import { Monaco } from "../monaco-loader";
import { editor, Position, languages } from "monaco-editor";
import { GithubApi } from "./GithubApi";
import { TokenizerBuilder } from "./hediet-tokenizer";

export class GitHubCompletionController {
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

		const token = textTokenizer.findFirstTokenAt(
			model.getLineContent(position.lineNumber),
			position.column - 1,
			true
		);

		if (!token) {
			return {
				suggestions: [],
			};
		}

		const range = {
			startLineNumber: position.lineNumber,
			endLineNumber: position.lineNumber,
			startColumn: token.offset + 1,
			endColumn: token.offset + 1 + token.length,
		};
		if (token.kind === "mention") {
			const data = await this.api.getMentionSuggestions(urls.mentionUrl);
			return {
				suggestions: data.map((s) => ({
					label: `@${s.login} (${s.name})`,
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
					label: `#${s.number} (${s.title})`,
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

const textTokenizer = (() => {
	const b = new TokenizerBuilder<{ kind: "reference" | "mention" }>(
		undefined
	);

	b.addRule(/(#[a-zA-Z0-9]*)/, [{ kind: "reference" }]);
	b.addRule(/(@[a-zA-Z0-9]*)/, [{ kind: "mention" }]);
	return b.build();
})();
