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
import { protect, admin } from "../middleware/auth.middleware";
import { upload } from "../middleware/upload.middleware";

const router = Router();

// Public routes
router.get("/", getAllSongs);
router.get("/top", getTopSongs);
router.get("/new-releases", getNewReleasedSongs);
router.get("/:id", getSongById);

// Admin routes (require authentication + admin role)
router.post("/", protect, admin, upload.single("coverImage"), createNewSong);
router.put("/:id", protect, admin, upload.single("coverImage"), updateSongInfo);
router.delete("/:id", protect, admin, deleteSongInfo);

export default router;
