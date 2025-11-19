import express, { Application, Request, Response } from "express";
import dotenv from "dotenv";
import cors from "cors";
// import { errorHandler } from "./middleware/error.middleware";
import prisma from "./config/db";

// Load environment variables
dotenv.config();

// Initialize Express app
const app: Application = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check route
app.get("/", (_req: Request, res: Response) => {
  res.json({
    message: "🎵 Spotify Clone API",
    version: "1.0.0",
    status: "Running",
  });
});

// Error Handler Middleware (must be last)
// app.use(errorHandler);

// Port configuration
const PORT = process.env.PORT || 5000;

// Start server
const startServer = async () => {
  try {
    await prisma.$connect();
    console.log("✅ Database connected successfully");

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📍 http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on("SIGINT", async () => {
  await prisma.$disconnect();
  process.exit(0);
});

startServer();

export default app;
