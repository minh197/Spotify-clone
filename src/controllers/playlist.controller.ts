import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { StatusCodes } from "http-status-codes";
import prisma from "../config/db";
import { Prisma } from "@prisma/client";

// @desc    Get all public playlist with an optional search
// @route   GET /api/playlists
// @access  Public
export const getAllPublicPlaylists = asyncHandler(
  async (req: Request, res: Response) => {
    const search = req.query.search;

    const where: Prisma.PlaylistWhereInput = {
      isPublic: true,
    };

    if (search && typeof search === "string" && search.trim() !== "") {
      const searchTerm = search.trim();
      where.name = { contains: searchTerm };
    }
    const playlists = await prisma.playlist.findMany({
      where,
    });
    res.status(StatusCodes.OK).json({
      playlists,
    });
  }
);

// @desc    Get playlist by id
// @route   GET /api/playlists/:id
// @access  Public

export const getPlaylistById = asyncHandler(
  async (req: Request, res: Response) => {
    const rawId = req.params.id;
    const parsedId = parseInt(rawId, 10);

    if (isNaN(parsedId) || parsedId <= 0) {
      res.status(StatusCodes.BAD_REQUEST);
      throw new Error("Invalid playlist id");
    }
    const existingPlaylist = await prisma.playlist.findUnique({
      where: { id: parsedId },
    });
    if (!existingPlaylist) {
      res.status(StatusCodes.NOT_FOUND);
      throw new Error("Album not found");
    }
    res.status(StatusCodes.OK).json({
      existingPlaylist,
    });
  }
);

// @desc    Get user's playlists (playlists created by the authenticated user)
// @route   GET /api/playlists/user/me
// @access  Private
export const getMyPlaylist = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) {
      res.status(StatusCodes.UNAUTHORIZED);
      throw new Error("Not authorized");
    }

    const userId = req.user.id;
    const search = req.query.search;

    const where: Prisma.PlaylistWhereInput = {
      creatorId: userId,
    };

    // Optional search filter
    if (search && typeof search === "string" && search.trim() !== "") {
      where.name = { contains: search.trim(), mode: "insensitive" };
    }

    const playlists = await prisma.playlist.findMany({
      where,
      orderBy: {
        updatedAt: "desc", // Most recently updated first
      },
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            fullName: true,
            profilePicture: true,
          },
        },
        _count: {
          select: {
            songs: true,
            followers: true,
          },
        },
      },
    });

    res.status(StatusCodes.OK).json({
      count: playlists.length,
      playlists,
    });
  }
);
