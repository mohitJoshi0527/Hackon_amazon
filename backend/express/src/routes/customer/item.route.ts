import { Router } from "express";
import { getItem } from "../../controllers/item.controller";
const router = Router();
router.get("/", getItem);
export default router;
