import React from 'react'
import ReactDOM from 'react-dom/client'
import r2wc from '@r2wc/react-to-web-component'
import ChatWidget from './ChatWidget'

// Create the Web Component
const WebComponent = r2wc(ChatWidget, { props: {} });

// Register it in the browser
customElements.define('my-chat-widget', WebComponent);