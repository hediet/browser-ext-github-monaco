declare let __webpack_public_path__: string;
__webpack_public_path__ = (window as any).hedietMonacoEditorPublicPath;

import { loadMonaco } from "../monaco-loader";
import { GithubApi } from "./GithubApi";
import { EditorWrapper, isMonacoNode } from "./EditorWrapper";
import { CompletionController } from "./CompletionController";

async function main() {
	const githubApi = new GithubApi();
	const monaco = await loadMonaco();
	const completionController = new CompletionController(monaco, githubApi);

	function updateDocument() {
		for (const textArea of [
			...(document.getElementsByClassName(
				"comment-form-textarea"
			) as any),
		]) {
			EditorWrapper.wrap(textArea, monaco, completionController);
		}

		for (const div of [
			...(document.getElementsByClassName("hediet-monaco-node") as any),
		]) {
			if (!isMonacoNode(div)) {
				div.remove();
			}
		}
	}

	let timeout: NodeJS.Timeout | undefined = undefined;
	const mutationObserver = new MutationObserver(() => {
		if (!timeout) {
			timeout = setTimeout(() => {
				updateDocument();
				timeout = undefined;
			}, 50);
		}
	});

	mutationObserver.observe(document.body, {
		subtree: true,
		childList: true,
	});
}

main();
