import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { StatusCodes } from "http-status-codes";
import prisma from "../config/db";
import { generateToken } from "../config/jwt";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";

interface RegisterBody {
  email: string;
  password: string;
  username?: string;
  fullName?: string;
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

// @desc    Register new user
// @route   POST /api/users/register
// @access  Public
export const registerUser = asyncHandler(
  async (req: Request<{}, {}, RegisterBody>, res: Response) => {
    // TODO:
    // 1. Validate body (email, password, etc.)
    validateBody(req, res);

    const { email, password, username, fullName } = req.body;

    // 2. Check if user exists
    const existingUser = await prisma.user.findUnique({ where: { email } });

    if (existingUser) {
      res.status(StatusCodes.BAD_REQUEST);
      throw new Error("User with this email already exists");
    }
    // 3. Hash password (bcrypt)
    const hashedPassword = await bcrypt.hash(password, 10);
    // 4. Create user with prisma.user.create
    const user = await prisma.user.create({
      data: {
        email, // from req.body
        password: hashedPassword,
        username, // optional
        fullName, // optional
        // any other fields you want to initialize (e.g. address: null)
      },
    });

    // 5. Generate JWT with generateToken(user.id)
    const token = generateToken(user.id);
    // 6. Return basic user info + token
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

// @desc    Login user
// @route   POST /api/users/login
// @access  Public
export const loginUser = asyncHandler(
  async (req: Request<{}, {}, LoginBody>, res: Response) => {
    // TODO:
    validateUserLoginBody(req, res);

    const { email, password } = req.body;
    // 1. Find user by email
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (!existingUser) {
      res.status(StatusCodes.UNAUTHORIZED);
      throw new Error("Invalid email or password");
    }
    // 2. Compare password with bcrypt
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

// @desc    Get current user's profile
// @route   GET /api/users/profile
// @access  Private
export const getUserProfile = asyncHandler(
  async (req: Request, res: Response) => {
    // req.user is populated by protect middleware
    // and typed via your express.d.ts augmentation

    // TODO:
    // 1. Use req.user.id to fetch full user from prisma
    //    (including relations later if you want)
    // 2. Return sanitized profile

    res.status(StatusCodes.NOT_IMPLEMENTED).json({
      message: "getUserProfile not implemented yet",
    });
  }
);

// @desc    Update current user's profile
// @route   PUT /api/users/profile
// @access  Private
export const updateUserProfile = asyncHandler(
  async (req: Request, res: Response) => {
    // TODO:
    // 1. Use req.user.id
    // 2. Read fields from req.body (fullName, username, address, etc.)
    // 3. Optionally handle profilePicture later (Cloudinary)
    // 4. prisma.user.update(...)
    // 5. Return updated user (sanitized)

    res.status(StatusCodes.NOT_IMPLEMENTED).json({
      message: "updateUserProfile not implemented yet",
    });
  }
);

// @desc    Get all users (admin)
// @route   GET /api/users
// @access  Private/Admin
export const getAllUsers = asyncHandler(async (req: Request, res: Response) => {
  // TODO:
  // 1. prisma.user.findMany(...)
  // 2. Select safe fields only (no password)
  // 3. Return list

  res.status(StatusCodes.NOT_IMPLEMENTED).json({
    message: "getAllUsers not implemented yet",
  });
});
