import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { StatusCodes } from "http-status-codes";
import prisma from "../config/db";
import { Prisma } from "@prisma/client";
import { uploadToCloudinary } from "../config/cloudinary";
import fs from "fs";

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
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            fullName: true,
            profilePicture: true,
          },
        },
        songs: {
          include: {
            song: {
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
            },
          },
          orderBy: {
            createdAt: "asc",
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
    if (!existingPlaylist) {
      res.status(StatusCodes.NOT_FOUND);
      throw new Error("Playlist not found");
    }
    res.status(StatusCodes.OK).json({
      playlist: existingPlaylist,
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

// @desc    Create a new playlist
// @route   POST /api/playlists
// @access  Private
export const createPlaylist = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) {
      res.status(StatusCodes.UNAUTHORIZED);
      throw new Error("Not authorized");
    }

    const userId = req.user.id;
    const { name, description, isPublic, coverImage } = req.body;

    // Validate required name
    if (!name || typeof name !== "string" || name.trim() === "") {
      res.status(StatusCodes.BAD_REQUEST);
      throw new Error("Name is required and must be a non-empty string");
    }

    const trimmedName = name.trim();
    const cleanedName = trimmedName.replace(/^["']|["']$/g, "");
    if (cleanedName === "") {
      res.status(StatusCodes.BAD_REQUEST);
      throw new Error("Name cannot be empty or just quotes");
    }

    // Validate optional description
    let parsedDescription: string | null = null;
    if (description !== undefined && description !== null) {
      if (typeof description !== "string" || description.trim() === "") {
        res.status(StatusCodes.BAD_REQUEST);
        throw new Error("Description must be a non-empty string");
      }
      parsedDescription = description.trim();
    }

    // Validate isPublic (boolean, defaults to true)
    let parsedIsPublic = true;
    if (isPublic !== undefined && isPublic !== null) {
      if (isPublic === "true" || isPublic === true) {
        parsedIsPublic = true;
      } else if (isPublic === "false" || isPublic === false) {
        parsedIsPublic = false;
      } else {
        res.status(StatusCodes.BAD_REQUEST);
        throw new Error("isPublic must be a boolean or 'true'/'false' string");
      }
    }

    // Handle coverImage: either file upload OR URL string
    let parsedCoverImage: string | null = null;

    // Priority 1: File upload (if file is uploaded via multer)
    if (req.file) {
      try {
        parsedCoverImage = await uploadToCloudinary(req.file.path, {
          folder: "spotify-clone/playlists",
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

    const playlist = await prisma.playlist.create({
      data: {
        name: cleanedName,
        description: parsedDescription,
        isPublic: parsedIsPublic,
        coverImage: parsedCoverImage,
        creatorId: userId,
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

    res.status(StatusCodes.CREATED).json({
      playlist,
    });
  }
);

// @desc    Update playlist info
// @route   PUT /api/playlists/:id
// @access  Private (creator only)
export const updatePlaylist = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) {
      res.status(StatusCodes.UNAUTHORIZED);
      throw new Error("Not authorized");
    }

    const userId = req.user.id;
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
      throw new Error("Playlist not found");
    }

    // Check if user is the creator
    if (existingPlaylist.creatorId !== userId) {
      res.status(StatusCodes.FORBIDDEN);
      throw new Error("Not authorized to update this playlist");
    }

    const { name, description, isPublic, coverImage } = req.body;

    const data: {
      name?: string;
      description?: string | null;
      isPublic?: boolean;
      coverImage?: string | null;
    } = {};

    // Validate name (optional update)
    if (name !== undefined) {
      if (typeof name !== "string" || name.trim() === "") {
        res.status(StatusCodes.BAD_REQUEST);
        throw new Error("Name must be a non-empty string");
      }
      const trimmedName = name.trim();
      const cleanedName = trimmedName.replace(/^["']|["']$/g, "");
      if (cleanedName === "") {
        res.status(StatusCodes.BAD_REQUEST);
        throw new Error("Name cannot be empty or just quotes");
      }
      data.name = cleanedName;
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

    // Validate isPublic (optional update)
    if (isPublic !== undefined) {
      if (isPublic === "true" || isPublic === true) {
        data.isPublic = true;
      } else if (isPublic === "false" || isPublic === false) {
        data.isPublic = false;
      } else {
        res.status(StatusCodes.BAD_REQUEST);
        throw new Error("isPublic must be a boolean or 'true'/'false' string");
      }
    }

    // Handle coverImage: either file upload OR URL string (optional update)
    if (req.file) {
      // Priority 1: File upload
      try {
        const imageUrl = await uploadToCloudinary(req.file.path, {
          folder: "spotify-clone/playlists",
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

    const updatedPlaylist = await prisma.playlist.update({
      where: { id: parsedId },
      data,
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
      playlist: updatedPlaylist,
    });
  }
);

// @desc    Delete playlist
// @route   DELETE /api/playlists/:id
// @access  Private (creator only)
export const deletePlaylist = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) {
      res.status(StatusCodes.UNAUTHORIZED);
      throw new Error("Not authorized");
    }

    const userId = req.user.id;
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
      throw new Error("Playlist not found");
    }

    // Check if user is the creator
    if (existingPlaylist.creatorId !== userId) {
      res.status(StatusCodes.FORBIDDEN);
      throw new Error("Not authorized to delete this playlist");
    }

    await prisma.playlist.delete({ where: { id: parsedId } });

    res.status(StatusCodes.OK).json({
      message: "Playlist deleted successfully",
    });
  }
);

// @desc    Add songs to playlist
// @route   POST /api/playlists/:id/songs
// @access  Private (creator or collaborator)
export const addSongsToPlaylist = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) {
      res.status(StatusCodes.UNAUTHORIZED);
      throw new Error("Not authorized");
    }

    const userId = req.user.id;
    const rawId = req.params.id;
    const parsedId = parseInt(rawId, 10);

    if (isNaN(parsedId) || parsedId <= 0) {
      res.status(StatusCodes.BAD_REQUEST);
      throw new Error("Invalid playlist id");
    }

    const existingPlaylist = await prisma.playlist.findUnique({
      where: { id: parsedId },
      include: {
        collaborators: {
          select: {
            userId: true,
          },
        },
      },
    });

    if (!existingPlaylist) {
      res.status(StatusCodes.NOT_FOUND);
      throw new Error("Playlist not found");
    }

    // Check if user is creator or collaborator
    const isCreator = existingPlaylist.creatorId === userId;
    const isCollaborator = existingPlaylist.collaborators.some(
      (collab) => collab.userId === userId
    );

    if (!isCreator && !isCollaborator) {
      res.status(StatusCodes.FORBIDDEN);
      throw new Error("Not authorized to modify this playlist");
    }

    // Get songIds from request body
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

    // Check if all songs exist
    const songs = await prisma.song.findMany({
      where: {
        id: { in: parsedSongIds },
      },
      select: {
        id: true,
      },
    });

    // Verify all songs were found
    if (songs.length !== parsedSongIds.length) {
      const foundIds = songs.map((s) => s.id);
      const missingIds = parsedSongIds.filter((id) => !foundIds.includes(id));
      res.status(StatusCodes.NOT_FOUND);
      throw new Error(`Songs not found: ${missingIds.join(", ")}`);
    }

    // Add songs to playlist (using createMany with skipDuplicates to handle duplicates)
    const createData = parsedSongIds.map((songId) => ({
      songId,
      playlistId: parsedId,
    }));

    await prisma.songsPlaylists.createMany({
      data: createData,
      skipDuplicates: true,
    });

    // Fetch updated playlist with songs
    const updatedPlaylist = await prisma.playlist.findUnique({
      where: { id: parsedId },
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            fullName: true,
            profilePicture: true,
          },
        },
        songs: {
          include: {
            song: {
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
            },
          },
          orderBy: {
            createdAt: "asc",
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
      message: `Successfully added ${parsedSongIds.length} song(s) to playlist`,
      playlist: updatedPlaylist,
    });
  }
);

// @desc    Remove song from playlist
// @route   DELETE /api/playlists/:id/songs/:songId
// @access  Private (creator or collaborator)
export const removeSongFromPlaylist = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) {
      res.status(StatusCodes.UNAUTHORIZED);
      throw new Error("Not authorized");
    }

    const userId = req.user.id;
    const rawPlaylistId = req.params.id;
    const rawSongId = req.params.songId;
    const parsedPlaylistId = parseInt(rawPlaylistId, 10);
    const parsedSongId = parseInt(rawSongId, 10);

    if (isNaN(parsedPlaylistId) || parsedPlaylistId <= 0) {
      res.status(StatusCodes.BAD_REQUEST);
      throw new Error("Invalid playlist id");
    }

    if (isNaN(parsedSongId) || parsedSongId <= 0) {
      res.status(StatusCodes.BAD_REQUEST);
      throw new Error("Invalid song id");
    }

    const existingPlaylist = await prisma.playlist.findUnique({
      where: { id: parsedPlaylistId },
      include: {
        collaborators: {
          select: {
            userId: true,
          },
        },
      },
    });

    if (!existingPlaylist) {
      res.status(StatusCodes.NOT_FOUND);
      throw new Error("Playlist not found");
    }

    // Check if user is creator or collaborator
    const isCreator = existingPlaylist.creatorId === userId;
    const isCollaborator = existingPlaylist.collaborators.some(
      (collab) => collab.userId === userId
    );

    if (!isCreator && !isCollaborator) {
      res.status(StatusCodes.FORBIDDEN);
      throw new Error("Not authorized to modify this playlist");
    }

    // Check if song exists in playlist
    const songInPlaylist = await prisma.songsPlaylists.findUnique({
      where: {
        songId_playlistId: {
          songId: parsedSongId,
          playlistId: parsedPlaylistId,
        },
      },
      include: {
        song: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    if (!songInPlaylist) {
      res.status(StatusCodes.NOT_FOUND);
      throw new Error("Song is not in this playlist");
    }

    // Remove song from playlist
    await prisma.songsPlaylists.delete({
      where: {
        songId_playlistId: {
          songId: parsedSongId,
          playlistId: parsedPlaylistId,
        },
      },
    });

    // Fetch updated playlist
    const updatedPlaylist = await prisma.playlist.findUnique({
      where: { id: parsedPlaylistId },
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            fullName: true,
            profilePicture: true,
          },
        },
        songs: {
          include: {
            song: {
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
            },
          },
          orderBy: {
            createdAt: "asc",
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
      message: `Song "${songInPlaylist.song.title}" removed from playlist successfully`,
      playlist: updatedPlaylist,
    });
  }
);

// @desc    Follow a playlist
// @route   POST /api/playlists/:id/follow
// @access  Private
export const followPlaylist = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) {
      res.status(StatusCodes.UNAUTHORIZED);
      throw new Error("Not authorized");
    }

    const userId = req.user.id;
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
      throw new Error("Playlist not found");
    }

    // Check if user is already following
    const existingFollow = await prisma.usersFollowPlaylist.findUnique({
      where: {
        userId_playlistId: {
          userId,
          playlistId: parsedId,
        },
      },
    });

    if (existingFollow) {
      res.status(StatusCodes.BAD_REQUEST);
      throw new Error("You are already following this playlist");
    }

    // Create follow relationship and update follower count
    await prisma.$transaction([
      prisma.usersFollowPlaylist.create({
        data: {
          userId,
          playlistId: parsedId,
        },
      }),
      prisma.playlist.update({
        where: { id: parsedId },
        data: {
          followerCount: {
            increment: 1,
          },
        },
      }),
    ]);

    const updatedPlaylist = await prisma.playlist.findUnique({
      where: { id: parsedId },
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
      message: "Playlist followed successfully",
      playlist: updatedPlaylist,
    });
  }
);

// @desc    Unfollow a playlist
// @route   DELETE /api/playlists/:id/follow
// @access  Private
export const unfollowPlaylist = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) {
      res.status(StatusCodes.UNAUTHORIZED);
      throw new Error("Not authorized");
    }

    const userId = req.user.id;
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
      throw new Error("Playlist not found");
    }

    // Check if user is following
    const existingFollow = await prisma.usersFollowPlaylist.findUnique({
      where: {
        userId_playlistId: {
          userId,
          playlistId: parsedId,
        },
      },
    });

    if (!existingFollow) {
      res.status(StatusCodes.BAD_REQUEST);
      throw new Error("You are not following this playlist");
    }

    // Remove follow relationship and update follower count
    await prisma.$transaction([
      prisma.usersFollowPlaylist.delete({
        where: {
          userId_playlistId: {
            userId,
            playlistId: parsedId,
          },
        },
      }),
      prisma.playlist.update({
        where: { id: parsedId },
        data: {
          followerCount: {
            decrement: 1,
          },
        },
      }),
    ]);

    const updatedPlaylist = await prisma.playlist.findUnique({
      where: { id: parsedId },
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
      message: "Playlist unfollowed successfully",
      playlist: updatedPlaylist,
    });
  }
);
