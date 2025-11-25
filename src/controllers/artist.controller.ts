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

// @desc    Get all artists with optional search and filter by verification status. Returns artists ordered by follower count with song and album counts.
// @route   GET /api/artists
// @access  Public
export const getAllArtists = asyncHandler(
  async (req: Request, res: Response) => {
    const search = req.query.search;
    const verified = req.query.verified;

    const where: Prisma.ArtistWhereInput = {};

    if (search && typeof search === "string" && search.trim() !== "") {
      where.name = { contains: search, mode: "insensitive" };
    }

    if (verified === "true") {
      where.verificationStatus = true;
    }
    if (verified === "false") where.verificationStatus = false;

    const artists = await prisma.artist.findMany({
      where,
      orderBy: {
        followerCount: "desc",
      },
      include: {
        _count: {
          select: {
            songs: true,
            albums: true,
          },
        },
      },
    });

    res.status(StatusCodes.OK).json({
      artists,
    });
  }
);

// @desc    Get top artists by follower count. Supports optional limit query parameter (default: 10, max: 100). Returns artists with song and album counts.
// @route   GET /api/artists/top
// @access  Public
export const getTopArtists = asyncHandler(
  async (req: Request, res: Response) => {
    const rawLimit = req.query.limit;
    let limit = DEFAULT_LIMIT;

    if (rawLimit && typeof rawLimit === "string") {
      const parsedLimit = parseInt(rawLimit, 10);
      if (!isNaN(parsedLimit) && parsedLimit > 0) {
        limit = Math.min(parsedLimit, MAX_LIMIT);
      }
    }

    const artists = await prisma.artist.findMany({
      take: limit,
      orderBy: {
        followerCount: "desc",
      },
      include: {
        _count: {
          select: {
            songs: true,
            albums: true,
          },
        },
      },
    });

    res.status(StatusCodes.OK).json({
      count: artists.length,
      limit,
      artists,
    });
  }
);

// @desc    Get artist by ID with all songs (ordered by play count) and albums. Returns 404 if artist not found.
// @route   GET /api/artists/:id
// @access  Public
export const getArtistById = asyncHandler(
  async (req: Request, res: Response) => {
    const rawId = req.params.id;
    const id = parseInt(rawId, 10);

    if (isNaN(id) || id <= 0) {
      res.status(StatusCodes.BAD_REQUEST);
      throw new Error("Invalid artist ID");
    }

    const artistProfile = await prisma.artist.findUnique({
      where: { id },
      include: {
        songs: {
          orderBy: {
            playCount: "desc",
          },
        },
        albums: true,
        _count: {
          select: {
            songs: true,
            albums: true,
          },
        },
      },
    });

    if (!artistProfile) {
      res.status(StatusCodes.NOT_FOUND);
      throw new Error("Artist not found");
    }

    res.status(StatusCodes.OK).json({
      artist: artistProfile,
    });
  }
);

// @desc    Get top songs for an artist by play count. Supports optional limit query parameter (default: 10, max: 100). Returns 404 if artist not found.
// @route   GET /api/artists/:id/top-songs
// @access  Public
export const getTopSong = asyncHandler(async (req: Request, res: Response) => {
  const rawId = req.params.id;
  const id = parseInt(rawId, 10);
  const rawLimit = req.query.limit;
  let limit = DEFAULT_LIMIT;

  if (rawLimit && typeof rawLimit === "string") {
    const parsedLimit = parseInt(rawLimit, 10);
    if (!isNaN(parsedLimit) && parsedLimit > 0) {
      limit = Math.min(parsedLimit, MAX_LIMIT);
    }
  }

  if (isNaN(id) || id <= 0) {
    res.status(StatusCodes.BAD_REQUEST);
    throw new Error("Invalid artist ID");
  }

  const artist = await prisma.artist.findUnique({
    where: { id },
    include: {
      songs: {
        take: limit,
        orderBy: {
          playCount: "desc",
        },
      },
    },
  });

  if (!artist) {
    res.status(StatusCodes.NOT_FOUND);
    throw new Error("Artist not found");
  }

  const songs = artist.songs || [];

  res.status(StatusCodes.OK).json({
    count: songs.length,
    limit,
    songs,
  });
});

// @desc    Create a new artist. Requires name (required), optional bio, dob (ISO date format), verificationStatus (string "true"/"false"), and optional image file upload. Returns the created artist.
// @route   POST /api/artists
// @access  Private/Admin
export const createArtist = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user?.isAdmin) {
      res.status(StatusCodes.FORBIDDEN);
      throw new Error("Not authorized as admin");
    }

    const { name, bio, dob, verificationStatus } = req.body;

    if (!name || typeof name !== "string" || name.trim() === "") {
      res.status(StatusCodes.BAD_REQUEST);
      throw new Error("Name is required and must be a non-empty string");
    }

    let isVerified = false;
    if (verificationStatus === "true" || verificationStatus === true) {
      isVerified = true;
    }

    let parsedDob: Date | null = null;
    if (dob && typeof dob === "string" && dob.trim() !== "") {
      const date = new Date(dob);
      if (isNaN(date.getTime())) {
        res.status(StatusCodes.BAD_REQUEST);
        throw new Error(
          "Invalid date format for dob. Use ISO format (YYYY-MM-DD)"
        );
      }
      parsedDob = date;
    }

    let imageUrl: string | null = null;

    if (req.file) {
      try {
        imageUrl = await uploadToCloudinary(req.file.path, {
          folder: "spotify-clone/artists",
          resource_type: "image",
        });
      } catch (error: any) {
        // Clean up temp file if it still exists
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        res.status(StatusCodes.INTERNAL_SERVER_ERROR);
        // Preserve the detailed error message from Cloudinary
        throw new Error(
          error?.message || "Failed to upload image to Cloudinary"
        );
      }
    }

    const artist = await prisma.artist.create({
      data: {
        name: name.trim(),
        bio: bio?.trim() || null,
        dob: parsedDob,
        verificationStatus: isVerified,
        image: imageUrl,
      },
    });

    res.status(StatusCodes.CREATED).json({
      artist,
    });
  }
);

// @desc    Update an artist with partial updates. Supports optional fields: name, bio (empty string clears), dob (ISO date format, empty string clears), verificationStatus (string "true"/"false"), and optional image file upload. Only provided fields are updated. Returns 404 if artist not found.
// @route   PUT /api/artists/:id
// @access  Private/Admin
export const updateArtistInfo = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user?.isAdmin) {
      res.status(StatusCodes.FORBIDDEN);
      throw new Error("Not authorized as admin");
    }

    const rawId = req.params.id;
    const id = parseInt(rawId, 10);

    if (isNaN(id) || id <= 0) {
      res.status(StatusCodes.BAD_REQUEST);
      throw new Error("Invalid artist ID");
    }

    const existingArtist = await prisma.artist.findUnique({
      where: { id },
    });

    if (!existingArtist) {
      res.status(StatusCodes.NOT_FOUND);
      throw new Error("Artist not found");
    }

    const { name, bio, dob, verificationStatus } = req.body;
    const data: {
      name?: string;
      bio?: string | null;
      dob?: Date | null;
      verificationStatus?: boolean;
      image?: string;
    } = {};

    if (name !== undefined) {
      if (typeof name !== "string" || name.trim() === "") {
        res.status(StatusCodes.BAD_REQUEST);
        throw new Error("Name must be a non-empty string");
      }
      data.name = name.trim();
    }

    if (bio !== undefined) {
      data.bio =
        bio && typeof bio === "string" && bio.trim() !== "" ? bio.trim() : null;
    }

    if (verificationStatus !== undefined) {
      if (verificationStatus === "true" || verificationStatus === true) {
        data.verificationStatus = true;
      } else if (
        verificationStatus === "false" ||
        verificationStatus === false
      ) {
        data.verificationStatus = false;
      } else {
        res.status(StatusCodes.BAD_REQUEST);
        throw new Error("verificationStatus must be 'true' or 'false'");
      }
    }

    if (dob !== undefined) {
      if (dob && typeof dob === "string" && dob.trim() !== "") {
        const date = new Date(dob);
        if (isNaN(date.getTime())) {
          res.status(StatusCodes.BAD_REQUEST);
          throw new Error(
            "Invalid date format for dob. Use ISO format (YYYY-MM-DD)"
          );
        }
        data.dob = date;
      } else {
        data.dob = null;
      }
    }

    if (req.file) {
      try {
        const imageUrl = await uploadToCloudinary(req.file.path, {
          folder: "spotify-clone/artists",
          resource_type: "image",
        });
        data.image = imageUrl;
      } catch (error: any) {
        // Clean up temp file if it still exists
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        res.status(StatusCodes.INTERNAL_SERVER_ERROR);
        // Preserve the detailed error message from Cloudinary
        throw new Error(
          error?.message || "Failed to upload image to Cloudinary"
        );
      }
    }

    const updatedArtist = await prisma.artist.update({
      where: { id },
      data,
    });

    res.status(StatusCodes.OK).json({
      artist: updatedArtist,
    });
  }
);
// @desc    Delete an artist by ID (Admin only). Cascades to delete all associated songs. Returns 404 if artist not found, 400 for invalid ID.
// @route   DELETE /api/artists/:id
// @access  Private/Admin
export const deleteArtist = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user?.isAdmin) {
      res.status(StatusCodes.FORBIDDEN);
      throw new Error("Not authorized as admin");
    }

    const rawId = req.params.id;
    const id = parseInt(rawId, 10);

    if (isNaN(id) || id <= 0) {
      res.status(StatusCodes.BAD_REQUEST);
      throw new Error("Invalid artist ID");
    }

    const existingArtist = await prisma.artist.findUnique({
      where: { id },
    });

    if (!existingArtist) {
      res.status(StatusCodes.NOT_FOUND);
      throw new Error("Artist not found");
    }

    await prisma.artist.delete({ where: { id } });

    res.status(StatusCodes.OK).json({
      message: "Artist deleted successfully",
    });
  }
);
