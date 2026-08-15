import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const SPORTY_HOST = "hg-event-api-prod.sporty-tech.net";

app.use(express.json());

// Proxy API route for Sporty-Tech / Bet261 API
app.get("/api/sporty/proxy", async (req, res) => {
  try {
    const targetUrl = req.query.url as string;
    if (!targetUrl) {
      return res.status(400).json({ error: "Missing url parameter" });
    }

    let parsedTarget: URL;
    try {
      parsedTarget = new URL(targetUrl);
    } catch {
      return res.status(400).json({ error: "Invalid url parameter" });
    }

    if (parsedTarget.hostname !== SPORTY_HOST) {
      return res.status(403).json({ error: "Target host is not allowed" });
    }

    const clientHeader = typeof req.headers.authorization === "string"
      ? req.headers.authorization.trim()
      : "";
    const queryToken = typeof req.query.token === "string" ? req.query.token.trim() : "";
    const clientToken = clientHeader && clientHeader.toLowerCase() !== "bearer"
      ? clientHeader
      : queryToken;
    const configuredToken = process.env.SPORTY_API_TOKEN?.trim() || "";
    const authToken = clientToken || configuredToken;

    if (!authToken) {
      return res.status(500).json({ error: "SPORTY_API_TOKEN is not configured" });
    }

    const normalizedAuthToken = authToken.toLowerCase().startsWith("bearer ")
      ? authToken
      : `Bearer ${authToken}`;

    const headers: Record<string, string> = {
      "Accept": "application/json, text/plain, */*",
      "Accept-Language": "fr",
      "App-Version": "34378",
      "Authorization": normalizedAuthToken,
      "Referer": "https://bet261.mg/",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36",
      "sec-ch-ua-platform": '"Windows"',
      "sec-ch-ua-mobile": "?0"
    };

    const response = await fetch(parsedTarget, { headers });
    const contentType = response.headers.get("content-type");

    if (contentType && contentType.includes("application/json")) {
      const data = await response.json();
      return res.status(response.status).json(data);
    }

    const text = await response.text();
    return res.status(response.status).send(text);
  } catch (err: any) {
    console.error("Error proxying sporty API:", err);
    return res.status(500).json({
      error: "Failed to fetch from Sporty API",
      message: err.message,
    });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on http://localhost:${PORT}`);
  });
}

startServer();
