import { sign, verify } from "jsonwebtoken";

const rawJwtSecret = process.env.JWT_SECRET;

type DecodedToken = {
  id: number;
  iat?: number;
  exp?: number;
};

if (!rawJwtSecret) {
  throw new Error("Missing JWT_SECRET env variable");
}

const JWT_SECRET: string = rawJwtSecret;

export function generateToken(userId: number): string {
  return sign({ id: userId }, JWT_SECRET, { expiresIn: "1h" });
}

export function verifyToken(token: string): { id: number } | null {
  try {
    const decoded = verify(token, JWT_SECRET) as DecodedToken;

    if (
      !decoded.id ||
      typeof decoded !== "object" ||
      typeof decoded.id !== "number"
    ) {
      return null;
    }
    return { id: decoded.id };
  } catch (error) {
    console.error("Error verifying token:", error);
    return null;
  }
}
