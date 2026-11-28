// pnpm assets:check — what does each pack override, and is each pack complete enough to run?
// A pack only ships the files it changes (the rest fall back to `default`),
// except the sprite atlas, which is one sheet: if a pack ships sprites{tps}/ it must
// contain every sprite the default pack has.
import { existsSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = "raw-assets/packs";
const walk = dir =>
	readdirSync(dir).flatMap(f => {
		const p = join(dir, f);
		return statSync(p).isDirectory() ? walk(p) : [p];
	});
const files = pack => walk(join(root, pack)).map(f => relative(join(root, pack), f).replaceAll("\\", "/"));

const base = new Set(files("default"));
const sprites = list => new Set(list.filter(f => f.startsWith("sprites{tps}/")).map(f => f.slice(13)));
let failed = false;

for (const pack of readdirSync(root).filter(p => p !== "default" && existsSync(join(root, p)) && statSync(join(root, p)).isDirectory())) {
	const mine = files(pack).filter(f => !f.endsWith(".md"));
	const overrides = mine.filter(f => base.has(f));
	const added = mine.filter(f => !base.has(f));
	console.log(`\n${pack}: ${overrides.length} override default, ${added.length} new`);
	for (const f of added) console.log(`  + ${f}`);

	const mySprites = sprites(mine);
	if (mySprites.size) {
		const missing = [...sprites([...base])].filter(f => !mySprites.has(f));
		if (missing.length) {
			failed = true;
			console.log(`  ✖ sprite atlas replaces default's but is missing ${missing.length}:`);
			for (const f of missing) console.log(`      ${f}`);
		}
	}
}

console.log(failed ? "\nFAILED" : "\nOK");
process.exit(failed ? 1 : 0);
