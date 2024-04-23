import cors from "cors";
import express, { static as expressStatic } from "express";
import session from "express-session";
import http from "http";
import { WebSocketServer } from "ws";
import { MongodbPersistence } from "y-mongodb-provider";
import * as Y from "yjs";

import documentRouter from "./routes/document.js";
import userRouter from "./routes/user.js";
import settings from "./settings.js";
import { setPersistence, setupWSConnection } from "./db-utils.js";
import path from "path";
import { fileURLToPath } from "url";

// HTTP Setup
const app = express();
const server = http.createServer(app);

app.use(
  cors({
    origin: "*", // adjust this to match your client app's domain
    credentials: true, // to allow cookies to be sent across domains
  })
);
app.use(
  session({
    secret: settings.secret,
    resave: false,
    saveUninitialized: true,
    cookie: { secure: !true }, // set to true if using https
  })
);
app.use(express.json());

const PORT = settings.port;
// y-websocket
const wss = new WebSocketServer({ server, host: "0.0.0.0" });
wss.on("connection", setupWSConnection);

/*
 * y-mongodb-provider
 */
export const mdb = new MongodbPersistence(settings.mongoUrl, {
  flushSize: 100,
  multipleCollections: true,
});

setPersistence({
  bindState: async (docName, ydoc) => {
    const persistedYdoc = await mdb.getYDoc(docName);
    const newUpdates = Y.encodeStateAsUpdate(ydoc);
    mdb.storeUpdate(docName, newUpdates);
    Y.applyUpdate(ydoc, Y.encodeStateAsUpdate(persistedYdoc));
    ydoc.on("update", async (update) => {
      mdb.storeUpdate(docName, update);
    });
  },
  writeState: async (docName, ydoc) => {
    return new Promise((resolve) => {
      resolve(true);
    });
  },
});

app.get("/ping", (req, res) => {
  res.send("Pong");
});
app.use("/api/user", userRouter);
app.use("/api/document", documentRouter);

// in production, serve static files from the React app
if (process.env.NODE_ENV === "production") {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  app.use(express.static(path.join(__dirname, "../client/build")));

  console.log(
    `Serving static files from ${path.join(__dirname, "../client/build")}`
  );
  // Handles any requests that don't match the ones above
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../client/build/index.html"));
  });
}

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
