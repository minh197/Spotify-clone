import { Router } from "express";
import {
  getAllSongs,
  getTopSongs,
  getNewReleasedSongs,
  getSongById,
  createNewSong,
  updateSongInfo,
  deleteSongInfo,
} from "../controllers/song.controller";
import { isAuthenticated, isAdminRole } from "../middleware/auth.middleware";
import { upload } from "../middleware/upload.middleware";

const router = Router();

// Public routes
router.get("/", getAllSongs);
router.get("/top", getTopSongs);
router.get("/new-releases", getNewReleasedSongs);
router.get("/:id", getSongById);

// Admin routes (require authentication + admin role)
router.post(
  "/",
  isAuthenticated,
  isAdminRole,
  upload.single("coverImage"),
  createNewSong
);
router.put(
  "/:id",
  isAuthenticated,
  isAdminRole,
  upload.single("coverImage"),
  updateSongInfo
);
router.delete("/:id", isAuthenticated, isAdminRole, deleteSongInfo);

export default router;
