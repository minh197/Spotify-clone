import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { StatusCodes } from "http-status-codes";
import prisma from "../config/db";
import { generateToken } from "../config/jwt";
import bcrypt from "bcryptjs";

interface RegisterBody {
  email: string;
  password: string;
  username?: string;
  fullName?: string;
  isAdmin?: boolean;
  address?: string;
}

interface LoginBody {
  email: string;
  password: string;
}

function validateBody(req: Request, res: Response) {
  const { email, password } = req.body;

  if (!email || email.trim() === "" || !password || password.trim() === "") {
    res.status(StatusCodes.BAD_REQUEST);
    throw new Error("Email and password are required");
  }
  if (email.trim().length < 6) {
    res.status(StatusCodes.BAD_REQUEST);
    throw new Error("Email length needs to be 6 characters or more");
  }
  if (!email.includes("@")) {
    res.status(StatusCodes.BAD_REQUEST);
    throw new Error("Invalid email format");
  }
  return;
}

function validateUserLoginBody(req: Request, res: Response) {
  const { email, password } = req.body;

  if (!email || email.trim() === "" || !password || password.trim() === "") {
    res.status(StatusCodes.BAD_REQUEST);
    throw new Error("Email and password are required");
  }
  return;
}

// @desc    Register a new user. Requires email (min 6 chars, must contain @) and password. Optional fields: username, fullName, address, isAdmin (defaults to false). Returns user info and JWT token.
// @route   POST /api/users/register
// @access  Public
export const registerUser = asyncHandler(
  async (req: Request<{}, {}, RegisterBody>, res: Response) => {
    validateBody(req, res);

    const { email, password, username, fullName, isAdmin, address } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { email } });

    if (existingUser) {
      res.status(StatusCodes.BAD_REQUEST);
      throw new Error("User with this email already exists");
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        username,
        fullName,
        isAdmin: isAdmin ?? false,
        address,
      },
    });

    const token = generateToken(user.id);
    res.status(StatusCodes.CREATED).json({
      id: user.id,
      email: user.email,
      username: user.username,
      fullName: user.fullName,
      isAdmin: user.isAdmin,
      token,
    });
  }
);

// @desc    Login user with email and password. Returns user info and JWT token on success. Returns 401 for invalid credentials.
// @route   POST /api/users/login
// @access  Public
export const loginUser = asyncHandler(
  async (req: Request<{}, {}, LoginBody>, res: Response) => {
    validateUserLoginBody(req, res);

    const { email, password } = req.body;
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (!existingUser) {
      res.status(StatusCodes.UNAUTHORIZED);
      throw new Error("Invalid email or password");
    }

    const isMatch = await bcrypt.compare(password, existingUser.password);

    if (isMatch) {
      const token = generateToken(existingUser.id);
      res.status(StatusCodes.OK).json({
        id: existingUser.id,
        fullname: existingUser.fullName,
        isAdmin: existingUser.isAdmin,
        email: existingUser.email,
        username: existingUser.username,
        token,
      });
    } else {
      res.status(StatusCodes.UNAUTHORIZED);
      throw new Error("Invalid email or password");
    }
  }
);

// @desc    Get current authenticated user's profile. Returns user info excluding password. Returns 404 if user not found.
// @route   GET /api/users/profile
// @access  Private
export const getUserProfile = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) {
      res.status(StatusCodes.UNAUTHORIZED);
      throw new Error("Not authorized");
    }
    const existingUser = await prisma.user.findUnique({
      where: { id: req.user.id },
    });
    if (!existingUser) {
      res.status(StatusCodes.NOT_FOUND);
      throw new Error("There is no user with this id");
    }
    const { id, email, username, fullName, profilePicture, isAdmin } =
      existingUser;

    res.json({
      id,
      email,
      username,
      fullName,
      profilePicture,
      isAdmin,
    });
  }
);

// @desc    Update current authenticated user's profile. Supports partial updates for: fullName, username, address, phoneNumber, password (hashed automatically). Returns updated user info excluding password.
// @route   PUT /api/users/profile
// @access  Private
export const updateUserProfile = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user?.id) {
      res.status(StatusCodes.UNAUTHORIZED);
      throw new Error("User not authenticated");
    }

    const { fullName, username, address, phoneNumber, password } = req.body;
    const updateData: Partial<{
      fullName: string;
      username: string;
      address: string;
      phoneNumber: string;
      password: string;
      profilePicture: string;
    }> = {};

    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      updateData.password = hashedPassword;
    }

    if (fullName !== undefined) updateData.fullName = fullName;
    if (username !== undefined) updateData.username = username;
    if (address !== undefined) updateData.address = address;
    if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;

    if (Object.keys(updateData).length === 0) {
      res.status(StatusCodes.BAD_REQUEST);
      throw new Error("No fields provided to update");
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: updateData,
      select: {
        id: true,
        username: true,
        fullName: true,
        email: true,
        phoneNumber: true,
        address: true,
        profilePicture: true,
        isAdmin: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    res.status(StatusCodes.OK).json({
      message: "Profile updated successfully",
      user: updatedUser,
    });
  }
);

// @desc    Get all users (Admin only). Returns list of all users with their info excluding passwords. Includes user count.
// @route   GET /api/users
// @access  Private/Admin
export const getAllUsers = asyncHandler(
  async (_req: Request, res: Response) => {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        username: true,
        fullName: true,
        phoneNumber: true,
        address: true,
        profilePicture: true,
        isAdmin: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    res.status(StatusCodes.OK).json({
      count: users.length,
      users,
    });
  }
);
