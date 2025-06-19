import { Router } from "express";
import { getOrder, verifyTransaction } from "../../controllers/orderAgent.controller";
const router = Router();
router.post("/", verifyTransaction);
router.get("/", getOrder);
export default router;
