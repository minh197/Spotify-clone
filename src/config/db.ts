import { PrismaClient } from "@prisma/client";

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
// Learn more: https://pris.ly/d/help/next-js-best-practices

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

const prismaClientSingleton = () => {
  return new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });
};

const prisma = global.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}

// Test database connection
export const connectDB = async (): Promise<void> => {
  try {
    await prisma.$connect();
    console.log("✅ PostgreSQL Database Connected Successfully");
  } catch (error) {
    console.error("❌ Database Connection Failed:", error);
    process.exit(1);
  }
};

// Graceful disconnection
export const disconnectDB = async (): Promise<void> => {
  try {
    await prisma.$disconnect();
    console.log("✅ Database Disconnected Successfully");
  } catch (error) {
    console.error("❌ Error disconnecting from database:", error);
  }
};

export default prisma;
