import { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import asyncHandler from "express-async-handler";
import { verifyToken } from "./config/jwt";
import prisma from "../config/db";

export const protect = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    // 1. Read Authorization header
    const authHeader = req.headers.authorization;

    // 2. Validate that it starts with "Bearer "
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(StatusCodes.UNAUTHORIZED);
      throw new Error("Not authorized, no token");
    }

    // 3. Extract token from header
    const token = authHeader.split(" ")[1];
    // 4. Call verifyToken(token)
    const decoded = verifyToken(token);
    if (!decoded) {
      res.status(StatusCodes.UNAUTHORIZED);
      throw new Error("Not authorized, token failed");
    }
    
    //get user from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        username: true,
        fullName: true,
        email: true,
        profilePicture: true,
        isAdmin: true,
      },
    });

    if (!user) {
      res.status(StatusCodes.UNAUTHORIZED);
      throw new Error("Not authorized, user not found");
    }

    req.user = req.user = {
      id: user.id,
      name: user.fullName || user.username || "User", // Prefer fullName, fallback to username
      email: user.email,
      profilePicture: user.profilePicture,
      isAdmin: user.isAdmin,
    };
    next();
  }
);

export const admin = (req: Request, res: Response, next: NextFunction) => {
  // 1. Check req.user exists
  if (!req.user) {
    res.status(StatusCodes.UNAUTHORIZED);
    throw new Error("Not authorized, no user found");
  }
  if (!req.user.isAdmin) {
    res.status(StatusCodes.FORBIDDEN);
    throw new Error("Not authorized as admin");
  } else {
    next();
  }
};
