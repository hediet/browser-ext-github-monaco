import { Monaco } from "../monaco-loader";
import { CompletionController } from "./CompletionController";

export interface MonacoNode extends HTMLDivElement {
	hedietEditorWrapper: EditorWrapper;
}

export function isMonacoNode(n: unknown): n is MonacoNode {
	return typeof n === "object" && n !== null && "hedietEditorWrapper" in n;
}

type Theme = "light" | "dark";

function getGithubTheme(): Theme {
	try {
		return (document.body.parentNode as any).dataset.colorMode as any;
	} catch (e) {
		console.warn("Could not read github colorMode");
		return "light";
	}
}

export class EditorWrapper {
	public static wrap(
		textArea: HTMLTextAreaElement,
		monaco: Monaco,
		completionController: CompletionController
	) {
		if (textArea.hedietEditorWrapper) {
			return textArea.hedietEditorWrapper;
		}
		return new EditorWrapper(
			textArea,
			monaco,
			completionController,
			getGithubTheme()
		);
	}

	private disposed = false;
	private readonly disposables = new Array<() => any>();

	private constructor(
		private readonly textArea: HTMLTextAreaElement,
		monaco: Monaco,
		completionController: CompletionController,
		theme: "light" | "dark"
	) {
		textArea.hedietEditorWrapper = this;
		textArea.style.display = "none";
		const editorRoot = textArea.parentNode!;

		const monacoNode = document.createElement("div");
		monacoNode.className = "hediet-monaco-node";
		monacoNode.style.display = "flex";
		monacoNode.style.boxSizing = "border-box";
		monacoNode.style.paddingBottom = "10px";
		(monacoNode as MonacoNode).hedietEditorWrapper = this;
		editorRoot.appendChild(monacoNode);

		this.disposables.push(() => {
			monacoNode.remove();
		});

		const onEditorFocusChanged = (isFocused: boolean) => {
			if (isFocused) {
				monacoNode.style.border = "1px solid #4a9eff";
				textArea.dispatchEvent(new Event("focus"));
			} else {
				monacoNode.style.border = "1px solid #c3c8cf";
				textArea.dispatchEvent(new Event("blur"));
			}
		};

		onEditorFocusChanged(false);

		const monacoContainer = document.createElement("div");
		monacoContainer.className = "hediet-monaco-container";
		monacoContainer.style.minWidth = "300px";
		monacoContainer.style.minHeight = "0";
		monacoContainer.style.flex = "1";
		monacoContainer.style.height = `200px`;

		monacoNode.appendChild(monacoContainer);

		const model = monaco.editor.createModel(textArea.value, "markdown");

		const { mentionUrl, issueUrl } = (editorRoot as any).dataset;
		completionController.registerUrls(model, { mentionUrl, issueUrl });

		const editor = monaco.editor.create(monacoContainer, {
			model,
			automaticLayout: true,
			minimap: { enabled: false },
			scrollBeyondLastLine: false,
			wordWrap: "on",
			theme: theme === "dark" ? "vs-dark" : "vs",
		});

		editor.addAction({
			id: "github.submit",
			label: "Submit",
			run: () => {
				const ctrlEnterEvent = new KeyboardEvent("keydown", {
					key: "Enter",
					code: "Enter",
					ctrlKey: true,
				});
				textArea.dispatchEvent(ctrlEnterEvent);
			},
			keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter],
		});

		this.disposables.push(() => editor.dispose());
		this.disposables.push(() => model.dispose());

		editor.onDidFocusEditorText(() => onEditorFocusChanged(true));
		editor.onDidFocusEditorWidget(() => onEditorFocusChanged(true));
		editor.onDidBlurEditorText(() => onEditorFocusChanged(false));
		editor.onDidBlurEditorWidget(() => onEditorFocusChanged(false));

		const interval = setInterval(() => {
			if (model.getValue() !== textArea.value) {
				model.setValue(textArea.value);
			}
			if (!document.body.contains(textArea)) {
				this.dispose();
			}
		}, 100);
		this.disposables.push(() => clearInterval(interval));

		textArea.addEventListener("change", () => {
			if (model.getValue() !== textArea.value) {
				model.setValue(textArea.value);
			}
		});
		textArea.addEventListener("input", () => {
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
		});

		const resizeObserver = new ResizeObserver(() => {
			editor.layout();
		});
		resizeObserver.observe(editorRoot);
	}

	dispose() {
		if (this.disposed) {
			return;
		}
		this.disposed = true;
		for (const d of this.disposables) {
			d();
		}
	}
}

declare class ResizeObserver {
	constructor(handler: () => void);
	observe(elem: any): void;
}
