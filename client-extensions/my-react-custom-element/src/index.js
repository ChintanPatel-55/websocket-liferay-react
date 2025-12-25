import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

// optional: constants for attribute names
const CONSTANTS = {
  COLOR: "color",
  ALIGNMENT: "alignment",
};

class WebComponent extends HTMLElement {
  constructor() {
    super();

    // read configuration from HTML attributes
    const configuration = {
      color: this.getAttribute(CONSTANTS.COLOR) || "blue",
      alignment: this.getAttribute(CONSTANTS.ALIGNMENT) || "center",
    };

    // render React into this element
    createRoot(this).render(
        <div className="my-react-ce-root">
            {window.Liferay.ThemeDisplay.getUserId()}
        </div>
    );
  }
}

const ELEMENT_ID = "my-react-custom-element";

if (!customElements.get(ELEMENT_ID)) {
  customElements.define(ELEMENT_ID, WebComponent);
}
