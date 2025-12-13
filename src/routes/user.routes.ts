import { Router } from "express";
import {
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile,
  getAllUsers,
} from "../controllers/user.controller";
import { isAuthenticated, isAdminRole } from "../middleware/auth.middleware";

const router = Router();

// Public routes
router.post("/register", registerUser);
router.post("/login", loginUser);

// Protected routes (require authentication)
router.get("/profile", isAuthenticated, getUserProfile);
router.put("/profile", isAuthenticated, updateUserProfile);

// Admin routes (require authentication + admin role)
router.get("/", isAuthenticated, isAdminRole, getAllUsers);

export default router;
