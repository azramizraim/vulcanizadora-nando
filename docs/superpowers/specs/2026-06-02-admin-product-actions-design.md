# Admin Product Actions — Design Spec

**Date:** 2026-06-02
**Status:** Approved
**Author:** opencode

## Problem

Admins of Vulcanizadora Nando have no way to remove tires (llantas) from the
inventory once registered, and no way to temporarily stop a tire from being sold
without deleting it (e.g., during supplier disputes, seasonal removal, or when
waiting on a price update). Staff users should not have access to destructive
operations.

## Goals

- Give admins a single, discoverable place to manage each product's lifecycle
  from the Inventory view.
- Provide two distinct operations: **permanent delete** and **pause/resume
  sales**.
- Preserve the existing edit and transfer workflows.
- Make the destructive action safe (typed confirmation).
- Keep the visual style consistent with the existing industrial dark UI.

## Non-Goals

- Audit log of deletions (YAGNI — can be added later if needed).
- Bulk delete / bulk pause.
- Editing the `active` field from the Edit modal (toggle is its own action).
- Hiding paused products from the Inventory list by default — they stay
  visible, with a clear visual indicator, so admins can find and reactivate
  them.

## UX Design

### Action menu (admin only)

In the **Acciones** column of every product row, replace the standalone Edit
button with a `⋮` icon button. For non-admins, the column keeps only the
existing transfer button (unchanged).

Clicking `⋮` opens a small dropdown anchored to the button with three rows:

| Item                  | Icon    | Color   | Behavior                                  |
|-----------------------|---------|---------|-------------------------------------------|
| Editar                | `edit`  | default | Opens the existing Edit modal             |
| Desactivar/Reactivar  | `pause` / `play_arrow` | amber | Toggles `active` field, closes menu       |
| Eliminar definitivamente | `delete` | red  | Opens the delete confirmation modal       |

Menu closes on outside click and on Escape.

### Visual state when paused

- Row opacity drops to 60%.
- A small `⏸ Pausado` badge appears next to the brand (amber background).
- Stock number is not highlighted in red/green (neutral).
- The toggle menu item label changes to **Reactivar venta** with `play_arrow`.

### Delete confirmation modal

- Title: `Eliminar {nombre del producto}`.
- Body: warning text plus an input that requires the admin to type the word
  `ELIMINAR` (uppercase) to enable the confirm button.
- Confirm button is red and labeled **Eliminar para siempre**.
- Cancel button is the existing muted `Cancelar` style.
- On success: modal closes, list refreshes, success toast/alert.

### Filter toggle (optional convenience)

A small toggle above the table: `Mostrar pausados` (default: on). When off,
paused products are filtered out of the visible list. Paused products
**remain in the database** — toggling the filter back on brings them back.

## Data Model

No schema migration is required because the project uses Supabase Postgres,
which is schemaless in practice for this app. A new optional field `active`
is added to product documents with a default of `true` for existing records.

```js
// Product document (Inventario table)
{
  id: uuid,
  name: string,         // Medida
  brand: string,
  sku: string,
  qty: int,
  price: number,
  cost: number,
  img: string,
  branch: string,
  active: boolean,      // NEW — defaults to true if missing
  created_at: timestamp,
  updated_at: timestamp
}
```

**Backward compatibility:** `active` is read with a `?? true` fallback
everywhere it is consumed, so legacy records without the field are treated as
active.

## Components & Behavior

### `src/components/Inventory.jsx`

Add the following:

1. **State**
   - `menuOpenId` — id of the product whose dropdown is open (or `null`).
   - `deleteTarget` — product object the admin is confirming deletion of (or
     `null`).
   - `confirmText` — controlled value of the typed-confirmation input.
   - `showPaused` — boolean for the optional filter toggle (default `true`).

2. **Refs**
   - `menuRef` — ref on each dropdown container, used by the outside-click and
     Escape handlers.

3. **Handlers**
   - `toggleMenu(id)` — opens/closes the dropdown for one product.
   - `handleToggleActive(product)` — calls `updateData('Inventario', id,
     { active: !product.active })` and refreshes the list. Disabled for
     non-admins (defense in depth, even though the button is hidden).
   - `openDeleteModal(product)` — sets `deleteTarget` and resets `confirmText`.
   - `handleDeleteProduct()` — if `confirmText === 'ELIMINAR'`, calls
     `deleteData('Inventario', deleteTarget.id)`, closes modal, refreshes
     list. Otherwise the button stays disabled.
   - `useEffect` with `mousedown` and `keydown` listeners to close the menu
     on outside click or Escape.

4. **UI changes**
   - Desktop table: the existing `<button>` for Edit (line 702) is replaced
     with a single `⋮` button that is wrapped in a `relative` div containing
     the dropdown panel. The transfer button stays as-is.
   - Mobile cards: the existing `Edit` button (line 728) is replaced with a
     `⋮` button + dropdown. Transfer button stays.
   - Above the search bar: a small toggle row `Mostrar pausados` (admin
     only).
   - Paused rows/cards: dimmed + amber badge.

### `src/components/POS.jsx`

The call to `fetchData('Inventario', activeBranch)` does not change. The
filtering for `active === true` is done in the component after the fetch,
so the existing call signature stays the same. Concretely, after the data
is loaded, products with `active === false` are filtered out before they
are rendered in the catalog. The filter uses `?? true` so legacy records
without the field are still shown.

```js
const available = data.filter(p => p.active ?? true)
```

### `src/services/api.js`

No changes. `deleteData` (line 195) and `updateData` (line 226) already exist
and are reused.

## Error Handling

- `deleteData` and `updateData` already return `{ success: false }` on error
  and log to the console. The handlers surface the failure with a Spanish
  `alert()` matching the existing pattern in the file
  (`alert('Error al eliminar: ' + e.message)`).
- The confirmation input is `disabled` while a delete is in flight, and the
  confirm button shows `Eliminando...` to prevent double-submits.
- The menu is closed immediately on click of an action so the admin sees
  clear feedback.

## Testing

Manual smoke test checklist:

1. As admin, open Inventory. Each product shows the `⋮` button.
2. Click `⋮` on a product → dropdown opens with three items. Click outside
   → it closes. Press Escape → it closes.
3. Click **Editar** → existing Edit modal opens with current values.
4. Click **Desactivar venta** → row dims, badge appears, menu closes.
   Reload the page → the product is still in the list, paused.
5. Open POS in the same branch → the paused product is not in the catalog.
6. Back to Inventory, click `⋮` again → menu shows **Reactivar venta**.
   Click it → row returns to normal, badge disappears, appears in POS again.
7. Click **Eliminar definitivamente** → confirmation modal appears.
   Type `BORRAR` → confirm button stays disabled. Type `ELIMINAR` → button
   enables. Click it → product disappears from the list, alert confirms.
8. Reload → product is gone from Inventory, gone from POS, gone from DB.
9. As non-admin staff user, open Inventory. The `⋮` button is not visible.
   Only the transfer button is shown. The `Mostrar pausados` toggle is also
   hidden for non-admins.
10. Edge case: a product loaded from the DB that has no `active` field is
    treated as active (legacy compatibility).

## Open Questions

None — all design decisions resolved during brainstorming.
