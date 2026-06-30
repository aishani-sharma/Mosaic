import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const PORT = Number(process.env.PORT || 8080);
const DIST_DIR = join(process.cwd(), "dist");
const API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

const CONTENT_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webmanifest": "application/manifest+json; charset=utf-8",
};

function json(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

function getStaticPath(urlPath) {
  const cleanPath = normalize(urlPath.split("?")[0]).replace(/^(\.\.[/\\])+/, "");
  return join(DIST_DIR, cleanPath === "/" ? "/index.html" : cleanPath);
}

async function serveStatic(res, urlPath) {
  const filePath = getStaticPath(urlPath);

  try {
    const contents = await readFile(filePath);
    res.writeHead(200, {
      "Content-Type": CONTENT_TYPES[extname(filePath)] || "application/octet-stream",
      "Cache-Control": urlPath === "/" ? "no-cache" : "public, max-age=31536000, immutable",
    });
    res.end(contents);
    return;
  } catch {}

  const indexHtml = await readFile(join(DIST_DIR, "index.html"));
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-cache" });
  res.end(indexHtml);
}

async function handleGemini(req, res) {
  if (req.method !== "POST") {
    json(res, 405, { error: "Method not allowed" });
    return;
  }

  if (!process.env.GEMINI_API_KEY) {
    json(res, 500, { error: "GEMINI_API_KEY is not configured" });
    return;
  }

  let rawBody = "";
  for await (const chunk of req) {
    rawBody += chunk;
  }

  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    json(res, 400, { error: "Invalid JSON body" });
    return;
  }

  if (!payload || !Array.isArray(payload.contents) || payload.contents.length === 0) {
    json(res, 400, { error: "Gemini request must include contents" });
    return;
  }

  const upstream = await fetch(`${API_URL}?key=${process.env.GEMINI_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await upstream.json().catch(() => ({ error: { message: "Invalid Gemini response" } }));
  json(res, upstream.status, data);
}

createServer(async (req, res) => {
  try {
    if (!req.url) {
      json(res, 400, { error: "Missing request URL" });
      return;
    }

    if (req.url.startsWith("/api/gemini")) {
      await handleGemini(req, res);
      return;
    }

    await serveStatic(res, req.url);
  } catch (error) {
    console.error(error);
    json(res, 500, { error: "Internal server error" });
  }
}).listen(PORT, () => {
  console.log(`Mosaic listening on ${PORT}`);
});
