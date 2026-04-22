import type { VercelRequest, VercelResponse } from "@vercel/node";

/**
 * Vercel serverless: forwards same-origin `/api/*` to your Express API.
 * Set BIOSMART_BACKEND_URL in Vercel (e.g. https://your-app.onrender.com — no trailing slash).
 */
export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  const backend = (process.env.BIOSMART_BACKEND_URL || "").replace(/\/$/, "");
  if (!backend) {
    res.setHeader("content-type", "application/json; charset=utf-8");
    res.status(503).send(
      JSON.stringify({
        error:
          "BIOSMART_BACKEND_URL is not set. In Vercel: Project → Settings → Environment Variables → add BIOSMART_BACKEND_URL with your deployed API base URL (https, no trailing slash).",
      })
    );
    return;
  }

  const raw = req.query.path;
  const forwardPath = Array.isArray(raw) ? raw.join("/") : raw;
  if (!forwardPath || typeof forwardPath !== "string") {
    res.setHeader("content-type", "application/json; charset=utf-8");
    res.status(400).send(JSON.stringify({ error: "Missing path" }));
    return;
  }
  if (forwardPath.includes("..")) {
    res.setHeader("content-type", "application/json; charset=utf-8");
    res.status(400).send(JSON.stringify({ error: "Invalid path" }));
    return;
  }

  let upstreamUrl: string;
  try {
    upstreamUrl = new URL(forwardPath.replace(/^\/+/, ""), `${backend}/`).toString();
  } catch {
    res.setHeader("content-type", "application/json; charset=utf-8");
    res.status(400).send(JSON.stringify({ error: "Invalid path" }));
    return;
  }

  const incomingMethod = req.method?.toUpperCase() || "GET";
  const method = incomingMethod === "POST" || incomingMethod === "HEAD" ? incomingMethod : "GET";
  const canSendBody = method === "POST";

  let bodyJson: string | undefined;
  if (canSendBody && req.body) {
    if (typeof req.body === "string") {
      bodyJson = req.body;
    } else {
      bodyJson = JSON.stringify(req.body);
    }
  }

  try {
    const r = await fetch(upstreamUrl, {
      method,
      headers: {
        Accept: "application/json",
        ...(canSendBody ? { "content-type": "application/json" } : {}),
      },
      body: canSendBody ? bodyJson : undefined,
    });
    const ct = r.headers.get("content-type") ?? "application/json; charset=utf-8";
    const body = Buffer.from(await r.arrayBuffer());
    res.status(r.status);
    res.setHeader("content-type", ct);
    res.send(body);
  } catch {
    res.setHeader("content-type", "application/json; charset=utf-8");
    res.status(502).send(JSON.stringify({ error: "Upstream unreachable" }));
  }
}
