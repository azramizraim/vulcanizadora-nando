# Admin Product Actions - Plan de Implementación

> **Para agentes:** Ejecutar tarea por tarea. Cada paso es una acción de 2-5 minutos.

**Meta:** Dar a los admins la capacidad de eliminar llantas permanentemente o pausar/reanudar su venta desde la vista de Inventario.

**Arquitectura:** Modificar `Inventory.jsx` para agregar menú de acciones, modal de confirmación, handlers de borrado y toggle. Modificar `POS.jsx` para filtrar llantas pausadas. Sin cambios en `api.js` (reutiliza `deleteData` y `updateData`).

**Tech Stack:** React 18, Supabase (ya configurado), Tailwind CSS. No hay framework de tests — verificar con `npm run lint` y checklist manual.

**Spec de referencia:** `docs/superpowers/specs/2026-06-02-admin-product-actions-design.md`

---

### Task 1: Agregar estados para menú y modal de borrado

**Files:**
- Modify: `src/components/Inventory.jsx:7-27`

- [ ] **Paso 1: Agregar nuevos estados después de la línea 27**

Insertar después de la línea 27 (`const [searchingAll, setSearchingAll] = useState(false)`):

```javascript
const [menuOpenId, setMenuOpenId] = useState(null)
const [deleteTarget, setDeleteTarget] = useState(null)
const [confirmText, setConfirmText] = useState('')
const [deleting, setDeleting] = useState(false)
const [showPaused, setShowPaused] = useState(true)
const menuRef = useRef(null)
```

- [ ] **Paso 2: Verificar lint**

```bash
npm run lint
```
Esperado: sin errores.

- [ ] **Paso 3: Commit**

```bash
git add src/components/Inventory.jsx
git commit -m "feat(inventory): add state for admin actions menu and delete modal"
```

---

### Task 2: Agregar useEffect para cerrar menú on outside click / Escape

**Files:**
- Modify: `src/components/Inventory.jsx` (después del useEffect de `focusProduct`, antes del de `loadInventory`)

- [ ] **Paso 1: Insertar el effect después del useEffect de focusProduct**

```javascript
useEffect(() => {
  const handleClickOutside = (e) => {
    if (menuRef.current && !menuRef.current.contains(e.target)) {
      setMenuOpenId(null)
    }
  }
  const handleEscape = (e) => {
    if (e.key === 'Escape') {
      setMenuOpenId(null)
    }
  }
  document.addEventListener('mousedown', handleClickOutside)
  document.addEventListener('keydown', handleEscape)
  return () => {
    document.removeEventListener('mousedown', handleClickOutside)
    document.removeEventListener('keydown', handleEscape)
  }
}, [])
```

- [ ] **Paso 2: Verificar lint**

```bash
npm run lint
```

- [ ] **Paso 3: Commit**

```bash
git add src/components/Inventory.jsx
git commit -m "feat(inventory): close actions menu on outside click and Escape"
```

---

### Task 3: Agregar handlers `handleToggleActive` y `handleDeleteProduct`

**Files:**
- Modify: `src/components/Inventory.jsx` (después de `handleEditProduct` / `openEditModal`, antes de la sección de scanner)

- [ ] **Paso 1: Insertar los handlers después de `openEditModal`**

```javascript
const handleToggleActive = async (product) => {
  if (!isAdmin) return
  setMenuOpenId(null)
  const newActive = !(product.active ?? true)
  try {
    const res = await updateData('Inventario', product.id, { active: newActive })
    if (res.success) {
      const data = await fetchData('Inventario', activeBranch)
      if (Array.isArray(data)) setProducts(data)
    } else {
      throw new Error('Error en actualización')
    }
  } catch (e) {
    alert('Error al cambiar estado: ' + e.message)
  }
}

const openDeleteModal = (product) => {
  setMenuOpenId(null)
  setDeleteTarget(product)
  setConfirmText('')
}

const closeDeleteModal = () => {
  setDeleteTarget(null)
  setConfirmText('')
}

const handleDeleteProduct = async () => {
  if (!isAdmin || !deleteTarget) return
  if (confirmText !== 'ELIMINAR') return
  setDeleting(true)
  try {
    const res = await deleteData('Inventario', deleteTarget.id)
    if (res.success) {
      const data = await fetchData('Inventario', activeBranch)
      if (Array.isArray(data)) setProducts(data)
      closeDeleteModal()
      alert('Llanta eliminada')
    } else {
      throw new Error('Error en eliminación')
    }
  } catch (e) {
    alert('Error al eliminar: ' + e.message)
  } finally {
    setDeleting(false)
  }
}
```

- [ ] **Paso 2: Agregar import de `deleteData`**

En la línea 2, cambiar:
```javascript
import { fetchData, postData, updateData, db, storage } from '../services/api'
```
por:
```javascript
import { fetchData, postData, updateData, deleteData, db, storage } from '../services/api'
```

- [ ] **Paso 3: Verificar lint**

```bash
npm run lint
```

- [ ] **Paso 4: Commit**

```bash
git add src/components/Inventory.jsx
git commit -m "feat(inventory): add toggle-active and delete handlers"
```

---

### Task 4: Reemplazar botón de Editar desktop con menú `⋮`

**Files:**
- Modify: `src/components/Inventory.jsx:700-705` (celda de Acciones en la tabla desktop)

- [ ] **Paso 1: Reemplazar el bloque de Acciones de la fila de la tabla**

Reemplazar las líneas 700-705 (el `<td className="px-6 py-4 text-center">` con el botón Edit y el botón de traspaso):

```jsx
<td className="px-6 py-4 text-center">
   <div className="flex items-center justify-center gap-2">
     {isAdmin && (
       <div className="relative" ref={menuOpenId === p.id ? menuRef : null}>
         <button
           onClick={() => setMenuOpenId(menuOpenId === p.id ? null : p.id)}
           className="w-8 h-8 rounded-full border border-white/5 flex items-center justify-center text-slate-400 hover:text-white transition-all"
           aria-label="Más acciones"
         >
           <span className="material-symbols-outlined text-[16px]">more_vert</span>
         </button>
         {menuOpenId === p.id && (
           <div className="absolute right-0 top-10 z-30 min-w-[180px] bg-surface-container-highest border border-white/10 rounded-xl shadow-2xl py-1 text-left">
             <button
               onClick={() => { setMenuOpenId(null); openEditModal(p); }}
               className="w-full px-4 py-2 text-xs text-slate-200 hover:bg-white/5 flex items-center gap-2"
             >
               <span className="material-symbols-outlined text-[16px]">edit</span> Editar
             </button>
             <button
               onClick={() => handleToggleActive(p)}
               className="w-full px-4 py-2 text-xs text-amber-400 hover:bg-white/5 flex items-center gap-2"
             >
               <span className="material-symbols-outlined text-[16px]">{(p.active ?? true) ? 'pause' : 'play_arrow'}</span>
               {(p.active ?? true) ? 'Desactivar venta' : 'Reactivar venta'}
             </button>
             <button
               onClick={() => openDeleteModal(p)}
               className="w-full px-4 py-2 text-xs text-error hover:bg-white/5 flex items-center gap-2"
             >
               <span className="material-symbols-outlined text-[16px]">delete</span> Eliminar definitivamente
             </button>
           </div>
         )}
       </div>
     )}
     <button onClick={() => { setSelectedProduct(p); setShowTransferModal(true); }} className="w-8 h-8 rounded-full border border-white/5 flex items-center justify-center text-slate-500 hover:text-primary transition-all"><span className="material-symbols-outlined text-[16px]">swap_horiz</span></button>
   </div>
 </td>
```

- [ ] **Paso 2: Verificar lint**

```bash
npm run lint
```

- [ ] **Paso 3: Commit**

```bash
git add src/components/Inventory.jsx
git commit -m "feat(inventory): replace edit button with admin actions menu (desktop)"
```

---

### Task 5: Reemplazar botón de Editar móvil con menú `⋮`

**Files:**
- Modify: `src/components/Inventory.jsx:728-731` (celda de Acciones de cards móvil)

- [ ] **Paso 1: Reemplazar el bloque de botones de la card móvil**

Reemplazar las líneas 728-731 (donde está el `<button onClick={() => openEditModal(p)}` del móvil):

```jsx
<div className="flex gap-2 shrink-0">
  <button onClick={() => { setSelectedProduct(p); setShowTransferModal(true); }} className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-primary active:bg-primary/20">
    <span className="material-symbols-outlined text-[20px]">move_up</span>
  </button>
  {isAdmin && (
    <div className="relative" ref={menuOpenId === p.id ? menuRef : null}>
      <button
        onClick={() => setMenuOpenId(menuOpenId === p.id ? null : p.id)}
        className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-slate-300 active:bg-white/10"
        aria-label="Más acciones"
      >
        <span className="material-symbols-outlined text-[20px]">more_vert</span>
      </button>
      {menuOpenId === p.id && (
        <div className="absolute right-0 top-12 z-30 min-w-[180px] bg-surface-container-highest border border-white/10 rounded-xl shadow-2xl py-1 text-left">
          <button
            onClick={() => { setMenuOpenId(null); openEditModal(p); }}
            className="w-full px-4 py-2 text-xs text-slate-200 hover:bg-white/5 flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[16px]">edit</span> Editar
          </button>
          <button
            onClick={() => handleToggleActive(p)}
            className="w-full px-4 py-2 text-xs text-amber-400 hover:bg-white/5 flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[16px]">{(p.active ?? true) ? 'pause' : 'play_arrow'}</span>
            {(p.active ?? true) ? 'Desactivar venta' : 'Reactivar venta'}
          </button>
          <button
            onClick={() => openDeleteModal(p)}
            className="w-full px-4 py-2 text-xs text-error hover:bg-white/5 flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[16px]">delete</span> Eliminar definitivamente
          </button>
        </div>
      )}
    </div>
  )}
</div>
```

- [ ] **Paso 2: Verificar lint**

```bash
npm run lint
```

- [ ] **Paso 3: Commit**

```bash
git add src/components/Inventory.jsx
git commit -m "feat(inventory): replace edit button with admin actions menu (mobile)"
```

---

### Task 6: Indicador visual de producto pausado (fila + card)

**Files:**
- Modify: `src/components/Inventory.jsx:693-708` (fila de tabla) y `713-732` (card móvil)

- [ ] **Paso 1: Agregar dim + badge en la fila de tabla**

Modificar la línea 694 (la `<tr>`):

```jsx
<tr key={p.id} className={`hover:bg-white/5 transition-all group ${!(p.active ?? true) ? 'opacity-60' : ''}`}>
```

Insertar justo después del `<td>` con el nombre (línea 696-697), un nuevo `<td>` con badge? No — mejor agregarlo dentro del mismo `<td>` del nombre, después del `<p>` del SKU. Reemplazar la línea 696-697:

```jsx
<td className="px-6 py-4 font-bold text-sm uppercase text-on-surface">{p.name} <p className="text-[10px] text-slate-500 font-mono italic">#{p.sku}</p></td>
```

Con:

```jsx
<td className="px-6 py-4 font-bold text-sm uppercase text-on-surface">
  <div className="flex items-center gap-2">
    <span>{p.name}</span>
    {!(p.active ?? true) && (
      <span className="text-[9px] font-black uppercase bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded">⏸ Pausado</span>
    )}
  </div>
  <p className="text-[10px] text-slate-500 font-mono italic">#{p.sku}</p>
</td>
```

- [ ] **Paso 2: Agregar dim + badge en card móvil**

Modificar la línea 714 (el `<div>` de la card):

```jsx
<div key={p.id} className={`p-4 flex gap-4 items-center ${!(p.active ?? true) ? 'opacity-60' : ''}`}>
```

Modificar el `<h4>` (línea 717) para incluir el badge:

```jsx
<div className="flex-1 min-w-0">
  <div className="flex items-center gap-2">
    <h4 className="text-xs font-bold text-on-surface uppercase truncate">{p.name}</h4>
    {!(p.active ?? true) && (
      <span className="text-[8px] font-black uppercase bg-amber-500/20 text-amber-400 px-1 py-0.5 rounded shrink-0">⏸ Pausado</span>
    )}
  </div>
  <p className="text-[9px] text-slate-500 font-black uppercase mb-1">{p.brand}</p>
```

- [ ] **Paso 3: Verificar lint**

```bash
npm run lint
```

- [ ] **Paso 4: Commit**

```bash
git add src/components/Inventory.jsx
git commit -m "feat(inventory): show paused badge and dim inactive products"
```

---

### Task 7: Toggle "Mostrar pausados" en el header (admin only)

**Files:**
- Modify: `src/components/Inventory.jsx:480` (filtro `filtered`) y header (líneas 662-675)

- [ ] **Paso 1: Reemplazar la línea del filtro `filtered`**

Reemplazar línea 480:

```javascript
const filtered = products.filter(p => (p.name||'').toLowerCase().includes(searchTerm.toLowerCase()) || (p.sku||'').toLowerCase().includes(searchTerm.toLowerCase()))
```

Con:

```javascript
const filtered = products
  .filter(p => (showPaused || (p.active ?? true)))
  .filter(p => (p.name||'').toLowerCase().includes(searchTerm.toLowerCase()) || (p.sku||'').toLowerCase().includes(searchTerm.toLowerCase()))
```

- [ ] **Paso 2: Agregar el toggle en el header**

Insertar dentro del `<header>` (después de la línea 667, antes del `<input>` de búsqueda):

```jsx
{isAdmin && (
  <label className="flex items-center gap-2 text-[10px] text-slate-400 uppercase font-black cursor-pointer">
    <input
      type="checkbox"
      checked={showPaused}
      onChange={e => setShowPaused(e.target.checked)}
      className="accent-primary w-4 h-4"
    />
    Mostrar pausados
  </label>
)}
```

- [ ] **Paso 3: Verificar lint**

```bash
npm run lint
```

- [ ] **Paso 4: Commit**

```bash
git add src/components/Inventory.jsx
git commit -m "feat(inventory): add 'mostrar pausados' filter toggle (admin only)"
```

---

### Task 8: Modal de confirmación de borrado

**Files:**
- Modify: `src/components/Inventory.jsx` (insertar modal nuevo, sugerido justo después del Edit modal, antes del `<header>`)

- [ ] **Paso 1: Insertar el modal de confirmación**

Insertar este bloque justo después del cierre del Edit modal (después de la línea 660, antes del `<header>` de la línea 662):

```jsx
{/* Delete Confirmation Modal */}
{deleteTarget && (
  <div className="fixed inset-0 z-50 bg-black/90 p-4 flex items-center justify-center backdrop-blur-md">
    <div className="bg-surface-container-lowest max-w-sm w-full rounded-2xl p-6 border border-error/30 space-y-4">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 mx-auto rounded-full bg-error/20 flex items-center justify-center">
          <span className="material-symbols-outlined text-error text-[28px]">warning</span>
        </div>
        <h3 className="text-base font-black uppercase text-error tracking-widest">Eliminar {deleteTarget.name}</h3>
        <p className="text-xs text-slate-400">Esta acción es permanente y no se puede deshacer. La llanta y todo su stock se eliminarán de la base de datos.</p>
      </div>
      <div className="space-y-1">
        <label className="text-[10px] text-slate-500 font-black uppercase">Escribe <span className="text-error">ELIMINAR</span> para confirmar</label>
        <input
          type="text"
          value={confirmText}
          onChange={e => setConfirmText(e.target.value)}
          placeholder="ELIMINAR"
          className="w-full input-industrial py-3 text-xs uppercase"
          autoFocus
          disabled={deleting}
        />
      </div>
      <button
        onClick={handleDeleteProduct}
        disabled={confirmText !== 'ELIMINAR' || deleting}
        className="w-full py-4 text-xs font-black uppercase bg-error text-white rounded-xl disabled:opacity-30 disabled:cursor-not-allowed hover:bg-error/90"
      >
        {deleting ? 'Eliminando...' : 'Eliminar para siempre'}
      </button>
      <button
        onClick={closeDeleteModal}
        disabled={deleting}
        className="w-full text-slate-500 text-[10px] font-black uppercase py-2"
      >
        Cancelar
      </button>
    </div>
  </div>
)}
```

- [ ] **Paso 2: Verificar lint**

```bash
npm run lint
```

- [ ] **Paso 3: Commit**

```bash
git add src/components/Inventory.jsx
git commit -m "feat(inventory): add delete confirmation modal with typed confirm"
```

---

### Task 9: Filtrar productos pausados en POS

**Files:**
- Modify: `src/components/POS.jsx` (donde se carga el inventario)

- [ ] **Paso 1: Localizar el fetch de inventario en POS**

```bash
grep -n "fetchData('Inventario'" src/components/POS.jsx
```

- [ ] **Paso 2: Envolver el resultado del fetch para filtrar pausados**

Después de cada `fetchData('Inventario', ...)` o donde se hace `setProducts(data)`, agregar un filtro. Por ejemplo, si el código es:

```javascript
const data = await fetchData('Inventario', activeBranch)
if (Array.isArray(data)) setProducts(data)
```

Cambiar a:

```javascript
const data = await fetchData('Inventario', activeBranch)
const available = Array.isArray(data) ? data.filter(p => p.active ?? true) : []
setProducts(available)
```

(Si hay varias llamadas, aplicar el mismo filtro en todas para mantener consistencia.)

- [ ] **Paso 3: Verificar lint**

```bash
npm run lint
```

- [ ] **Paso 4: Commit**

```bash
git add src/components/POS.jsx
git commit -m "feat(pos): hide paused products from sales catalog"
```

---

### Task 10: Verificación final y build

**Files:** ninguno (solo correr comandos)

- [ ] **Paso 1: Lint completo**

```bash
npm run lint
```
Esperado: 0 warnings, 0 errors.

- [ ] **Paso 2: Build de producción**

```bash
npm run build
```
Esperado: build exitoso, sin errores.

- [ ] **Paso 3: Verificación manual (checklist del spec)**

Levantar dev server:
```bash
npm run dev
```

Probar:
- [ ] Como admin: cada producto muestra `⋮`, click abre menú con 3 opciones
- [ ] Click fuera o Escape cierra el menú
- [ ] **Editar** abre el modal existente con valores correctos
- [ ] **Desactivar venta**: fila se atenúa, aparece badge `⏸ Pausado`, al recargar sigue ahí
- [ ] En POS, el producto pausado NO aparece en el catálogo
- [ ] **Reactivar venta**: el producto vuelve a estar normal y aparece en POS
- [ ] **Eliminar definitivamente**: modal pide escribir `ELIMINAR`, con texto incorrecto el botón está deshabilitado
- [ ] Con `ELIMINAR` escrito, el botón se habilita; click → producto desaparece, alert confirma
- [ ] Toggle `Mostrar pausados` oculta/muestra productos pausados
- [ ] Como no-admin: NO aparece `⋮`, NO aparece el toggle `Mostrar pausados`
- [ ] Producto legacy sin campo `active` se trata como activo

- [ ] **Paso 4: Commit final si hubo ajustes**

```bash
git status
git add -A
git commit -m "chore: final verification adjustments" --allow-empty
```

---

## Notas

- No hay framework de tests en el proyecto. La verificación es por lint + checklist manual (Task 10).
- El campo `active` se lee con `?? true` en todos los puntos, así que los registros legacy sin el campo siguen funcionando.
- Los componentes modificados son solo `Inventory.jsx` y `POS.jsx`. `api.js` no requiere cambios (`deleteData` y `updateData` ya existen).
- Si la build falla por clases Tailwind no definidas (`bg-error`, `text-error`, `bg-surface-container-highest`), revisar `tailwind.config.js` y `src/index.css` para confirmar que esos tokens existen. Si `bg-error` no existe, usar `bg-red-600` como fallback.
