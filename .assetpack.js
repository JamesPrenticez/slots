import { pixiPipes } from "@assetpack/core/pixi";

/**
 * .assetpack.js
 *
 * entry:  ./raw-assets          → flat structure, no game subfolder
 * output: ./public/assets       → manifest.json at ./public/assets/manifest.json
 *
 * After build, asset aliases are exactly the folder/filename path:
 *   sprites{tps}/sym_h1.png   → alias "sprites/sym_h1.png"
 *   backgrounds/background.png → alias "backgrounds/background.png"
 *   audio/reel-spin.wav        → alias "audio/reel-spin.mp3"
 */
export default {
	entry: "./raw-assets",
	output: "./public/assets",
	ignore: ["**/*.md", "**/*.txt", "**/.DS_Store"],
	pipes: [
		...pixiPipes({
			cacheBust: true,
			resolutions: { default: 1 },
			manifest: {
				includeMetaData: false,
				createShortcuts: true,
				trimExtensions: true
			},
			texturePacker: {
				texturePacker: {
					padding: 4,
					nameStyle: "short",
					allowTrim: false,
					removeFileExtension: false
				},
				resolutionOptions: {
					resolutions: { default: 1 },
					maximumTextureSize: 4096
				}
			},
			audio: {
				outputs: [
					{
						formats: [".m4a"],
						recompress: false,
						options: { audioBitrate: 128, audioFrequency: 44100 }
					}
				]
			}
		})
	]
};
