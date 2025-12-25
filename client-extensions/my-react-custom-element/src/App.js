import React from "react";
import "./App.css";

function App({ color = "blue" , alignment = "center" }) {
  return (
    <div
      style={{
        color,
        fontSize: "32px",
        fontWeight: "bold",
        textAlign: alignment,
        padding: "16px",
      }}
    >
      Hello World
    </div>
  );
}

export default App;
