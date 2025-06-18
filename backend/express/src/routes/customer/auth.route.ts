import { Router } from "express";
import { createUser, Login } from "../../controllers/auth.controller";
const router = Router();
router.post("/signup", createUser);
router.post("/signin", Login);
export default router;
