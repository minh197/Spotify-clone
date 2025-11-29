import { Router } from "express";
import {
  getAllPublicPlaylists,
  getPlaylistById,
  getMyPlaylist,
} from "../controllers/playlist.controller";
import { protect } from "../middleware/auth.middleware";

const router = Router();

// Public routes
router.get("/", getAllPublicPlaylists);
// Private routes (require authentication) - must come before /:id to avoid route conflicts
router.get("/user/me", protect, getMyPlaylist);
// Parameterized routes (must come last)
router.get("/:id", getPlaylistById);

export default router;

