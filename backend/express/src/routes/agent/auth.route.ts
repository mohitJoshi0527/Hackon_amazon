import { Router } from "express";
import { createAgent, loginAgent } from "../../controllers/auth.controller";
const router = Router();
router.post("/signup",createAgent);
router.post("/signin",loginAgent);
export default router;
