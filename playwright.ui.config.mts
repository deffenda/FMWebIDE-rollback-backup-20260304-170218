import { defineConfig } from "@playwright/test";

const enableCrossBrowser = process.env.UI_TEST_CROSS_BROWSER === "1";

export default defineConfig({
  testDir: "tests/ui/native-parity",
  testMatch: ["**/*.spec.mts"],
  fullyParallel: false,
  timeout: 90_000,
  expect: {
    timeout: 10_000
  },
  retries: process.env.CI ? 1 : 0,
  reporter: [
    ["list"],
    ["html", { outputFolder: "test-results/ui-native-parity-html", open: "never" }],
    ["json", { outputFile: "test-results/ui-native-parity/playwright-results.json" }]
  ],
  outputDir: "test-results/ui-native-parity",
  use: {
    baseURL: process.env.UI_TEST_BASE_URL || "http://127.0.0.1:3100",
    headless: true,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "retain-on-failure"
  },
  projects: [
    {
      name: "chromium",
      use: {
        viewport: { width: 1512, height: 982 }
      }
    },
    ...(enableCrossBrowser
      ? [
          {
            name: "firefox",
            use: {
              viewport: { width: 1512, height: 982 }
            }
          },
          {
            name: "webkit",
            use: {
              viewport: { width: 1512, height: 982 }
            }
          }
        ]
      : [])
  ],
  webServer: process.env.UI_TEST_BASE_URL
    ? undefined
    : {
        command: "npm run dev -- --port 3100",
        url: "http://127.0.0.1:3100",
        timeout: 180_000,
        reuseExistingServer: true
      }
});
