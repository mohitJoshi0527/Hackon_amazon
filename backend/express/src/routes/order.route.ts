import { Router } from "express";
import { createOrder, getOrder } from "../controllers/order.controller";
import { authMiddleware } from "../middleware/authmiddleware";
const router = Router();
router.post("/createorder",authMiddleware,createOrder);
router.get("/",authMiddleware,getOrder);
export default router;
