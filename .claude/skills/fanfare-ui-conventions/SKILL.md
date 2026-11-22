---
name: fanfare-ui-conventions
description: Enforces FANFARE STUDIOS's UI/styling conventions — CSS variables only for color and font (never a raw hex or px value), color-mix() for any transparent variant of a color variable, the composite font-token naming scheme, and a visibility check on every state a feature has. Use this whenever adding or changing a React component, writing CSS/styled-components, or picking a color or font size in an FANFARE STUDIOS repo.
---

# FANFARE STUDIOS UI Conventions

Before adding a UI component or writing styles in an FANFARE STUDIOS repo,
apply the rules below.

## Check the user can actually see it

A component that satisfies every rule here can still be invisible, and no
test layer catches it — `toBeVisible()` asserts layout, not that a person
can see the thing. "It's in the DOM and the test passes" is precisely the
evidence that doesn't count here.

So for **each state the feature has** — empty, loading, error, open,
mid-animation — confirm the element is:

1. **Inside the viewport** at a normal size, not appended below the fold.
2. **Not covered** by anything pinned, sticky, or overlaid.
3. **Contrasting** with the color it actually lands on, not the color of
   the surface it was designed against.
4. **Reachable without hunting** — the user shouldn't have to scroll to
   find feedback about something they just clicked.

Both failures this rule exists for looked completely fine in the code:

- A progress bar filled with `--color-white`, translated above its dark
  parent bar so it landed on the white page. White on white.
- Three loading skeletons appended to an already-overflowing list: the
  first behind the pinned "load more" button, the other two past the fold.
  The user clicked and saw nothing change.

Screenshots are the check, but only if aimed — one taken at the wrong
scroll position, or of the wrong state, shows a UI that looks correct. If
the element you're verifying isn't in the frame, that's the bug, not a bad
screenshot.

If the color an element needs isn't in the palette, that's the ask case
below — not a reason to reach for the nearest token and hope.

## Before you commit: run the token check

```bash
bash .claude/skills/fanfare-ui-conventions/check-css-tokens.sh
```

Raw hex/`rgba()`, raw font sizes in any unit, and colors and font sizes in
inline styles are all pattern matches with one right answer — so let the
script find them instead of re-reading your own CSS for them. It exits
non-zero with file:line for each finding. A `font-size: 0.8125em` once
slipped through a self-check because the rule listed `px` and `rem`; the
script doesn't have opinions about units.

What it *can't* judge, and what the rules below are for: whether the color
you picked is the right one, and whether the result is actually visible.

## Colors and fonts are CSS variables only

Never hardcode a hex color, `rgb()`/`rgba()` value, or a raw `px`/`rem` font
size in a component or stylesheet.

- **Colors**: use an existing color variable. If none fits, use the
  closest existing one rather than defining a new color. Don't introduce a
  new color value without asking the user first — the palette is meant to
  stay closed.

  Pick by **role, not by hue**: a destructive action is the `negative`
  role, not "the red one". Where a project has no neutral grey ramp, a
  muted tone is `color-mix()` off the black token, per the next rule.
- **Transparent variants of a color** (an overlay, a hover tint, a faded
  border): don't hardcode `rgba()`/`rgb(… / N%)` or a new hex+alpha value,
  even as a one-off. Derive it from the existing color variable with
  `color-mix()`:

  ```css
  background: color-mix(in srgb, var(--color-black) 50%, transparent);
  ```

  This keeps the transparent version tied to the base token — if the base
  color changes, the transparent variant follows automatically.
- **Reach for the composite font token, not `font-size`.** Typography is
  set with the `font` shorthand in one declaration, so weight, size, line
  height, and family stay locked together:

  ```css
  .label {
  	font: var(--font-{family}-bold-sm);
  }
  ```

  Setting a bare `font-size` is the exception, not the default — if you're
  writing one, check first that no composite token covers the case.

- **Font variables**: composite font tokens follow this naming scheme:

  ```
  --font-{family}-{weight if not the family's default}-{size}: [weight] [size]/[line-height] [family];
  ```

  Each part is itself a variable, never a literal:

  ```css
  --font-{family}-bold-sm: var(--font-weight-semibold) var(--font-size-sm)/1 var(--font-{family});
  ```

  **`{family}` is per-project; the rest of the vocabulary is not.** Which
  families exist changes with the brand, so read the project's font
  stylesheet for the actual names — never assume the family from another
  project, or from an example in this skill. The `{weight}` and `{size}`
  segments stay the same everywhere, so `-bold-sm` means the same thing
  whatever the family is.

  Reuse an existing font variable if one already matches; only define a new
  one when the combination genuinely doesn't exist yet — and compose it from
  the existing `--font-weight-*` / `--font-size-*` / family variables, so a
  ramp change still propagates.

- **The weight segment is a role, not a number.** `-bold-` means "this
  family's emphasised style", which is whichever `--font-weight-*` the token
  actually resolves to — often `--font-weight-semibold`, not `700`. If you
  need to know the real weight, read the token's value; don't infer it from
  the name, and don't "correct" a `-bold-` token that resolves to semibold.

  The segment is **omitted** when the weight is the family's default — either
  because the family ships a single weight, or because that family's base
  style is the normal one. So all three of these are correctly named:

  ```css
  --font-{single-weight-family}-md:  /* one weight only, nothing to distinguish */
  --font-{family}-md:                /* this family's normal-weight style */
  --font-{family}-bold-md:           /* this family's emphasised style */
  ```

  Unlike the palette, `--font-weight-*` is growable like the size ramp: if a
  design needs a step that isn't there, add it (`--font-weight-medium: 500`)
  and compose a token from it rather than writing the number inline.

- **Variable-width families need a second declaration.** A width axis is a
  variation setting, not part of the `font` shorthand, so `font-variation-settings`
  has to sit alongside it or the width silently doesn't apply:

  ```css
  font: var(--font-{family}-bold-base);
  font-variation-settings: var(--font-width-narrow);
  ```

  This applies to **any** variable font with a width axis, not one specific
  family — check the project's font stylesheet for which families are
  variable and which `--font-width-*` values exist. A family without a width
  axis ignores the declaration, so adding it "just in case" is not harmless:
  it reads as a deliberate narrow style to the next person.

- **Font sizes**: check for an existing `--font-size-*` variable before
  picking one, and read the project's font stylesheet for what the rem unit
  is worth there — a project that redefines the root font size means the
  ramp's numbers won't read as px. Don't undo that root value, and don't
  convert a rem token to px because the number looked wrong.

  Nothing on the ramp fits? Add the missing step and use that — a size ramp
  is meant to grow, unlike the palette. What's not allowed is skipping the
  token: no raw font size in a component stylesheet, in **any** unit —
  `px`, `rem`, `em`, `%`, or a keyword.

## When something doesn't fit

If a design calls for a **color** with no existing variable, stop and ask
rather than inventing a one-off value — the palette is meant to stay
consistent across every FANFARE STUDIOS project.

A missing **font size** is the one case that doesn't need a question: add
the step to the ramp as described above and carry on. The distinction is
that a new color changes the palette, while a new size fills a hole in a
scale that already implies it.
