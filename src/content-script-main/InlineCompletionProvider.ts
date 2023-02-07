import type * as monaco from "monaco-editor";
import { Monaco } from "../monaco-loader";

export class SentenceInlineCompletionProvider
	implements monaco.languages.InlineCompletionsProvider
{
	private readonly availableInlineCompletions: string[];

	constructor(
		private readonly monaco: Monaco,
		customInlineCompletions: string
	) {
		this.monaco.languages.registerInlineCompletionsProvider(
			"markdown",
			this
		);

		this.availableInlineCompletions = customInlineCompletions.split("\n");
	}

	provideInlineCompletions(
		model: monaco.editor.ITextModel,
		position: monaco.Position,
		context: monaco.languages.InlineCompletionContext,
		token: monaco.CancellationToken
	): monaco.languages.ProviderResult<
		monaco.languages.InlineCompletions<monaco.languages.InlineCompletion>
	> {
		// Going backwards from the cursor position until the start of the line, is there a suggestion that has that as prefix?

		const completions: monaco.languages.InlineCompletion[] = [];

		const line = model.getLineContent(position.lineNumber);
		for (let i = 3; i < 100 && i <= position.column - 1; i++) {
			const prefix = line.substring(
				position.column - i - 1,
				position.column - 1
			);
			const suggestions = this.availableInlineCompletions.filter((s) =>
				s.startsWith(prefix)
			);
			for (const suggestion of suggestions) {
				completions.push({
					insertText: suggestion,
					range: new this.monaco.Range(
						position.lineNumber,
						position.column - i,
						position.lineNumber,
						position.column
					),
				});
			}
		}

		return {
			items: completions,
		};
	}

	handleItemDidShow?(
		completions: monaco.languages.InlineCompletions<monaco.languages.InlineCompletion>,
		item: monaco.languages.InlineCompletion
	): void {}

	freeInlineCompletions(
		completions: monaco.languages.InlineCompletions<monaco.languages.InlineCompletion>
	): void {}
}
