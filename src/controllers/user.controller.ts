import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { StatusCodes } from "http-status-codes";
import prisma from "../config/db";
import { generateToken } from "../config/jwt";
import bcrypt from "bcryptjs";
import {
  validateRegisterUser,
  validateLoginUser,
  validateUpdateUserProfile,
  RegisterUserDto,
  LoginUserDto,
} from "../dto/user.dto";
import { validateLimit, validatePage, calculateSkip } from "../dto/query.dto";

// @desc    Register a new user. Requires email (min 6 chars, must contain @) and password. Optional fields: username, fullName, address, isAdmin (defaults to false). Returns user info and JWT token.
// @route   POST /api/users/register
// @access  Public
export const registerUser = asyncHandler(
  async (req: Request<{}, {}, RegisterUserDto>, res: Response) => {
    const userData = validateRegisterUser(req.body);
    const { email, password, username, fullName, isAdmin, address } = userData;

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
  async (req: Request<{}, {}, LoginUserDto>, res: Response) => {
    const { email, password } = validateLoginUser(req.body);
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

    const updateData = validateUpdateUserProfile(req.body);

    if (Object.keys(updateData).length === 0) {
      res.status(StatusCodes.BAD_REQUEST);
      throw new Error("No fields provided to update");
    }

    // Hash password if provided
    if (updateData.password) {
      updateData.password = await bcrypt.hash(updateData.password, 10);
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

// @desc    Get all users (Admin only). Returns paginated list of all users with their info excluding passwords.
// @route   GET /api/users?page=1&limit=10
// @access  Private/Admin
export const getAllUsers = asyncHandler(async (req: Request, res: Response) => {
  const page = validatePage(req.query.page as string | undefined);
  const limit = validateLimit(req.query.limit as string | undefined);
  const skip = calculateSkip(page, limit);

  // Get total count for pagination metadata
  const totalCount = await prisma.user.count();

  // Get paginated users
  const users = await prisma.user.findMany({
    skip,
    take: limit,
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
    orderBy: {
      createdAt: "desc",
    },
  });

  const totalPages = Math.ceil(totalCount / limit);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  res.status(StatusCodes.OK).json({
    pagination: {
      currentPage: page,
      limit,
      totalCount,
      totalPages,
      hasNextPage,
      hasPrevPage,
    },
    count: users.length,
    users,
  });
});
