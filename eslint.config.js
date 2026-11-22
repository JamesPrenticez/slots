import js from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import prettier from "eslint-config-prettier";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig([
	globalIgnores(["dist", "public/assets", ".assetpack", "playwright-report", "test-results", ".claude"]),
	{
		files: ["**/*.{js,jsx}"],
		extends: [js.configs.recommended, reactHooks.configs.flat.recommended, reactRefresh.configs.vite],
		plugins: {
			"simple-import-sort": simpleImportSort
		},
		languageOptions: {
			ecmaVersion: 2020,
			globals: globals.browser,
			parserOptions: {
				ecmaVersion: "latest",
				ecmaFeatures: { jsx: true },
				sourceType: "module"
			}
		},
		rules: {
			"no-unused-vars": [
				"error",
				{
					varsIgnorePattern: "^[A-Z_]",
					argsIgnorePattern: "^_",
					caughtErrorsIgnorePattern: "^_"
				}
			],
			"simple-import-sort/imports": "error",
			"simple-import-sort/exports": "error"
		}
	},
	{
		files: ["vite.config.js", "vite.config.ts"],
		languageOptions: {
			globals: { ...globals.browser, ...globals.node }
		}
	},
	{
		files: ["**/*.{ts,tsx}"],
		extends: [
			js.configs.recommended,
			...tseslint.configs.recommended,
			reactHooks.configs.flat.recommended,
			reactRefresh.configs.vite
		],
		plugins: {
			"simple-import-sort": simpleImportSort
		},
		languageOptions: {
			parser: tseslint.parser,
			ecmaVersion: 2020,
			globals: globals.browser,
			parserOptions: {
				ecmaVersion: "latest",
				ecmaFeatures: { jsx: true },
				sourceType: "module"
			}
		},
		rules: {
			"no-unused-vars": "off",
			"@typescript-eslint/no-unused-vars": [
				"error",
				{
					varsIgnorePattern: "^[A-Z_]",
					argsIgnorePattern: "^_",
					caughtErrorsIgnorePattern: "^_"
				}
			],
			"simple-import-sort/imports": [
				"error",
				{
					groups: [
						["^node:"],
						["^react", "^@?\\w"],
						// Path aliases from vite.config.ts — kept apart from npm packages.
						["^(fanfarebaseslot)(/.*|$)", "^@(fanfare/util|ui|sound-manager|stores|game-ui|components|hooks)(/.*|$)"],
						["^\\.\\./", "^\\./", "^\\."]
					]
				}
			],
			"simple-import-sort/exports": "error"
		}
	},
	{
		// Node-side config files, not browser code.
		files: ["*.config.{js,ts}", ".assetpack.js"],
		languageOptions: {
			globals: globals.node
		}
	},
	// Must stay last: turns off every ESLint rule that would fight Prettier
	// over whitespace. Formatting is Prettier's job, correctness is ESLint's.
	prettier
]);
