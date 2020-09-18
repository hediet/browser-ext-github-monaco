import { Monaco } from "../monaco-loader";
import { CompletionController } from "./CompletionController";

export class EditorWrapper {
	public static wrap(
		textArea: HTMLTextAreaElement,
		monaco: Monaco,
		completionController: CompletionController
	) {
		if (textArea.hedietEditorWrapper) {
			return textArea.hedietEditorWrapper;
		}
		return new EditorWrapper(textArea, monaco, completionController);
	}

	private readonly disposables = new Array<() => any>();

	private constructor(
		textArea: HTMLTextAreaElement,
		monaco: Monaco,
		completionController: CompletionController
	) {
		textArea.hedietEditorWrapper = this;
		textArea.style.display = "none";
		const editorRoot = textArea.parentNode!;

		const editorNode = document.createElement("div");
		editorNode.style.display = "flex";
		editorNode.style.boxSizing = "border-box";
		editorNode.style.paddingBottom = "10px";
		editorRoot.appendChild(editorNode);

		const onEditorFocusChanged = (isFocused: boolean) => {
			if (isFocused) {
				editorNode.style.border = "1px solid #4a9eff";
				textArea.dispatchEvent(new Event("focus"));
			} else {
				editorNode.style.border = "1px solid #c3c8cf";
				textArea.dispatchEvent(new Event("blur"));
			}
		};

		onEditorFocusChanged(false);

		const monacoContainer = document.createElement("div");
		monacoContainer.className = "monaco-container";
		monacoContainer.style.minWidth = "300px";
		monacoContainer.style.minHeight = "0";
		monacoContainer.style.flex = "1";
		monacoContainer.style.height = `200px`;

		editorNode.appendChild(monacoContainer);

		const model = monaco.editor.createModel(textArea.value, "markdown");

		const { mentionUrl, issueUrl } = (editorRoot as any).dataset;
		completionController.registerUrls(model, { mentionUrl, issueUrl });

		const editor = monaco.editor.create(monacoContainer, {
			model,
			automaticLayout: true,
			minimap: { enabled: false },
			scrollBeyondLastLine: false,
			wordWrap: "on",
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
		});
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
				console.log("should cancel");
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
		for (const d of this.disposables) {
			d();
		}
	}
}

declare class ResizeObserver {
	constructor(handler: () => void);
	observe(elem: any): void;
}
