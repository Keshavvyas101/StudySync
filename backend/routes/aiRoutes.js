import express from "express";
import protect from "../middlewares/authMiddleware.js";
import { parseTask } from "../controllers/aiController.js";

const router = express.Router();

router.post("/parse-task", protect, parseTask);

export default router;

