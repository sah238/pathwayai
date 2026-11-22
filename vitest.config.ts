import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
      // Outside Next's react-server build, "server-only" throws on import; use its empty build in tests.
      "server-only": fileURLToPath(new URL("./node_modules/server-only/empty.js", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    setupFiles: ["./tests/setup/block-network.ts"],
    include: ["**/*.test.ts"],
    exclude: ["node_modules/**", ".next/**", "data/build/**"],
  },
});
