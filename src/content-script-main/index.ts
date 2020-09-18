declare let __webpack_public_path__: string;
__webpack_public_path__ = (window as any).hedietMonacoEditorPublicPath;

import { LexerFactory, matches, or } from "typed-lexer";
import { loadMonaco } from "../monaco-loader";
import { GithubApi } from "./GithubApi";
import { EditorWrapper } from "./EditorWrapper";
import { CompletionController } from "./CompletionController";

async function main() {
	const githubApi = new GithubApi();
	const monaco = await loadMonaco();
	const completionController = new CompletionController(monaco, githubApi);

	setInterval(() => {
		for (const textArea of [
			...(document.getElementsByClassName(
				"comment-form-textarea"
			) as any),
		]) {
			EditorWrapper.wrap(textArea, monaco, completionController);
		}
	}, 100);
}

main();
