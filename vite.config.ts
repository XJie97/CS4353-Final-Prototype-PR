import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    // The separate frontend app runs its own node:test suites.
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
  server: { port: 3000, strictPort: true },
});
