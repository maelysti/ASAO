import type { VercelRequest, VercelResponse } from "@vercel/node";

const SPORTY_HOST = "hg-event-api-prod.sporty-tech.net";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const targetUrl = typeof req.query.url === "string" ? req.query.url : "";
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

    const response = await fetch(parsedTarget, {
      headers: {
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "fr",
        "App-Version": "34378",
        "Authorization": normalizedAuthToken,
        "Referer": "https://bet261.mg/",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36",
        "sec-ch-ua-platform": '"Windows"',
        "sec-ch-ua-mobile": "?0",
      },
    });

    const contentType = response.headers.get("content-type");
    if (contentType?.includes("application/json")) {
      return res.status(response.status).json(await response.json());
    }

    return res.status(response.status).send(await response.text());
  } catch (err: any) {
    return res.status(500).json({
      error: "Failed to fetch from Sporty API",
      message: err.message,
    });
  }
}
