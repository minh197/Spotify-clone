import { Router } from "express";
import {
  getAllPublicPlaylists,
  getPlaylistById,
  getMyPlaylist,
  createPlaylist,
  updatePlaylist,
  deletePlaylist,
  addSongsToPlaylist,
  removeSongFromPlaylist,
  followPlaylist,
  unfollowPlaylist,
} from "../controllers/playlist.controller";
import { protect } from "../middleware/auth.middleware";
import { upload } from "../middleware/upload.middleware";

const router = Router();

// Public routes
router.get("/", getAllPublicPlaylists);

// Private routes (require authentication) - must come before /:id to avoid route conflicts
router.get("/user/me", protect, getMyPlaylist);
router.post("/", protect, upload.single("coverImage"), createPlaylist);

// Playlist-specific routes (must come before /:id)
router.post("/:id/songs", protect, addSongsToPlaylist);
router.delete("/:id/songs/:songId", protect, removeSongFromPlaylist);
router.post("/:id/follow", protect, followPlaylist);
router.delete("/:id/follow", protect, unfollowPlaylist);

// Parameterized routes (must come last)
router.get("/:id", getPlaylistById);
router.put("/:id", protect, upload.single("coverImage"), updatePlaylist);
router.delete("/:id", protect, deletePlaylist);

export default router;

