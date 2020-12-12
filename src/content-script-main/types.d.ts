declare interface HTMLTextAreaElement {
	hedietEditorWrapper: EditorWrapper | undefined;
}

declare class ResizeObserver {
	constructor(handler: () => void);
	observe(elem: any): void;
}
