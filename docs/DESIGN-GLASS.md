# Glass design language

**Audience:** anyone styling a CodeMentor AI page.

Glass is a calm, translucent layer on top of the existing light blue and burgundy design. It lives in one place: section 19 of [css/student-premium.css](../css/student-premium.css). A page opts in with the body class `glass-ui`. Without that class, nothing changes.

Everything is screen-only (`@media screen`). Print, including the Completion badge print view, never sees glass.

## Tokens

| Token | Value | Use |
|---|---|---|
| `--glass-bg` | white at 62% | Elevated surfaces: the hero/next action, KPI tiles, right-rail widgets |
| `--glass-bg-strong` | white at 86% | Text-heavy areas, forms, panels, the top bar, toasts, dialogs |
| `--glass-bg-item` | white at 72%, no blur | Repeated list items: feed cards, task cards, roadmap and badge cards |
| `--glass-border`, `--glass-border-top` | 1px light border, brighter top edge | Every glass surface |
| `--glass-blur` | 16px | Blur on containers only |
| `--glass-shadow` | soft, layered | Elevated surfaces |
| `--glass-radius` | 18px | Cards and panels |
| `--glass-sidebar` | deep burgundy at 88% | The workspace sidebar |

## Components

`.glass` (base), `.glass-card`, `.glass-panel` (sidebars and right rails), `.glass-bar` (top bar, composer, sticky headers) and `.glass-chip`. Existing class hooks are skinned directly, so pages keep their markup:
- the sidebar and top bar;
- `.sp-next` and `.kpi-tile`;
- `.community-*` surfaces;
- `.overview-*` (admin) and `.company-panel`;
- `.dashboard-card` and the other card types.

## The backdrop

`body.glass-ui::before` is a fixed, CSS-only layer behind everything: a blue-to-teal gradient plus three large, very soft burgundy, blue and teal blobs. It has no images, video or dependencies. It drifts very slowly only when the system allows motion.

## Do

- Put glass on **elevated** surfaces: the hero, KPI tiles, feed cards, the composer, right-rail widgets, the top bar, toasts and dialogs.
- Use `--glass-bg-strong` (or solid white) where people **read or type**: long text, forms, tables and panels.
- Keep **code solid**: code blocks, the code editor, program input and output.
- Blur the **container**, and give the repeated items inside it the lighter `--glass-bg-item` with no blur.
- Check contrast with `node tests/glass.cjs`. It composites each surface over the worst points of the backdrop.

## Don't

- Don't put `--glass-bg` behind a paragraph of lesson text, a table or a form.
- Don't add `backdrop-filter` to every card in a long feed or list; it is slow when scrolling.
- Don't use glass in print styles, and don't add an `@media print` rule to the glass section.
- Don't stack glass on glass on glass. One translucent layer over the backdrop is enough.
- Don't add new colours: use the tokens above and the `--cm-*` palette.

## Example

```html
<body class="workspace-page student-ui glass-ui">
  <section class="glass-card">…</section>     <!-- elevated: light glass -->
  <form class="glass-panel">…</form>           <!-- form: strong glass -->
  <pre><code>…</code></pre>                    <!-- code: always opaque -->
</body>
```

## Fallbacks and preferences

- **No `backdrop-filter`** (checked with `@supports`, including `-webkit-backdrop-filter`): every glass token becomes a solid colour.
- **`prefers-reduced-transparency: reduce`:** solid surfaces and no blur.
- **`prefers-contrast: more`:** white surfaces, darker borders, no backdrop.
- **`prefers-reduced-motion: reduce`:** the backdrop does not drift.
- **Light theme only.**

## Tests

`tests/glass.cjs` checks:
- WCAG AA (4.5:1) for ink, muted, link, success and amber text on every glass surface, against every gradient end and every blob overlap;
- the sidebar text, including the current page item;
- that the guard fails on a deliberately weak surface;
- the fallbacks and preferences;
- that glass is screen-only;
- the "never translucent" rules;
- that the backdrop is CSS-only.
