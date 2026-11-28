import { describe, expect, it, vi } from "vitest";

vi.mock("pixi.js", () => ({ Assets: {} }));

import { mergePacks } from "./assets";

const e = (alias: string[], src: string[]) => ({ alias, src });
const manifest = {
	bundles: [
		{
			name: "default",
			assets: [
				e(["packs/default/backgrounds/background.png", "packs/default/backgrounds/background"], ["a.png"]),
				e(["packs/default/audio/boom.wav", "packs/default/audio/boom"], ["boom-d.m4a"]),
				e(["packs/default/sprites"], ["sprites-d.json"]),
				e(["packs/halloween/backgrounds/background.png", "packs/halloween/backgrounds/background"], ["b.png"]),
				e(["packs/halloween/sprites"], ["sprites-h.json"])
			]
		}
	]
};
const find = (m: ReturnType<typeof mergePacks>, alias: string) =>
	m.bundles[0].assets.find(a => [a.alias].flat().includes(alias));

describe("mergePacks", () => {
	it("default pack: strips prefix and adds bare-name shortcuts", () => {
		const m = mergePacks(manifest, "default");
		expect(find(m, "background")?.src).toEqual(["a.png"]);
		expect(find(m, "backgrounds/background.png")).toBe(find(m, "background.png"));
		expect(m.bundles[0].assets).toHaveLength(3);
	});

	it("active pack overrides per file and falls back to default for the rest", () => {
		const m = mergePacks(manifest, "halloween");
		expect(find(m, "background")?.src).toEqual(["b.png"]); // overridden
		expect(find(m, "boom")?.src).toEqual(["boom-d.m4a"]); // fallback
		expect(find(m, "sprites")?.src).toEqual(["sprites-h.json"]); // atlas replaced whole
		expect(m.bundles[0].assets).toHaveLength(3);
	});
});
