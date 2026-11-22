/**
 * CharacterAnimation — the framework's semantic animation vocabulary.
 *
 * These are stable, game-facing names that Commands use to drive a character
 * (`spine.play("max-win")`). Each game's ThemeConfig maps them to whatever its
 * own skeleton actually named them, so the same command code works for any
 * skeleton. Kept in the framework core (not a game folder) because every title
 * speaks this vocabulary.
 *
 * Add or rename keys freely — they are constants, not skeleton data.
 */
export type CharacterAnimation = "idle" | "spin" | "win" | "big-win" | "max-win" | "lose" | "interact";
/** A semantic key from the theme, or any raw skeleton animation name. */
export type AnimationName = CharacterAnimation | (string & {});
