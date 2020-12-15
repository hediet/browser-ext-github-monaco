declare interface HTMLTextAreaElement {
	hedietEditorWrapper: EditorWrapper | undefined;
}

declare class ResizeObserver {
	constructor(handler: () => void);
	observe(elem: any): void;
	disconnect(): void;
}

declare module "gemoji" {
	const data: {
		emoji: string;
		names: string[];
		tags: string[];
		description: string;
		category: string;
	}[];
	export = data;
}
