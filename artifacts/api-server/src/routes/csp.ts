import { Router, type IRouter, type Request, type Response } from "express";
import { SolveCspBody, SolveCspResponse } from "@workspace/api-zod";

const router: IRouter = Router();

const CSP_SERVICE_URL = process.env.CSP_SERVICE_URL || "http://localhost:8001";

async function proxyGet(req: Request, res: Response, path: string): Promise<void> {
  const url = `${CSP_SERVICE_URL}${path}`;
  try {
    const upstream = await fetch(url, { method: "GET", headers: { "Content-Type": "application/json" } });
    const data: unknown = await upstream.json();
    res.status(upstream.status).json(data);
  } catch (err) {
    req.log.error({ err, url }, "CSP service proxy error");
    res.status(502).json({ error: "CSP solver service unavailable", details: String(err) });
  }
}

router.get("/csp/health", async (req, res) => {
  await proxyGet(req, res, "/csp/health");
});

router.post("/csp/solve", async (req, res) => {
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
      res.status(upstream.status).json(rawData);
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
