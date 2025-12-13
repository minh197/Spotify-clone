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
import { isAuthenticated } from "../middleware/auth.middleware";
import { upload } from "../middleware/upload.middleware";

const router = Router();

// Public routes
router.get("/", getAllPublicPlaylists);

// Private routes (require authentication) - must come before /:id to avoid route conflicts
router.get("/user/me", isAuthenticated, getMyPlaylist);
router.post("/", isAuthenticated, upload.single("coverImage"), createPlaylist);

// Playlist-specific routes (must come before /:id)
router.post("/:id/songs", isAuthenticated, addSongsToPlaylist);
router.delete("/:id/songs/:songId", isAuthenticated, removeSongFromPlaylist);
router.post("/:id/follow", isAuthenticated, followPlaylist);
router.delete("/:id/follow", isAuthenticated, unfollowPlaylist);

// Parameterized routes (must come last)
router.get("/:id", getPlaylistById);
router.put(
  "/:id",
  isAuthenticated,
  upload.single("coverImage"),
  updatePlaylist
);
router.delete("/:id", isAuthenticated, deletePlaylist);

export default router;
