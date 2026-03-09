import "dotenv/config";
import express from "express";
import { createServer as createViteServer } from "vite";
import evaluateHandler from "./api/evaluate";
import generateHandler from "./api/generate";

// Helper to convert Express req to Web Request
function createWebRequest(req: express.Request) {
  const url = `http://${req.headers.host}${req.url}`;
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (typeof value === 'string') headers.set(key, value);
    else if (Array.isArray(value)) headers.set(key, value.join(','));
  }
  return new Request(url, {
    method: req.method,
    headers,
    body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined,
  });
}

// Helper to convert Web Response to Express res
async function sendWebResponse(res: express.Response, webRes: Response) {
  res.status(webRes.status);
  webRes.headers.forEach((value, key) => {
    res.setHeader(key, value);
  });
  const text = await webRes.text();
  res.send(text);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes FIRST
  app.post("/api/evaluate", async (req, res) => {
    try {
      const webReq = createWebRequest(req);
      const webRes = await evaluateHandler(webReq);
      await sendWebResponse(res, webRes);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.post("/api/generate", async (req, res) => {
    try {
      const webReq = createWebRequest(req);
      const webRes = await generateHandler(webReq);
      await sendWebResponse(res, webRes);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
