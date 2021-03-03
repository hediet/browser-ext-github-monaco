declare let __webpack_public_path__: string;
__webpack_public_path__ = document.head.dataset
	.hedietMonacoEditorPublicPath as string;

import type { MonacoOptions } from "../settings";

import { loadMonaco } from "../monaco-loader";
import { GithubApi } from "./GithubApi";
import {
	EditorWrapper,
	editorWrapperDivClassName,
	isMonacoNode,
} from "./EditorWrapper";
import { GitHubCompletionController } from "./GitHubCompletionController";
import { EmojiCompletionController } from "./EmojiCompletionController";

async function main(settings: MonacoOptions) {
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
				githubApi,
				settings,
			);
		}

		// Github seems to copy dom nodes around.
		// Github also copies the monaco editor which leads to problems.
		// We fix this by just removing all "dead" dom nodes.
		for (const div of [
			...(document.getElementsByClassName(
				editorWrapperDivClassName
			) as any),
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

main(JSON.parse(document.head.dataset.hedietMonacoEditorSettings!));
