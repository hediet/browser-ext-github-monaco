function injectScript(file_path: string) {
	var script = document.createElement("script");
	script.setAttribute("type", "text/javascript");
	script.setAttribute("src", file_path);
	document.head.appendChild(script);
}

injectScript(chrome.extension.getURL("/dist/content-script-main.js"));

var script = document.createElement("script");
script.setAttribute("type", "text/javascript");
script.innerText = `window.hedietMonacoEditorPublicPath = ${JSON.stringify(
	chrome.extension.getURL("/dist/")
)};`;
document.head.appendChild(script);
