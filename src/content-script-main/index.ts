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
import { SentenceInlineCompletionProvider } from "./InlineCompletionProvider";

async function main() {
	const settings = JSON.parse(
		document.head.dataset.hedietMonacoEditorSettings!
	) as MonacoOptions & { customInlineCompletions: string };

	const githubApi = new GithubApi();
	const monaco = await loadMonaco();
	const completionController = new GitHubCompletionController(
		monaco,
		githubApi
	);
	const emojiCompletionController = new EmojiCompletionController(monaco);
	const sentenceInlineCompletionProvider =
		new SentenceInlineCompletionProvider(
			monaco,
			settings.customInlineCompletions
		);

	function updateDocument() {
		const issueCommentBox = document.getElementById("issue_body");
		const wikiBox = document.getElementById("gollum-editor-body");
		for (const textArea of [issueCommentBox, wikiBox] as any[]) {
			if (!textArea) {
				continue;
			}

			EditorWrapper.wrap(
				textArea,
				monaco,
				completionController,
				githubApi,
				settings
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

main();
