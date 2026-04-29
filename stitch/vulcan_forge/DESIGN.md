```markdown
# Design System Specification: Industrial Precision

## 1. Overview & Creative North Star
**The Creative North Star: "The Machined Aesthetic"**
This design system moves away from the generic, bubbly SaaS templates of the last decade. Instead, it adopts a high-end, industrial editorial feel that mirrors the precision of automotive engineering. We are not just building a dashboard; we are designing a digital workshop.

The system breaks the "standard template" look through **Tonal Layering** and **Intentional Asymmetry**. We favor breathing room and massive typography scales over tight grids and containment lines. By treating the UI as a series of machined parts rather than digital boxes, we create an environment that feels authoritative, professional, and bespoke to 'Vulcanizadora Nando'.

---

## 2. Colors & Surface Philosophy
The palette is rooted in the "Deep Charcoal" and "Slate Gray" of an industrial garage, punctuated by high-visibility accents.

### Color Roles
- **Primary (`#ff9238`):** Use for critical actions and brand presence. This "Construction Orange" must be used sparingly to maintain its "Warning/Action" impact.
- **Secondary (`#6ebaf7`):** The "Electric Blue" serves as the data accent—ideal for charts, active states, and secondary information flows.
- **Surface & Background (`#000f1e`):** A midnight-industrial base that provides a premium, low-light environment for high-data density.

### The "No-Line" Rule
**Borders are prohibited for sectioning.** Boundaries must be defined solely through background color shifts. To separate a sidebar from a main feed, place a `surface-container-low` section against the `surface` background. This creates a "milled" look where components appear carved out of the interface rather than pasted on top.

### The "Glass & Gradient" Rule
To elevate the "SaaS" look into "High-End Editorial," use **Glassmorphism** for floating overlays (modals, tooltips). Use the `surface-variant` with a 60% opacity and a `20px` backdrop-blur. 
*Signature Texture:* Apply a subtle linear gradient (Top-Left to Bottom-Right) from `primary` to `primary-container` on main CTAs to give them a metallic, 3D sheen.

---

## 3. Typography: Editorial Authority
We utilize a pairing of **Space Grotesk** for high-impact headlines and **Inter** for data-heavy utility.

- **Display & Headlines (Space Grotesk):** These should feel massive and "architectural." Use `display-lg` (3.5rem) for main dashboard overviews. The wide apertures of Space Grotesk mirror technical drawings.
- **Body & Labels (Inter):** Inter handles the heavy lifting of inventory lists. Use `body-md` (0.875rem) for most data points to maximize information density without sacrificing legibility.
- **Visual Hierarchy:** Maintain a 4:1 scale ratio between your largest display type and your smallest label to create an "Editorial" rhythm that guides the eye through complex inventory data.

---

## 4. Elevation & Depth
We reject the 2010-era "drop shadow." Hierarchy is achieved through **Tonal Layering**.

- **The Layering Principle:** 
    1. Base Level: `surface` (The floor)
    2. Content Areas: `surface-container-low` (The workbench)
    3. Interactive Cards: `surface-container-highest` (The tools)
- **Ambient Shadows:** For floating elements, use a shadow with a 32px blur and 6% opacity, tinted with `primary-dim`. This mimics the way light bounces off a polished concrete floor.
- **The "Ghost Border" Fallback:** If a divider is absolutely necessary for accessibility, use the `outline-variant` token at **15% opacity**. It should be a "whisper" of a line, never a hard stroke.

---

## 5. Components & Interaction

### Buttons: The Machined Toggle
- **Primary:** High-contrast `primary` background. Sharp `md` (0.375rem) corners. No border. Hover state should shift to `primary-fixed-dim`.
- **Tertiary:** No background. Use `on-surface` text with a `primary` underline that expands on hover.

### Cards: The Data Vessel
Forbid the use of divider lines within cards. Use **Vertical White Space** (16px or 24px) to separate the "Tire Brand" from the "Stock Level."
- **Structure:** Use `surface-container-low` with a `lg` (0.5rem) corner radius.

### Input Fields: Industrial Precision
- **State:** Instead of a border-color change on focus, use a subtle 2px left-accent bar of `primary` color.
- **Background:** Always `surface-container-lowest` to create a "recessed" feel, as if the input is etched into the dashboard.

### Inventory Chips
- **Status Chips:** Use `secondary_container` for "In Stock" and `error_container` for "Low Stock." Text should remain `on-secondary-container` for high-end tonal harmony. Avoid "Christmas Tree" syndrome—keep the saturation low.

---

## 6. Do's and Don'ts

### Do:
- **Use Intentional Asymmetry:** Align high-level stats (Revenue, Sales) to a different grid rhythm than the inventory list to create visual interest.
- **Embrace Dark Space:** Allow the `surface` color to "breathe" between major sections.
- **Use Data as Design:** Let large numbers (e.g., "452 Tires") in `display-md` be the primary visual element of a card.

### Don't:
- **No Pure Black:** Never use `#000000`. Use the provided `surface` tokens to maintain the "Midnight Steel" depth.
- **No Default Shadows:** Avoid the "fuzzy grey" shadow. If it doesn't have a color tint, it doesn't belong.
- **No Container Bloat:** Avoid putting a container inside a container inside a container. Use background color shifts to define nesting.

---

**Director’s Final Note:**
*Vulcanizadora Nando is about grit, steel, and efficiency. This system should feel like a high-performance engine: every element has a purpose, and there is no unnecessary "chrome." Build with the confidence of a master mechanic.*```