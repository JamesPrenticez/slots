import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
	testDir: "./e2e",
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	reporter: "html",

	use: {
		baseURL: "http://localhost:3000",
		trace: "on-first-retry"
	},

	projects: [
		{
			name: "chromium",
			use: { ...devices["Desktop Chrome"] }
		}
	],

	// Outcomes come from MockRGS in dev, so the Vite server is all e2e needs.
	// dev:with-assets runs AssetPack first, so a fresh checkout has public/assets.
	webServer: {
		command: "pnpm dev:with-assets",
		port: 3000,
		reuseExistingServer: !process.env.CI,
		timeout: 180_000
	}
});
