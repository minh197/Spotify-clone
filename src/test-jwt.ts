// src/test-jwt.ts
import "dotenv/config"; // <-- load .env

import { generateToken, verifyToken } from "./middleware/config/jwt";

const token = generateToken("test-user-id");
console.log("Generated Token:", token);

console.log("Decoded:", verifyToken(token));
