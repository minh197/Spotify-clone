import jwt from "jsonwebtoken";

export interface JWTPayload {
  id: number;
  iat?: number;
  exp?: number;
}

export const generateToken = (userId: number): string => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not defined in environment variables");
  }
  // **REVIEW: nên sử dụng process.env.JWT_EXPIRE_IN
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });
  // **END_REVIEW
};

export const verifyToken = (token: string): JWTPayload | null => {
  try {
    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is not defined");
    }
    return jwt.verify(token, process.env.JWT_SECRET) as JWTPayload;
  } catch (error) {
    return null;
  }
};
