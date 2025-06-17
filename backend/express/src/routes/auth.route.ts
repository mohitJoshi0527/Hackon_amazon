import { Router } from "express";
import { createAgent, createUser, Login, loginAgent } from "../controllers/auth.controller";
const router = Router();
router.post("/create",createUser);
router.post("/login",Login);
router.post("/createagent",createAgent);
router.post("/loginagent",loginAgent);
export default router;
