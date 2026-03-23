import { Router, type IRouter, type Request, type Response } from "express";
import { SolveCspBody } from "@workspace/api-zod";

const router: IRouter = Router();

const CSP_SERVICE_URL = process.env.CSP_SERVICE_URL || "http://localhost:8001";

async function proxyCsp(req: Request, res: Response, path: string) {
  const url = `${CSP_SERVICE_URL}${path}`;
  try {
    const fetchOptions: RequestInit = {
      method: req.method,
      headers: {
        "Content-Type": "application/json",
      },
    };

    if (req.method !== "GET" && req.method !== "HEAD") {
      fetchOptions.body = JSON.stringify(req.body);
    }

    const upstream = await fetch(url, fetchOptions);
    const data = await upstream.json();
    res.status(upstream.status).json(data);
  } catch (err) {
    req.log.error({ err, url }, "CSP service proxy error");
    res.status(502).json({ error: "CSP solver service unavailable", details: String(err) });
  }
}

router.get("/csp/health", async (req, res) => {
  await proxyCsp(req, res, "/csp/health");
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
  await proxyCsp(req, res, "/csp/solve");
});

export default router;
