import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { StatusCodes } from "http-status-codes";
import prisma from "../config/db";
import { Prisma } from "@prisma/client";
import { uploadToCloudinary } from "../config/cloudinary";
import fs from "fs";

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

// @desc    Get all albums with optional search, artistId, and genre filters. Returns albums ordered by release date with song counts.
// @route   GET /api/albums
// @access  Public

export const getAllAlbums = asyncHandler(
  async (req: Request, res: Response) => {
    const search = req.query.search;
    const rawArtistId = req.query.artistId;

    const where: Prisma.AlbumWhereInput = {};

    if (search && typeof search === "string" && search.trim() !== "") {
      where.title = { contains: search, mode: "insensitive" };
    }

    if (rawArtistId && typeof rawArtistId === "string") {
      const id = parseInt(rawArtistId, 10);
      if (!isNaN(id) && id > 0) {
        where.artistId = id;
      }
    }

    const albums = await prisma.album.findMany({
      where,
      orderBy: {
        releaseDate: "desc",
      },
      include: {
        artist: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        _count: {
          select: {
            songs: true,
          },
        },
      },
    });

    res.status(StatusCodes.OK).json({
      albums,
    });
  }
);

// @desc    Get new released albums with an optional limit. Returns albums ordered by release date (or createdAt if no release date).
// @route   GET /api/albums/new-releases
// @access  Public

export const getNewReleasedAlbums = asyncHandler(
  async (req: Request, res: Response) => {
    const rawLimit = req.query.limit;
    let limit = DEFAULT_LIMIT;

    if (rawLimit && typeof rawLimit === "string") {
      const parsedLimit = parseInt(rawLimit, 10);
      if (!isNaN(parsedLimit) && parsedLimit > 0) {
        limit = Math.min(parsedLimit, MAX_LIMIT);
      }
    }

    const albums = await prisma.album.findMany({
      take: limit,
      orderBy: [
        {
          releaseDate: "desc",
        },
        {
          createdAt: "desc",
        },
      ],
      include: {
        artist: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        _count: {
          select: {
            songs: true,
          },
        },
      },
    });

    res.status(StatusCodes.OK).json({
      count: albums.length,
      limit,
      albums,
    });
  }
);

// @desc    Get a specific album by its album id
// @route   GET /api/albums/:id
// @access  Public

export const getAlbumById = asyncHandler(
  async (req: Request, res: Response) => {
    const rawAlbumId = req.params.id;
    const id = parseInt(rawAlbumId, 10);

    if (isNaN(id) || id <= 0) {
      res.status(StatusCodes.BAD_REQUEST);
      throw new Error("Invalid album id");
    }
    const album = await prisma.album.findUnique({
      where: { id },
      include: {
        artist: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        songs: {
          orderBy: {
            playCount: "desc",
          },
          include: {
            artist: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
        },
        _count: {
          select: {
            songs: true,
          },
        },
      },
    });

    if (!album) {
      res.status(StatusCodes.NOT_FOUND);
      throw new Error("Album not found");
    }

    res.status(StatusCodes.OK).json({
      album,
    });
  }
);

// @desc    Create a new album
// @route   POST /api/albums
// @access  Private/Admin

export const createNewAlbum = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user?.isAdmin) {
      res.status(StatusCodes.FORBIDDEN);
      throw new Error("Not authorized as admin");
    }

    const {
      title,
      artistId,
      releaseDate,
      genre,
      description,
      coverImage,
      isExplicit,
    } = req.body;

    // Validate required title
    if (!title || typeof title !== "string" || title.trim() === "") {
      res.status(StatusCodes.BAD_REQUEST);
      throw new Error("Title is required and must be a non-empty string");
    }

    // Validate required artistId
    if (!artistId) {
      res.status(StatusCodes.BAD_REQUEST);
      throw new Error("Artist ID is required");
    }

    const parsedArtistId = parseInt(String(artistId), 10);
    if (isNaN(parsedArtistId) || parsedArtistId <= 0) {
      res.status(StatusCodes.BAD_REQUEST);
      throw new Error("Invalid artist ID");
    }

    // Validate optional releaseDate (only if provided)
    let parsedReleaseDate: Date | null = null;
    if (releaseDate !== undefined && releaseDate !== null) {
      if (typeof releaseDate === "string" && releaseDate.trim() !== "") {
        const date = new Date(releaseDate);
        if (isNaN(date.getTime())) {
          res.status(StatusCodes.BAD_REQUEST);
          throw new Error(
            "Invalid date format for releaseDate. Use ISO format (YYYY-MM-DD)"
          );
        }
        parsedReleaseDate = date;
      }
    }

    // Validate optional genre (only if provided)
    let parsedGenre: string | null = null;
    if (genre !== undefined && genre !== null) {
      if (typeof genre !== "string" || genre.trim() === "") {
        res.status(StatusCodes.BAD_REQUEST);
        throw new Error("Genre must be a non-empty string");
      }
      parsedGenre = genre.trim();
    }

    // Validate optional description (only if provided)
    let parsedDescription: string | null = null;
    if (description !== undefined && description !== null) {
      if (typeof description !== "string" || description.trim() === "") {
        res.status(StatusCodes.BAD_REQUEST);
        throw new Error("Description must be a non-empty string");
      }
      parsedDescription = description.trim();
    }

    // Handle coverImage: either file upload OR URL string
    let parsedCoverImage: string | null = null;

    // Priority 1: File upload (if file is uploaded via multer)
    if (req.file) {
      try {
        parsedCoverImage = await uploadToCloudinary(req.file.path, {
          folder: "spotify-clone/albums",
          resource_type: "image",
        });
      } catch (error: any) {
        // Clean up temp file if it still exists
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        res.status(StatusCodes.INTERNAL_SERVER_ERROR);
        throw new Error(
          error?.message || "Failed to upload cover image to Cloudinary"
        );
      }
    }
    // Priority 2: URL string (if no file upload, but URL provided)
    else if (coverImage !== undefined && coverImage !== null) {
      if (typeof coverImage !== "string" || coverImage.trim() === "") {
        res.status(StatusCodes.BAD_REQUEST);
        throw new Error("Cover image URL must be a non-empty string");
      }
      parsedCoverImage = coverImage.trim();
    }

    // Validate isExplicit (boolean, defaults to false)
    let parsedIsExplicit = false;
    if (isExplicit !== undefined && isExplicit !== null) {
      if (isExplicit === "true" || isExplicit === true) {
        parsedIsExplicit = true;
      } else if (isExplicit === "false" || isExplicit === false) {
        parsedIsExplicit = false;
      } else {
        res.status(StatusCodes.BAD_REQUEST);
        throw new Error(
          "isExplicit must be a boolean or 'true'/'false' string"
        );
      }
    }
    const album = await prisma.album.create({
      data: {
        title: title.trim(),
        artistId: parsedArtistId,
        releaseDate: parsedReleaseDate,
        genre: parsedGenre,
        description: parsedDescription,
        coverImage: parsedCoverImage,
        isExplicit: parsedIsExplicit,
      },
      include: {
        artist: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        _count: {
          select: {
            songs: true,
          },
        },
      },
    });

    res.status(StatusCodes.CREATED).json({
      album,
    });
  }
);

// @desc Update an album info
// @route PUT /api/albums/:id
// @access Private/Admin

export const updateAlbumInfo = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user?.isAdmin) {
      res.status(StatusCodes.FORBIDDEN);
      throw new Error("Not authorized as admin");
    }
    const rawId = req.params.id;
    const albumId = parseInt(rawId, 10);

    if (isNaN(albumId) || albumId <= 0) {
      res.status(StatusCodes.BAD_REQUEST);
      throw new Error("Invalid album id");
    }

    const existingAlbum = await prisma.album.findUnique({
      where: { id: albumId },
    });

    if (!existingAlbum) {
      res.status(StatusCodes.NOT_FOUND);
      throw new Error("Album not found");
    }
    const {
      title,
      artistId,
      releaseDate,
      genre,
      description,
      coverImage,
      isExplicit,
    } = req.body;

    const data: {
      title?: string;
      artistId?: number;
      releaseDate?: Date | null;
      genre?: string | null;
      description?: string | null;
      coverImage?: string | null;
      isExplicit?: boolean;
    } = {};

    // Validate title (optional update)
    if (title !== undefined) {
      if (typeof title !== "string" || title.trim() === "") {
        res.status(StatusCodes.BAD_REQUEST);
        throw new Error("Title must be a non-empty string");
      }
      data.title = title.trim();
    }

    // Validate artistId (optional update)
    if (artistId !== undefined) {
      const parsedArtistId = parseInt(String(artistId), 10);
      if (isNaN(parsedArtistId) || parsedArtistId <= 0) {
        res.status(StatusCodes.BAD_REQUEST);
        throw new Error("Invalid artist ID");
      }
      data.artistId = parsedArtistId;
    }

    // Validate releaseDate (optional update, can be null to clear)
    if (releaseDate !== undefined) {
      if (releaseDate === null || releaseDate === "") {
        data.releaseDate = null;
      } else if (typeof releaseDate === "string" && releaseDate.trim() !== "") {
        const date = new Date(releaseDate);
        if (isNaN(date.getTime())) {
          res.status(StatusCodes.BAD_REQUEST);
          throw new Error(
            "Invalid date format for releaseDate. Use ISO format (YYYY-MM-DD)"
          );
        }
        data.releaseDate = date;
      } else {
        res.status(StatusCodes.BAD_REQUEST);
        throw new Error("releaseDate must be a valid date string or null");
      }
    }

    // Validate genre (optional update, can be null to clear)
    if (genre !== undefined) {
      data.genre =
        genre && typeof genre === "string" && genre.trim() !== ""
          ? genre.trim()
          : null;
    }

    // Validate description (optional update, can be null to clear)
    if (description !== undefined) {
      data.description =
        description &&
        typeof description === "string" &&
        description.trim() !== ""
          ? description.trim()
          : null;
    }

    // Validate isExplicit (optional update)
    if (isExplicit !== undefined) {
      if (isExplicit === "true" || isExplicit === true) {
        data.isExplicit = true;
      } else if (isExplicit === "false" || isExplicit === false) {
        data.isExplicit = false;
      } else {
        res.status(StatusCodes.BAD_REQUEST);
        throw new Error(
          "isExplicit must be a boolean or 'true'/'false' string"
        );
      }
    }

    // Handle coverImage: either file upload OR URL string (optional update)
    if (req.file) {
      // Priority 1: File upload
      try {
        const imageUrl = await uploadToCloudinary(req.file.path, {
          folder: "spotify-clone/albums",
          resource_type: "image",
        });
        data.coverImage = imageUrl;
      } catch (error: any) {
        // Clean up temp file if it still exists
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        res.status(StatusCodes.INTERNAL_SERVER_ERROR);
        throw new Error(
          error?.message || "Failed to upload cover image to Cloudinary"
        );
      }
    } else if (coverImage !== undefined) {
      // Priority 2: URL string or null to clear
      if (coverImage === null || coverImage === "") {
        data.coverImage = null;
      } else if (typeof coverImage === "string" && coverImage.trim() !== "") {
        data.coverImage = coverImage.trim();
      } else {
        res.status(StatusCodes.BAD_REQUEST);
        throw new Error("Cover image must be a non-empty string or null");
      }
    }

    const updatedAlbum = await prisma.album.update({
      where: { id: albumId },
      data,
    });

    res.status(StatusCodes.OK).json({
      album: updatedAlbum,
    });
  }
);

// @desc Delete an album
// @route DELETE /api/albums/:id
// @access Private/Admin

export const deleteAlbumById = asyncHandler(
  async (req: Request, res: Response) => {
    const rawId = req.params.id;
    const albumId = parseInt(rawId, 10);

    if (isNaN(albumId) || albumId <= 0) {
      res.status(StatusCodes.BAD_REQUEST);
      throw new Error("Invalid album id");
    }
    const existingAlbum = await prisma.album.findUnique({
      where: { id: albumId },
    });

    if (!existingAlbum) {
      res.status(StatusCodes.NOT_FOUND);
      throw new Error("Album not found");
    }
    await prisma.album.delete({ where: { id: albumId } });

    res.status(StatusCodes.OK).json({
      message: "Album deleted successfully",
    });
  }
);

// @desc Add songs to album
// @route PUT /api/albums/:id/add-songs
// @access Private/Admin
export const addSongsToalbum = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user?.isAdmin) {
      res.status(StatusCodes.FORBIDDEN);
      throw new Error("Not authorized as admin");
    }
    const rawId = req.params.id;
    const albumId = parseInt(rawId, 10);

    if (isNaN(albumId) || albumId <= 0) {
      res.status(StatusCodes.BAD_REQUEST);
      throw new Error("Invalid album id");
    }

    const existingAlbum = await prisma.album.findUnique({
      where: { id: albumId },
    });

    if (!existingAlbum) {
      res.status(StatusCodes.NOT_FOUND);
      throw new Error("Album not found");
    }

    // Get songIds from request body (not query)
    const { songIds } = req.body;

    // Validate songIds array
    if (!songIds || !Array.isArray(songIds) || songIds.length === 0) {
      res.status(StatusCodes.BAD_REQUEST);
      throw new Error("songIds must be a non-empty array");
    }

    // Parse and validate all song IDs
    const parsedSongIds: number[] = [];
    for (const songId of songIds) {
      const parsedId = parseInt(String(songId), 10);
      if (isNaN(parsedId) || parsedId <= 0) {
        res.status(StatusCodes.BAD_REQUEST);
        throw new Error(`Invalid song ID: ${songId}`);
      }
      parsedSongIds.push(parsedId);
    }

    // Check if all songs exist (more efficient than looping one by one)
    const songs = await prisma.song.findMany({
      where: {
        id: { in: parsedSongIds },
      },
      select: {
        id: true,
        artistId: true,
      },
    });

    // Verify all songs were found
    if (songs.length !== parsedSongIds.length) {
      const foundIds = songs.map((s) => s.id);
      const missingIds = parsedSongIds.filter((id) => !foundIds.includes(id));
      res.status(StatusCodes.NOT_FOUND);
      throw new Error(`Songs not found: ${missingIds.join(", ")}`);
    }

    // Verify all songs belong to the same artist as the album
    const invalidSongs = songs.filter(
      (song) => song.artistId !== existingAlbum.artistId
    );
    if (invalidSongs.length > 0) {
      res.status(StatusCodes.BAD_REQUEST);
      throw new Error("All songs must belong to the same artist as the album");
    }

    // Update all songs to add them to the album (bulk update - more efficient)
    await prisma.song.updateMany({
      where: {
        id: { in: parsedSongIds },
      },
      data: {
        albumId: albumId,
      },
    });

    // Fetch updated album with songs
    const updatedAlbum = await prisma.album.findUnique({
      where: { id: albumId },
      include: {
        artist: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        songs: {
          orderBy: {
            playCount: "desc",
          },
        },
        _count: {
          select: {
            songs: true,
          },
        },
      },
    });

    res.status(StatusCodes.OK).json({
      message: `Successfully added ${parsedSongIds.length} song(s) to album`,
      album: updatedAlbum,
    });
  }
);

// @desc Delete song from an album
// @route PUT /api/albums/:id/remove-song/:songId
// @access Private/Admin

export const removeSongFromAlbum = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user?.isAdmin) {
      res.status(StatusCodes.FORBIDDEN);
      throw new Error("Not authorized as admin");
    }
    const rawId = req.params.id;
    const albumId = parseInt(rawId, 10);

    if (isNaN(albumId) || albumId <= 0) {
      res.status(StatusCodes.BAD_REQUEST);
      throw new Error("Invalid album id");
    }

    const existingAlbum = await prisma.album.findUnique({
      where: { id: albumId },
    });

    if (!existingAlbum) {
      res.status(StatusCodes.BAD_REQUEST);
      throw new Error("Album does not exist");
    }
    const rawSongId = req.params.songId;
    const songId = parseInt(rawSongId, 10);

    if (isNaN(songId) || songId <= 0) {
      res.status(StatusCodes.BAD_REQUEST);
      throw new Error("Invalid song id");
    }

    const existingSong = await prisma.song.findUnique({
      where: { id: songId },
      select: {
        id: true,
        title: true,
        albumId: true,
      },
    });

    if (!existingSong) {
      res.status(StatusCodes.NOT_FOUND);
      throw new Error("Song not found");
    }

    // Verify the song is actually in this album
    if (existingSong.albumId !== albumId) {
      res.status(StatusCodes.BAD_REQUEST);
      throw new Error("Song is not in this album");
    }

    // Remove song from album by setting albumId to null
    const updatedSong = await prisma.song.update({
      where: { id: songId },
      data: {
        albumId: null,
      },
      include: {
        artist: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    });

    // Fetch updated album to return
    const updatedAlbum = await prisma.album.findUnique({
      where: { id: albumId },
      include: {
        artist: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        songs: {
          orderBy: {
            playCount: "desc",
          },
        },
        _count: {
          select: {
            songs: true,
          },
        },
      },
    });

    res.status(StatusCodes.OK).json({
      message: `Song "${existingSong.title}" removed from album successfully`,
      song: updatedSong,
      album: updatedAlbum,
    });
  }
);
