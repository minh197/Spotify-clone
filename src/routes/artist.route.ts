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
import { isAuthenticated, isAdminRole } from "../middleware/auth.middleware";
import { upload } from "../middleware/upload.middleware";

const router = Router();

// Public routes
router.get("/", getAllArtists);
router.get("/top", getTopArtists);
router.get("/:id", getArtistById);
router.get("/:id/top-songs", getTopSong);

// Admin routes (require authentication + admin role)
router.post(
  "/",
  isAuthenticated,
  isAdminRole,
  upload.single("image"),
  createArtist
);
router.put(
  "/:id",
  isAuthenticated,
  isAdminRole,
  upload.single("image"),
  updateArtistInfo
);
router.delete("/:id", isAuthenticated, isAdminRole, deleteArtist);

export default router;
