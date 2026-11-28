import { Assets } from "pixi.js";

/**
 * Asset packs — raw-assets/packs/<name>/… builds to public/assets/packs/<name>/…
 * and every alias in manifest.json carries that `packs/<name>/` prefix.
 *
 * At boot we merge the manifest so game code never sees the prefix:
 *   1. the `default` pack's assets are the base,
 *   2. the active pack's assets override them (same alias → replaced),
 *   3. `packs/<name>/` is stripped, and the bare file name is added as a shortcut.
 *
 * So code keeps asking for "sym_h1.png" / "FTS_SlimeDrop" / "background", and a pack
 * only has to ship the files it changes. The one exception is the sprite atlas
 * (`sprites{tps}`): it is a single sheet, so a pack that ships one replaces it whole.
 */

const DEFAULT_PACK = "default";
const PACK_PREFIX = /^packs\/([^/]+)\//;

type Entry = { alias: string | string[]; src: string | string[] };
type Manifest = { bundles: { name: string; assets: Entry[] }[] };

const strip = (a: string): string => a.replace(PACK_PREFIX, "");
const base = (a: string): string => a.slice(a.lastIndexOf("/") + 1);
const noExt = (a: string): string => a.replace(/\.[^./]+$/, "");

export function mergePacks(manifest: Manifest, active: string): Manifest {
	return {
		...manifest,
		bundles: manifest.bundles.map(bundle => {
			const merged = new Map<string, Entry>();
			// default first, active pack second so it overwrites; unprefixed entries pass through as "default"
			const packs = active === DEFAULT_PACK ? [DEFAULT_PACK] : [DEFAULT_PACK, active];

			for (const pack of packs) {
				for (const entry of bundle.assets) {
					const aliases = [entry.alias].flat();
					const owner = PACK_PREFIX.exec(aliases[0])?.[1] ?? DEFAULT_PACK;
					if (owner !== pack) continue;

					const stripped = aliases.map(strip);
					const all = [...new Set([...stripped, ...stripped.map(base)])];
					merged.set(noExt(stripped[0]), { ...entry, alias: all });
				}
			}
			return { ...bundle, assets: [...merged.values()] };
		})
	};
}

let ready: Promise<void> | undefined;

/** Fetch the manifest, merge the packs, and init Pixi's Assets. Call once at startup. */
export function initAssets(pack: string): Promise<void> {
	ready ??= fetch("./assets/manifest.json")
		.then(r => {
			if (!r.ok) throw new Error(`manifest.json: ${r.status} (run pnpm assets:build)`);
			return r.json() as Promise<Manifest>;
		})
		.then(manifest => Assets.init({ basePath: "./assets", manifest: mergePacks(manifest, pack) }));
	return ready;
}

/** Resolves once `initAssets` has finished; await before loading any bundle. */
export function assetsReady(): Promise<void> {
	if (!ready) throw new Error("initAssets() was not called");
	return ready;
}
