import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import "./App.css";

const root = document.getElementById("root");

try {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} catch (error) {
  root.innerHTML = `<div style="color: red; padding: 20px;">Error: ${error.message}</div>`;
}