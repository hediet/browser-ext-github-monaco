import type { MonacoOptions } from "./settings";

import { defaultSettings, getSettings } from "./settings";

abstract class Setting extends HTMLElement {
  protected readonly container: HTMLElement;

  constructor() {
    super();

    // Do not attach shadow because it prevents `"chrome_style": true` from applying.
    const paragraph = document.createElement("p");
    this.container = document.createElement("label");
    paragraph.appendChild(this.container);
    this.appendChild(paragraph);
  }

  abstract value: any;
}

/** A setting element that its label precedes its element */
abstract class LabelBeforeSetting extends Setting {
  constructor() {
    super();

    const label = this.getAttribute("label")!;
    this.container.appendChild(document.createTextNode(label + " "));
    this.container.appendChild(this.getElement());
  }

  protected abstract getElement(): HTMLElement;
}

class TextSetting extends LabelBeforeSetting {
  private input!: HTMLInputElement;

  get value() {
    return this.input.value;
  }
  set value(v) {
    this.input.value = v;
  }

  protected getElement(): HTMLElement {
    this.input = document.createElement("input");
    this.input.type = "text";
    return this.input;
  }
}

class NumberSetting extends LabelBeforeSetting {
  private input!: HTMLInputElement;

  get value() {
    return Number(this.input.value);
  }
  set value(v) {
    this.input.value = String(v);
  }

  protected getElement(): HTMLElement {
    this.input = document.createElement("input");
    this.input.type = "number";
    return this.input;
  }
}

class DropdownSetting extends LabelBeforeSetting {
  private select!: HTMLSelectElement;

  get value() {
    return this.select.value;
  }
  set value(v) {
    this.select.value = v;
  }

  protected getElement(): HTMLElement {
    this.select = document.createElement("select");
    this.select.append(...Array.from(this.querySelectorAll("option")));
    return this.select;
  }
}

class BooleanSetting extends Setting {
  private readonly checkbox: HTMLInputElement;

  get value() {
    return this.checkbox.checked;
  }
  set value(v) {
    this.checkbox.checked = v;
  }

  constructor() {
    super();

    this.checkbox = document.createElement("input");
    this.checkbox.type = "checkbox";
    this.container.appendChild(this.checkbox);
    const label = this.getAttribute("label")!;
    this.container.appendChild(document.createTextNode(" " + label));
  }
}

class LineDecorationsWidth extends Setting {
  private readonly width: HTMLInputElement;
  private readonly units: HTMLSelectElement;

  get value() {
    if (this.units.value == "px") {
      return Number(this.width.value);
    } else {
      return this.width.value + "ch";
    }
  }
  set value(v) {
    if (typeof v === "number") {
      this.width.value = String(v);
      this.units.value = "px";
    } else {
      this.width.value = v.substr(0, v.length - "ch".length);
      this.units.value = "ch";
    }
  }
  
  constructor() {
    super();
    
    const label = this.getAttribute("label")!;
    this.container.appendChild(document.createTextNode(label + " "));
    this.width = document.createElement("input");
    this.width.type = "number";
    this.container.appendChild(this.width);
    this.units = document.createElement("select");
    const pxUnits = document.createElement("option");
    pxUnits.value = pxUnits.text = "px";
    this.units.appendChild(pxUnits);
    const chUnits = document.createElement("option");
    chUnits.value = chUnits.text = "ch";
    this.units.appendChild(chUnits);
    this.container.appendChild(this.units);
  }
}

customElements.define("text-setting", TextSetting);
customElements.define("number-setting", NumberSetting);
customElements.define("dropdown-setting", DropdownSetting);
customElements.define("boolean-setting", BooleanSetting);
customElements.define("line-decorations-width", LineDecorationsWidth);

interface ObjectPath {
  parent: any,
  lastPath: string,
}

function splitPath(object: any, path: string): ObjectPath {
  const paths = path.split(".");
  let parent = object;
  while (paths.length > 1) {
    parent = parent[paths.shift()!];
  }
  return { parent, lastPath: paths[0] };
}

function initField(field: Setting, settings: MonacoOptions) {
  // Special cases
  if (field.id === "theme" && settings.theme === undefined) {
    field.value = "matchGithub";
    return;
  }
  if (field.id === "fontFamily" && settings.fontFamily === undefined) {
    field.value = "";
    return;
  }
  if (field.id === "fontSize" && settings.fontSize === undefined) {
    field.value = 0;
    return;
  }
  if (field.id === "suggestFontSize" && settings.suggestFontSize === undefined) {
    field.value = 0;
    return;
  }
  if (field.id === "suggestLineHeight" && settings.suggestLineHeight === undefined) {
    field.value = 0;
    return;
  }

  const { parent, lastPath } = splitPath(settings, field.id);
  const value = parent[lastPath];
  field.value = value;
}

function saveField(field: Setting, settings: MonacoOptions) {
  // Special cases
  if (field.id === "theme" && field.value === "matchGithub") {
    settings.theme = undefined;
    return;
  }
  if (field.id === "fontFamily" && field.value === "") {
    settings.fontFamily = undefined;
    return;
  }
  if (field.id === "fontSize" && field.value === 0) {
    settings.fontSize = undefined;
    return;
  }
  if (field.id === "suggestFontSize" && field.value === 0) {
    settings.suggestFontSize = undefined;
    return;
  }
  if (field.id === "suggestLineHeight" && field.value === 0) {
    settings.suggestLineHeight = undefined;
    return;
  }

  const { parent, lastPath } = splitPath(settings, field.id);
  parent[lastPath] = field.value;
}

async function setFieldsToSettings() {
  const settings = await getSettings();
  document.querySelectorAll(
    "text-setting,number-setting,dropdown-setting,boolean-setting"
  ).forEach(field => initField(<Setting>field, settings));
}
setFieldsToSettings();

document.getElementById("reset")!.addEventListener("click", function(e) {
  e.preventDefault();
  chrome.storage.sync.set({ settings: defaultSettings }, setFieldsToSettings);
}, false);

document.getElementById("save")!.addEventListener("click", function(e) {
  e.preventDefault();
  const settings = JSON.parse(JSON.stringify(defaultSettings)); // Clone default settings in-depth
  document.querySelectorAll(
    "text-setting,number-setting,dropdown-setting,boolean-setting"
  ).forEach(field => saveField(<Setting>field, settings));
  chrome.storage.sync.set({ settings });
}, false);
