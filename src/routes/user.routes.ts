import { Router } from "express";
import {
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile,
  getAllUsers,
} from "../controllers/user.controller";
import { protect, admin } from "../middleware/auth.middleware";

const router = Router();

// Public routes
router.post("/register", registerUser);
router.post("/login", loginUser);

// Protected routes (require authentication)
// REVIEW: đổi tên middleware `protect` => `isAuthenticated`
router.get("/profile", protect, getUserProfile);
router.put("/profile", protect, updateUserProfile);

// Admin routes (require authentication + admin role)
// REVIEW: đổi tên middleware `admin` => `isAdminRole`
router.get("/", protect, admin, getAllUsers);

export default router;

