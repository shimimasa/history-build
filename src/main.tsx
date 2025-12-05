// src/main.tsx

import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css"; // Tailwind を使うならここで import
import GameContainer from "./containers/GameContainer";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <GameContainer />
  </React.StrictMode>
);
