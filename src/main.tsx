// src/main.tsx
// アプリ全体のエントリポイント
// - Start → Game → Result の3画面遷移は App.tsx 側で管理する。

import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);