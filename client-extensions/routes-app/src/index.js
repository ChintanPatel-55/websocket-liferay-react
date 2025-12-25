import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

class ReactRoutesElement extends HTMLElement {
    connectedCallback() {
        this.mountPoint = document.createElement('div');
        this.appendChild(this.mountPoint);
        this.root = ReactDOM.createRoot(this.mountPoint);
        this.root.render(<App />);
    }

    disconnectedCallback() {
        if (this.root) {
            this.root.unmount();
        }
    }
}

const ELEMENT_ID = 'routes-custom-element';

if (!customElements.get(ELEMENT_ID)) {
    customElements.define(ELEMENT_ID, ReactRoutesElement);
}