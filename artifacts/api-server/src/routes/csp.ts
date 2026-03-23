import { Router, type IRouter, type Request, type Response } from "express";
import { SolveCspBody, SolveCspResponse } from "@workspace/api-zod";

const router: IRouter = Router();

const CSP_SERVICE_URL = process.env.CSP_SERVICE_URL || "http://localhost:8001";

/** Normalize upstream error payloads to the OpenAPI ErrorResponse shape: { error, details } */
function normalizeErrorPayload(raw: unknown, fallback: string): { error: string; details?: string } {
  if (raw !== null && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    // FastAPI HTTPException: { detail: "..." }
    if (typeof obj["detail"] === "string") {
      return { error: obj["detail"] };
    }
    // Already in correct shape
    if (typeof obj["error"] === "string") {
      return { error: obj["error"], details: typeof obj["details"] === "string" ? obj["details"] : undefined };
    }
  }
  return { error: fallback };
}

router.get("/csp/health", async (req: Request, res: Response) => {
  const url = `${CSP_SERVICE_URL}/csp/health`;
  try {
    const upstream = await fetch(url, { method: "GET", headers: { "Content-Type": "application/json" } });
    const raw: unknown = await upstream.json();
    if (!upstream.ok) {
      res.status(upstream.status).json(normalizeErrorPayload(raw, "CSP solver health check failed"));
      return;
    }
    res.status(upstream.status).json(raw);
  } catch (err) {
    req.log.error({ err, url }, "CSP service proxy error");
    res.status(502).json({ error: "CSP solver service unavailable", details: String(err) });
  }
});

router.post("/csp/solve", async (req: Request, res: Response) => {
  const parseResult = SolveCspBody.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      error: "Invalid request body",
      details: parseResult.error.message,
    });
    return;
  }

  const url = `${CSP_SERVICE_URL}/csp/solve`;
  try {
    const upstream = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parseResult.data),
    });

    const rawData: unknown = await upstream.json();

    if (!upstream.ok) {
      // Normalize FastAPI error shape to OpenAPI ErrorResponse contract
      res.status(upstream.status).json(normalizeErrorPayload(rawData, "CSP solver error"));
      return;
    }

    const responseResult = SolveCspResponse.safeParse(rawData);
    if (!responseResult.success) {
      req.log.error({ issues: responseResult.error.issues }, "CSP solver response failed schema validation");
      res.status(502).json({
        error: "Invalid response from CSP solver service",
        details: responseResult.error.message,
      });
      return;
    }

    res.status(200).json(responseResult.data);
  } catch (err) {
    req.log.error({ err, url }, "CSP service proxy error");
    res.status(502).json({ error: "CSP solver service unavailable", details: String(err) });
  }
});

export default router;
