declare let __webpack_public_path__: string;
__webpack_public_path__ = document.head.dataset
	.hedietMonacoEditorPublicPath as string;

import { loadMonaco } from "../monaco-loader";
import { GithubApi } from "./GithubApi";
import { EditorWrapper, isMonacoNode } from "./EditorWrapper";
import { GitHubCompletionController } from "./GitHubCompletionController";
import { EmojiCompletionController } from "./EmojiCompletionController";

async function main() {
	const githubApi = new GithubApi();
	const monaco = await loadMonaco();
	const completionController = new GitHubCompletionController(
		monaco,
		githubApi
	);
	const emojiCompletionController = new EmojiCompletionController(monaco);

	function updateDocument() {
		for (const textArea of [
			...(document.getElementsByClassName(
				"comment-form-textarea"
			) as any),
		]) {
			EditorWrapper.wrap(
				textArea,
				monaco,
				completionController,
				githubApi
			);
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

	updateDocument();
}

main();
