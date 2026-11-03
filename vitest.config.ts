import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    fileParallelism: false,
    globalSetup: ["./vitest.global-setup.ts"],
    env: {
      DATABASE_URL: "postgresql://mohalla:mohalla@127.0.0.1:5432/mohalla_test",
      AUTH_SECRET: "test-secret-test-secret-test-secret",
    },
  },
});
