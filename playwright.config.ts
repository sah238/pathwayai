import { defineConfig } from "@playwright/test";

const PORT = 3100;

/**
 * npm run test:e2e builds the app and runs tests/browser at phone and desktop
 * width. It uses an installed browser, so no browser download is needed:
 * Edge by default, or set E2E_BROWSER_CHANNEL=chrome.
 */
export default defineConfig({
  testDir: "tests/browser",
  outputDir: "test-results/browser",
  workers: 1,
  timeout: 120_000,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    actionTimeout: 15_000,
    channel: process.env.E2E_BROWSER_CHANNEL ?? "msedge",
  },
  projects: [
    { name: "phone", use: { viewport: { width: 375, height: 812 } } },
    { name: "desktop", use: { viewport: { width: 1280, height: 800 } } },
  ],
  webServer: {
    command: `node tests/browser/serve.mjs ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 300_000,
  },
});
