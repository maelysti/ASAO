import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = 3000;

app.use(express.json());

// Proxy API route for Sporty-Tech / Bet261 API
app.get("/api/sporty/proxy", async (req, res) => {
  try {
    const targetUrl = req.query.url as string;
    if (!targetUrl) {
      return res.status(400).json({ error: "Missing url parameter" });
    }

    // Extract Bearer token from client request header or query
    const clientAuth = req.headers.authorization || req.query.token ? `Bearer ${req.query.token}` : "";
    
    // Default fallback token from user curl if none supplied
    const defaultToken = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJodHRwOi8vc2NoZW1hcy54bWxzb2FwLm9yZy93cy8yMDA1LzA1L2lkZW50aXR5L2NsYWltcy91cG4iOiIxNDg5Mjk2IiwiaHR0cDovL3NjaGVtYXMueG1sc29hcC5vcmcvd3MvMjAwNS8wNS9pZGVudGl0eS9jbGFpbXMvbmFtZWlkZW50aWZpZXIiOiIrMjYxMzg2MTc5MzIwIiwiaHR0cHM6Ly9ob25vcmVnYW1pbmcubmV0L2N1c3RvbWVyLXN0YXRlIjoiTG9naW5WYWxpZGF0ZWQiLCJodHRwczovL2hvbm9yZWdhbWluZy5uZXQvYXV0aGVudGljYXRpb24tc2NvcGUiOiJDdXN0b21lciIsImp0aSI6IjExZWMwZDE2LTU2OGQtNGEyOS1hMGEwLTQ2MTlkMjY3YjhkZSIsImh0dHBzOi8vaG9ub3JlZ2FtaW5nLm5ldC9jdXN0b21lci1tdXN0LWNoYW5nZS1wYXNzd29yZCI6IkZhbHNlIiwiZXhwIjoxNzg1ODE5MzU4LCJpc3MiOiJodHRwczovL2hvbm9yZS1nYW1pbmcubmV0IiwiYXVkIjoiaG9ub3JlLWdhbWluZy5uZXQifQ.SfiwAbfsAZMK-qFwDy0CZl3bhKOJMXfXdqfWeqyQ6xLhF9tU0nM8ZGLjQifw8y82y5yuZLwEFqeOo_yMMq2YYkgZYKQ5SyT_PB5gnC250-t-7FORaq6IPZTKiDpHTWWoOGIzsb67KRF6SIEXnM_5hnKdrJE5vq85VA2bnAo732YMa_6h7K_twrhHj4G_OkG1OLC21nbdK84Udwo36iuz3UMug9xUEAinfe4J2PTYkbsAUgWtboSwYkXh7Gv1-syoWelafIvWwuCZrJdM8JRSQOYdev5GL7EsgRFeEb8jSGzqn1uI9Oe8UGN3F6yFJ3JBMf3C-PQBHgOQl-EAEPUozQ";

    const authToken = clientAuth || `Bearer ${defaultToken}`;

    const headers: Record<string, string> = {
      "Accept": "application/json, text/plain, */*",
      "Accept-Language": "fr",
      "App-Version": "34378",
      "Authorization": authToken,
      "Referer": "https://bet261.mg/",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36",
      "sec-ch-ua-platform": '"Windows"',
      "sec-ch-ua-mobile": "?0"
    };

    const response = await fetch(targetUrl, { headers });
    const contentType = response.headers.get("content-type");

    if (contentType && contentType.includes("application/json")) {
      const data = await response.json();
      return res.status(response.status).json(data);
    } else {
      const text = await response.text();
      return res.status(response.status).send(text);
    }
  } catch (err: any) {
    console.error("Error proxying sporty API:", err);
    res.status(500).json({ error: "Failed to fetch from Sporty API", message: err.message });
  }
});

// Vite middleware integration
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
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on http://localhost:${PORT}`);
  });
}

startServer();
