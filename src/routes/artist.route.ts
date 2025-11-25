import { Router } from "express";
import {
  getAllArtists,
  getTopArtists,
  getArtistById,
  getTopSong,
  createArtist,
  updateArtistInfo,
  deleteArtist,
} from "../controllers/artist.controller";
import { protect, admin } from "../middleware/auth.middleware";
import { upload } from "../middleware/upload.middleware";

const router = Router();

// Public routes
router.get("/", getAllArtists);
router.get("/top", getTopArtists);
router.get("/:id", getArtistById);
router.get("/:id/top-songs", getTopSong);

// Admin routes (require authentication + admin role)
router.post("/", protect, admin, upload.single("image"), createArtist);
router.put("/:id", protect, admin, upload.single("image"), updateArtistInfo);
router.delete("/:id", protect, admin, deleteArtist);

export default router;
