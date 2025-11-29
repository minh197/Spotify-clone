import { Router } from "express";
import {
  getAllAlbums,
  getNewReleasedAlbums,
  getAlbumById,
  createNewAlbum,
  updateAlbumInfo,
  deleteAlbumById,
  addSongsToalbum,
  removeSongFromAlbum,
} from "../controllers/album.controller";
import { protect, admin } from "../middleware/auth.middleware";
import { upload } from "../middleware/upload.middleware";

const router = Router();

// Public routes
router.get("/", getAllAlbums);
router.get("/new-releases", getNewReleasedAlbums);
router.get("/:id", getAlbumById);

// Admin routes (require authentication + admin role)
router.post("/", protect, admin, upload.single("coverImage"), createNewAlbum);
router.put(
  "/:id",
  protect,
  admin,
  upload.single("coverImage"),
  updateAlbumInfo
);
router.delete("/:id", protect, admin, deleteAlbumById);
router.put("/:id/add-songs", protect, admin, addSongsToalbum);
router.put("/:id/remove-song/:songId", protect, admin, removeSongFromAlbum);

export default router;
