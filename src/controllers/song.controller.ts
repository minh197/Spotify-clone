import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { StatusCodes } from "http-status-codes";
import prisma from "../config/db";
import { Prisma } from "@prisma/client";
import { uploadToCloudinary } from "../config/cloudinary";
import fs from "fs";

// Constants for pagination limits
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

// @desc    Get all songs with optional search, genre, and artistId; return an array of songs
// @route   GET /api/songs
// @access  Public

export const getAllSongs = asyncHandler(async (req: Request, res: Response) => {
  const search = req.query.search;
  const genre = req.query.genre;
  const rawArtistId = req.query.artistId;

  const where: Prisma.SongWhereInput = {};

  if (search && typeof search === "string" && search.trim() !== "") {
    where.title = { contains: search, mode: "insensitive" };
  }

  if (genre && typeof genre === "string" && genre.trim() !== "") {
    where.genre = genre;
  }

  if (rawArtistId && typeof rawArtistId === "string") {
    const id = parseInt(rawArtistId, 10);
    if (!isNaN(id) && id > 0) {
      where.artistId = id;
    }
  }

  const songs = await prisma.song.findMany({
    where,
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
      album: {
        select: {
          id: true,
          title: true,
          coverImage: true,
        },
      },
    },
  });

  res.status(StatusCodes.OK).json({
    songs,
  });
});

// @desc    Get top songs with an optional limit; the default limit is 10
// @route   GET /api/songs/top
// @access  Public

export const getTopSongs = asyncHandler(async (req: Request, res: Response) => {
  // **REVIEW: nên dùng DTO
  const rawLimit = req.query.limit;
  let limit = DEFAULT_LIMIT;

  if (rawLimit && typeof rawLimit === "string") {
    const parsedLimit = parseInt(rawLimit, 10);
    if (!isNaN(parsedLimit) && parsedLimit > 0) {
      limit = Math.min(parsedLimit, MAX_LIMIT);
    }
  }
  // *END_REVIEW
  const songs = await prisma.song.findMany({
    take: limit,
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
      album: {
        select: {
          id: true,
          title: true,
          coverImage: true,
        },
      },
    },
  });

  res.status(StatusCodes.OK).json({
    count: songs.length,
    limit,
    songs,
  });
});

// @desc    Get all new release songs with an optional limit
// @route   GET /api/songs/new-releases
// @access  Public

export const getNewReleasedSongs = asyncHandler(
  async (req: Request, res: Response) => {
    const rawLimit = req.query.limit;
    let limit = DEFAULT_LIMIT;

    if (rawLimit && typeof rawLimit === "string") {
      const parsedLimit = parseInt(rawLimit, 10);
      if (!isNaN(parsedLimit) && parsedLimit > 0) {
        limit = Math.min(parsedLimit, MAX_LIMIT);
      }
    }
    const songs = await prisma.song.findMany({
      take: limit,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        artist: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        album: {
          select: {
            id: true,
            title: true,
            coverImage: true,
            releaseDate: true,
          },
        },
      },
    });
    res.status(StatusCodes.OK).json({
      count: songs.length,
      limit,
      songs,
    });
  }
);

// @desc    Get a song by its id
// @route   GET /api/songs/:id
// @access  Public

export const getSongById = asyncHandler(async (req: Request, res: Response) => {
  const rawId = req.params.id;
  const id = parseInt(rawId, 10);

  if (isNaN(id) || id <= 0) {
    res.status(StatusCodes.BAD_REQUEST);
    throw new Error("Invalid song ID");
  }

  const song = await prisma.song.findUnique({
    where: { id },
    include: {
      artist: {
        select: {
          id: true,
          name: true,
          image: true,
        },
      },
      album: {
        select: {
          id: true,
          title: true,
          coverImage: true,
          releaseDate: true,
        },
      },
    },
  });

  if (!song) {
    res.status(StatusCodes.NOT_FOUND);
    throw new Error("Song not found");
  }

  res.status(StatusCodes.OK).json({
    song,
  });
});

// @desc    Create a new song
// @route   POST /api/songs
// @access  Admin

export const createNewSong = asyncHandler(
  async (req: Request, res: Response) => {
    // **REVIEW: nên remove
    if (!req.user?.isAdmin) {
      res.status(StatusCodes.FORBIDDEN);
      throw new Error("Not authorized as admin");
    }
    // **END
    const {
      artistId,
      title,
      albumId,
      duration,
      genre,
      audioUrl,
      coverImage,
      lyric,
      isExplicit,
    } = req.body;

    // **REVIEW: nên dùng DTO
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

    // Validate optional albumId (only if provided)
    let parsedAlbumId: number | null = null;
    if (albumId !== undefined && albumId !== null) {
      parsedAlbumId = parseInt(String(albumId), 10);
      if (isNaN(parsedAlbumId) || parsedAlbumId <= 0) {
        res.status(StatusCodes.BAD_REQUEST);
        throw new Error("Invalid album ID");
      }
    }

    // Validate required duration (in seconds)
    if (duration === undefined || duration === null) {
      res.status(StatusCodes.BAD_REQUEST);
      throw new Error("Duration is required");
    }
    const parsedDuration = parseInt(String(duration), 10);
    if (isNaN(parsedDuration) || parsedDuration <= 0) {
      res.status(StatusCodes.BAD_REQUEST);
      throw new Error("Duration must be a positive integer (in seconds)");
    }

    // Validate required audioUrl
    if (!audioUrl || typeof audioUrl !== "string" || audioUrl.trim() === "") {
      res.status(StatusCodes.BAD_REQUEST);
      throw new Error("Audio URL is required and must be a non-empty string");
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

    // Handle coverImage: either file upload OR URL string
    let parsedCoverImage: string | null = null;

    // Priority 1: File upload (if file is uploaded via multer)
    if (req.file) {
      try {
        parsedCoverImage = await uploadToCloudinary(req.file.path, {
          folder: "spotify-clone/songs",
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

    // Validate optional lyric (only if provided)
    let parsedLyric: string | null = null;
    if (lyric !== undefined && lyric !== null) {
      if (typeof lyric !== "string" || lyric.trim() === "") {
        res.status(StatusCodes.BAD_REQUEST);
        throw new Error("Lyric must be a non-empty string");
      }
      parsedLyric = lyric.trim();
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

    // Verify artist exists
    const artist = await prisma.artist.findUnique({
      where: { id: parsedArtistId },
    });

    if (!artist) {
      res.status(StatusCodes.NOT_FOUND);
      throw new Error("Artist not found");
    }

    // Verify album exists (if provided) and belongs to the same artist
    if (parsedAlbumId !== null) {
      const album = await prisma.album.findUnique({
        where: { id: parsedAlbumId },
      });

      if (!album) {
        res.status(StatusCodes.NOT_FOUND);
        throw new Error("Album not found");
      }

      if (album.artistId !== parsedArtistId) {
        res.status(StatusCodes.BAD_REQUEST);
        throw new Error("Album does not belong to the specified artist");
      }
    }
    // **END
    //Upload file here

    const song = await prisma.song.create({
      data: {
        artistId: parsedArtistId,
        title: title.trim(),
        albumId: parsedAlbumId,
        duration: parsedDuration,
        genre: parsedGenre,
        audioUrl: audioUrl.trim(),
        coverImage: parsedCoverImage,
        lyric: parsedLyric,
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
        album: {
          select: {
            id: true,
            title: true,
            coverImage: true,
          },
        },
      },
    });

    res.status(StatusCodes.CREATED).json({
      song,
    });
  }
);

// @desc    Update song info
// @route   PUT /api/songs/:id
// @access  Admin/Private

export const updateSongInfo = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user?.isAdmin) {
      res.status(StatusCodes.FORBIDDEN);
      throw new Error("Not authorized as admin");
    }

    const rawId = req.params.id;
    const id = parseInt(rawId, 10);

    if (isNaN(id) || id <= 0) {
      res.status(StatusCodes.BAD_REQUEST);
      throw new Error("Invalid song ID");
    }

    const existingSong = await prisma.song.findUnique({
      where: { id },
    });

    if (!existingSong) {
      res.status(StatusCodes.NOT_FOUND);
      throw new Error("Song not found");
    }

    const {
      title,
      artistId,
      albumId,
      duration,
      genre,
      audioUrl,
      coverImage,
      lyric,
      isExplicit,
    } = req.body;

    const data: {
      title?: string;
      artistId?: number;
      albumId?: number | null;
      duration?: number;
      genre?: string | null;
      audioUrl?: string;
      coverImage?: string | null;
      lyric?: string | null;
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

    // Validate albumId (optional update, can be null to clear)
    if (albumId !== undefined) {
      if (albumId === null || albumId === "") {
        data.albumId = null;
      } else {
        const parsedAlbumId = parseInt(String(albumId), 10);
        if (isNaN(parsedAlbumId) || parsedAlbumId <= 0) {
          res.status(StatusCodes.BAD_REQUEST);
          throw new Error("Invalid album ID");
        }
        data.albumId = parsedAlbumId;
      }
    }

    // Validate duration (optional update)
    if (duration !== undefined) {
      const parsedDuration = parseInt(String(duration), 10);
      if (isNaN(parsedDuration) || parsedDuration <= 0) {
        res.status(StatusCodes.BAD_REQUEST);
        throw new Error("Duration must be a positive integer (in seconds)");
      }
      data.duration = parsedDuration;
    }

    // Validate audioUrl (optional update)
    if (audioUrl !== undefined) {
      if (typeof audioUrl !== "string" || audioUrl.trim() === "") {
        res.status(StatusCodes.BAD_REQUEST);
        throw new Error("Audio URL must be a non-empty string");
      }
      data.audioUrl = audioUrl.trim();
    }

    // Validate genre (optional update, can be null to clear)
    if (genre !== undefined) {
      data.genre =
        genre && typeof genre === "string" && genre.trim() !== ""
          ? genre.trim()
          : null;
    }

    // Validate lyric (optional update, can be null to clear)
    if (lyric !== undefined) {
      data.lyric =
        lyric && typeof lyric === "string" && lyric.trim() !== ""
          ? lyric.trim()
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
          folder: "spotify-clone/songs",
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

    const updatedSong = await prisma.song.update({
      where: { id },
      data,
    });

    res.status(StatusCodes.OK).json({
      song: updatedSong,
    });
  }
);

// @desc
// @route   DELETE /api/songs/:id
// @access  Admin/Private

export const deleteSongInfo = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user?.isAdmin) {
      res.status(StatusCodes.FORBIDDEN);
      throw new Error("Not authorized as admin");
    }
    const rawId = req.params.id;
    const id = parseInt(rawId, 10);

    if (isNaN(id) || id <= 0) {
      res.status(StatusCodes.BAD_REQUEST);
      throw new Error("Invalid song ID");
    }

    const existingSong = await prisma.song.findUnique({
      where: { id },
    });

    if (!existingSong) {
      res.status(StatusCodes.NOT_FOUND);
      throw new Error("Song not found");
    }

    await prisma.song.delete({ where: { id } });

    res.status(StatusCodes.OK).json({
      message: "Song deleted successfully",
    });
  }
);
