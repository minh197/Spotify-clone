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
import { isAuthenticated, isAdminRole } from "../middleware/auth.middleware";
import { upload } from "../middleware/upload.middleware";

const router = Router();

// Public routes
router.get("/", getAllAlbums);
router.get("/new-releases", getNewReleasedAlbums);
router.get("/:id", getAlbumById);

// Admin routes (require authentication + admin role)
router.post(
  "/",
  isAuthenticated,
  isAdminRole,
  upload.single("coverImage"),
  createNewAlbum
);
router.put(
  "/:id",
  isAuthenticated,
  isAdminRole,
  upload.single("coverImage"),
  updateAlbumInfo
);
router.delete("/:id", isAuthenticated, isAdminRole, deleteAlbumById);
router.put("/:id/add-songs", isAuthenticated, isAdminRole, addSongsToalbum);
router.put(
  "/:id/remove-song/:songId",
  isAuthenticated,
  isAdminRole,
  removeSongFromAlbum
);

export default router;
