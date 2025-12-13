import { defineConfig } from "prisma";

export default defineConfig({
  adapter: process.env.DATABASE_URL!,
});

