# Habit Tracker

A habit tracker built with plain HTML, CSS, and vanilla JavaScript. **No framework, no build step, no bundler.**

## Running the project

Open `index.html` directly in a browser, or serve the folder statically:

```bash
python -m http.server 8000
```

There is nothing to compile, install, or transpile. If a change requires a build step to work, it's the wrong change.

## Hard constraints

- **No npm dependencies, no `package.json`, no `node_modules`.** No CDN `<script>` tags for frameworks or utility libraries either.
- **No JSX, no TypeScript, no Sass/PostCSS.** Ship `.html`, `.css`, and `.js` that the browser runs as-is.
- **No transpilation**, so write JS the target browsers already support. Modern syntax is fine (`const`/`let`, optional chaining, `async`/`await`); don't reach for anything needing a polyfill.
- Load `js/app.js` as a **classic script** (`<script src="...">`), not an ES module. Modules only work over HTTP, which would break opening `index.html` straight from disk. Keep the code in an IIFE so nothing leaks onto `window`.

## Structure

```
index.html      # single page: markup, links out to css/ and js/
css/styles.css  # all styles
js/app.js       # state, storage, rendering, events
```

Keep the tree flat. Reach for a new directory only when a folder actually gets crowded.

## Conventions

**HTML**
- Semantic elements over `<div>` soup: `<main>` for the app, a real `<table>` for the habit grid (`<th scope="row">` per habit, `<th scope="col">` per day), `<button>` for anything clickable.
- Every interactive control is keyboard-reachable and labeled (`<label for>`, or `aria-label` when no visible text).
- State that CSS needs to react to goes on the element as a `data-*` attribute or a class, not inline styles.

**CSS**
- Custom properties on `:root` for colors, spacing, and radii. Change the token, not thirty rules.
- Flexbox and Grid for layout. No float hacks, no `!important` outside a genuine override.
- Mobile-first: base rules for narrow screens, `min-width` media queries to widen.
- Respect `prefers-color-scheme` and `prefers-reduced-motion`.

**JavaScript**
- One file while the app stays this small, sectioned by concern (dates, state, rendering, events). Split it up only once it gets crowded. No globals.
- Render from state, don't mutate the DOM ad hoc — a single `render()` that redraws from the current state object is easier to keep correct than scattered `appendChild` calls. The one exception is ticking a box: that updates the cell's class in place, so the checkbox keeps keyboard focus.
- Build DOM nodes with `createElement` + `textContent`, not `innerHTML` — habit names are user input.
- Persist to `localStorage` under one namespaced key, serialized as JSON. Wrap reads in `try`/`catch` — storage can be unavailable or hold stale/corrupt data, and the app must still start.
- Use event delegation on the list container rather than binding a listener per habit row.
- Dates: store as `YYYY-MM-DD` local-date strings, not timestamps. Streak math on timestamps breaks across DST and timezones.

## Testing

No test runner. Verify by hand in the browser and check the console for errors. Before calling a change done, confirm: it works after a page reload (state persisted), it works with empty state (no habits yet), and keyboard navigation still reaches every control.
