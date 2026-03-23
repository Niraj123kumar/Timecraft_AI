import { Router, type IRouter } from "express";
import healthRouter from "./health";
import cspRouter from "./csp";

const router: IRouter = Router();

router.use(healthRouter);
router.use(cspRouter);

export default router;
