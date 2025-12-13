import jwt, { SignOptions } from "jsonwebtoken";

export interface JWTPayload {
  id: number;
  iat?: number;
  exp?: number;
}

export const generateToken = (userId: number): string => {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error("JWT_SECRET is not defined in environment variables");
  }

  const jwtExpireIn = process.env.JWT_EXPIRE_IN;
  if (!jwtExpireIn) {
    throw new Error("JWT_EXPIRE_IN is not defined in environment variables");
  }

  return jwt.sign({ id: userId }, jwtSecret, {
    expiresIn: jwtExpireIn,
  } as SignOptions);
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
