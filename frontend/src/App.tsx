import React from "react";
import { ChatWidget } from "./ChatWidget";

export function App() {
  return (
    <div style={{ padding: 24 }}>
      <h1>SealX Chatbot Widget (Prototype)</h1>
      <p>
        This page is just a host for the floating widget. Open the bubble in the bottom-right.
      </p>

      <ChatWidget />
    </div>
  );
}
