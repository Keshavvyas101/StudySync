import express from "express";
import { protect } from "../middlewares/authMiddleware.js";
import upload from "../middlewares/uploadMiddleware.js";
import {
  getMyProfile,
  updateAvatar,
  removeAvatar, // ✅ NEW
} from "../controllers/userController.js";

const router = express.Router();

router.get("/me", protect, getMyProfile);


// profile image
router.patch(
  "/avatar",
  protect,
  upload.single("avatar"),
  updateAvatar
);

router.delete("/avatar", protect, removeAvatar);

export default router;
