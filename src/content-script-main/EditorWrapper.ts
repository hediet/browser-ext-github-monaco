import { editor } from "monaco-editor";
import { Monaco } from "../monaco-loader";
import { CompletionController } from "./CompletionController";
import { GithubApi } from "./GithubApi";

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
		completionController: CompletionController,
		api: GithubApi
	) {
		if (textArea.hedietEditorWrapper) {
			return textArea.hedietEditorWrapper;
		}
		return new EditorWrapper(
			textArea,
			monaco,
			completionController,
			getGithubTheme(),
			api
		);
	}

	private disposed = false;
	private readonly disposables = new Array<() => any>();

	private readonly editorWrapperDiv = document.createElement("div");
	private readonly monacoDiv = document.createElement("div");
	private readonly previewDiv = document.createElement("div");
	private readonly editorRoot: HTMLElement;
	private readonly editor: editor.IStandaloneCodeEditor;

	private fullscreen = false;
	private editorHeight: number = 200;

	private constructor(
		private readonly textArea: HTMLTextAreaElement,
		monaco: Monaco,
		completionController: CompletionController,
		theme: "light" | "dark",
		private readonly githubApi: GithubApi
	) {
		this.editorRoot = textArea.parentNode as HTMLElement;

		this.prepareTextArea();

		this.editorWrapperDiv.className = "hediet-editor-wrapper";
		(this.editorWrapperDiv as MonacoNode).hedietEditorWrapper = this;
		this.editorRoot.appendChild(this.editorWrapperDiv);
		this.disposables.push(() => {
			this.editorWrapperDiv.remove();
		});

		this.handleEditorFocusChanged(false);

		this.monacoDiv.className = "hediet-monaco-container";
		this.editorWrapperDiv.appendChild(this.monacoDiv);
		this.editorWrapperDiv.addEventListener("click", (e) => {
			if (e.target == this.editorWrapperDiv && this.fullscreen) {
				this.setFullScreen(false);
			}
		});

		this.editorWrapperDiv.appendChild(this.previewDiv);

		const model = monaco.editor.createModel(textArea.value, "markdown");

		const { mentionUrl, issueUrl } = (this.editorRoot as any).dataset;
		completionController.registerUrls(model, { mentionUrl, issueUrl });

		this.editor = monaco.editor.create(this.monacoDiv, {
			model,
			automaticLayout: true,
			minimap: { enabled: false },
			scrollBeyondLastLine: false,
			wordWrap: "on",
			theme: theme === "dark" ? "vs-dark" : "vs",
		});

		this.editor.addAction({
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

		this.editor.addAction({
			id: "fullscreen.toggle",
			label: "Toggle Fullscreen",
			run: () => {
				this.setFullScreen(!this.fullscreen);
			},
			keybindings: [monaco.KeyCode.F11],
		});

		this.disposables.push(() => this.editor.dispose());
		this.disposables.push(() => model.dispose());

		this.editor.onDidFocusEditorText(() =>
			this.handleEditorFocusChanged(true)
		);
		this.editor.onDidFocusEditorWidget(() =>
			this.handleEditorFocusChanged(true)
		);
		this.editor.onDidBlurEditorText(() =>
			this.handleEditorFocusChanged(false)
		);
		this.editor.onDidBlurEditorWidget(() =>
			this.handleEditorFocusChanged(false)
		);

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

		this.editor.onDidChangeCursorSelection((e) => {
			const startOffset = model.getOffsetAt(
				e.selection.getStartPosition()
			);
			const endOffset = model.getOffsetAt(e.selection.getEndPosition());
			textArea.selectionStart = startOffset;
			textArea.selectionEnd = endOffset;
		});

		model.onDidChangeContent((e) => {
			if (e.changes.length === 1 && e.changes[0].text === " ") {
				this.editor.trigger("editor", "hideSuggestWidget", undefined);
			}
			const value = model.getValue();
			textArea.value = value;
			textArea.dispatchEvent(new Event("input"));

			this.updatePreview();
		});

		this.editor.onDidContentSizeChange((e) => {
			this.editorHeight = e.contentHeight;
			this.applyState();
		});

		const resizeObserver = new ResizeObserver(() => {
			if (this.editorRoot.offsetHeight > 0) {
				this.editor.layout();
			}
			this.updatePreview();
		});
		resizeObserver.observe(this.editorRoot);
		resizeObserver.observe(this.editorWrapperDiv);

		this.disposables.push(() => resizeObserver.disconnect());

		const applyState = () => {
			this.applyState();
		};
		window.addEventListener("resize", applyState);
		this.disposables.push(() => {
			window.removeEventListener("resize", applyState);
		});

		this.fullscreen = this.editorRoot.offsetHeight > 0;
		this.applyState();
	}

	private lastUpdatePreviewTimeout: any = undefined;
	private lastText: string = "";
	private updatePreview() {
		if (!this.previewVisible) {
			return;
		}

		const newText = this.editor.getModel()!.getValue();
		if (this.lastText === newText) {
			return;
		}

		let node: HTMLElement | null = this.editorRoot;
		while (node && !node.getAttribute("data-preview-url")) {
			node = node.parentElement;
		}

		if (!node) {
			return;
		}

		clearTimeout(this.lastUpdatePreviewTimeout);
		this.lastUpdatePreviewTimeout = setTimeout(async () => {
			const preview = await this.githubApi.getPreview(node!, newText);
			this.previewDiv.innerHTML = preview;
			this.lastText = newText;
		}, 1000);
	}

	private handleEditorFocusChanged(isFocused: boolean): void {
		if (isFocused) {
			this.editorWrapperDiv.style.border = "1px solid #4a9eff";
			this.textArea.dispatchEvent(new Event("focus"));
		} else {
			this.editorWrapperDiv.style.border = "1px solid #c3c8cf";
			this.textArea.dispatchEvent(new Event("blur"));
		}
	}

	private prepareTextArea() {
		this.textArea.hedietEditorWrapper = this;
		this.textArea.style.display = "none";

		// GH queries for all text areas that have non zero size, e.g. when
		// the "Quote Reply" action. `display: none` on textArea breaks this logic.
		// We must hack around this by overriding these properties.
		// Since github also has hidden text areas,
		// textArea must have a non-zero size if and only if
		// monacoNode has a non-zero size.
		Object.defineProperty(this.textArea, "offsetHeight", {
			get: () => this.editorRoot.offsetHeight,
		});
		Object.defineProperty(this.textArea, "offsetWidth", {
			get: () => this.editorRoot.offsetWidth,
		});

		// GH calls textArea.focus() in some places.
		// We want to focus the monaco editor instead.
		Object.defineProperty(this.textArea, "focus", {
			value: () => {
				this.editor.focus();
			},
		});
	}

	private setFullScreen(fullscreen: boolean) {
		this.fullscreen = fullscreen;
		this.applyState();
	}

	private get previewVisible(): boolean {
		return this.fullscreen && this.editorWrapperDiv.offsetWidth > 1300;
	}

	private applyState() {
		this.updatePreview();
		this.editorWrapperDiv.classList.toggle("fullscreen", this.fullscreen);

		this.monacoDiv.style.height = this.fullscreen
			? ""
			: `${Math.min(300, Math.max(100, this.editorHeight + 2))}px`;

		this.previewDiv.className = this.previewVisible
			? "hediet-preview-container active comment-body markdown-body js-preview-body"
			: "hediet-preview-container";
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
