import React, { createContext, useState, useEffect } from "react";
import { WebsocketProvider } from "y-websocket";
import * as Y from "yjs";

export const EditorContext = createContext();

export const EditorProvider = ({ children }) => {
  const [text, setText] = useState(null);
  const [provider, setProvider] = useState(null);
  const [documentId, setDocumentId] = useState("");

  useEffect(() => {
    if (!documentId) return;
    const doc = new Y.Doc();
    const yText = doc.getText("quill");
    const wsConnString =
      process.env.REACT_APP_WS_CONN_STRING || "ws://172.20.204.100:3001";
    const wsProvider = new WebsocketProvider(wsConnString, documentId, doc);
    wsProvider.on("status", (event) => {
      console.log(event.status); // logs "connected" or "disconnected"
    });
    setText(yText);
    setProvider(wsProvider);

    return () => {
      doc?.destroy();
      wsProvider?.destroy();
    };
  }, [documentId]);

  return (
    <EditorContext.Provider value={{ text, provider, setDocumentId }}>
      {children}
    </EditorContext.Provider>
  );
};
