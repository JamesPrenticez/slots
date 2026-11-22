import react from "@vitejs/plugin-react";
import { resolve } from "path";
import { defineConfig } from "vite";
import svgr from "vite-plugin-svgr";

export default defineConfig({
	plugins: [react(), svgr()],
	base: "./",
	resolve: {
		alias: {
			fanfarebaseslot: resolve(__dirname, "src/fanfarebaseslot"),
			"@stores": resolve(__dirname, "src/stores"),
			"@game-ui": resolve(__dirname, "src/game-ui"),
			"@components": resolve(__dirname, "src/components"),
			"@hooks": resolve(__dirname, "src/hooks"),
			"@fanfare/util": resolve(__dirname, "src/common/util"),
			"@ui/helpers": resolve(__dirname, "src/ui/helpers"),
			"@sound-manager": resolve(__dirname, "src/slot/sound/GameSoundManager.ts"),
			"@ui/icons": resolve(__dirname, "src/ui/icons"),
			"@assets": resolve(__dirname, "src/ui/assets"),
			"@utils": resolve(__dirname, "src/utils"),
			"@styles": resolve(__dirname, "src/styles")
		}
	},
	server: {
		port: 3000,
		headers: { "X-Frame-Options": "ALLOWALL" }
	},
	build: {
		target: "es2022",
		rollupOptions: {
			output: {
				manualChunks: {
					"vendor-pixi": ["pixi.js"],
					"vendor-react": ["react", "react-dom"],
					"vendor-zustand": ["zustand"]
				}
			}
		}
	}
});
