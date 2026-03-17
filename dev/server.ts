import "dotenv/config";
import express from "express";
import { createServer as createViteServer } from "vite";
import evaluateHandler from "../api/evaluate";
import generateHandler from "../api/generate";

if (!process.env.GEMINI_API_KEY) {
  console.error('FATAL: GEMINI_API_KEY is not set');
  process.exit(1);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes FIRST
  app.post("/api/evaluate", async (req, res) => {
    try {
      // @ts-ignore - VercelRequest is compatible with Express Request for our purposes
      await evaluateHandler(req, res);
    } catch (e) {
      console.error(e);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Internal Server Error' });
      }
    }
  });

  app.post("/api/generate", async (req, res) => {
    try {
      // @ts-ignore - VercelRequest is compatible with Express Request for our purposes
      await generateHandler(req, res);
    } catch (e) {
      console.error(e);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Internal Server Error' });
      }
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
