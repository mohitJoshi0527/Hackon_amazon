import { Router } from "express";
import { createOrder } from "../controllers/order";
import { authMiddleware } from "../middleware/authmiddleware";
const router = Router();
router.post("/createorder",authMiddleware,createOrder);
export default router;
