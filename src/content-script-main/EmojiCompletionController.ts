import { Monaco } from "../monaco-loader";
import { editor, Position, languages, CancellationToken } from "monaco-editor";
import { TokenizerBuilder } from "./hediet-tokenizer";

export class EmojiCompletionController {
	constructor(private readonly monaco: Monaco) {
		monaco.languages.registerCompletionItemProvider(
			"markdown",
			new EmojiCompletionItemProvider()
		);
	}
}

class EmojiCompletionItemProvider implements languages.CompletionItemProvider {
	public readonly triggerCharacters = [];

	async provideCompletionItems(
		model: editor.ITextModel,
		position: Position,
		context: languages.CompletionContext,
		token: CancellationToken
	): Promise<languages.CompletionList> {
		const tokenInfo = emojiTokenizer.findFirstTokenAt(
			model.getLineContent(position.lineNumber),
			position.column - 1,
			true
		);

		if (!tokenInfo) {
			return { suggestions: [] };
		}

		const data = await import("gemoji");

		const range = {
			startLineNumber: position.lineNumber,
			endLineNumber: position.lineNumber,
			startColumn: tokenInfo.offset + 1,
			endColumn: tokenInfo.offset + 1 + tokenInfo.length,
		};

		return {
			suggestions: data.map((e) => ({
				label: `${e.emoji} :${e.names[0]}:`,
				tags: [],
				filterText: `:${e.names.join(" ")} ${e.tags.join(" ")}:`,
				insertText: `${e.emoji}`,
				range,
				kind: languages.CompletionItemKind.Function,
			})),
		};
	}
}

const emojiTokenizer = (() => {
	const b = new TokenizerBuilder<{ kind: "emoji" }>(undefined);
	b.addRule(/(:[\w\d_\+\-]*:?)/, [{ kind: "emoji" }]);
	return b.build();
})();
