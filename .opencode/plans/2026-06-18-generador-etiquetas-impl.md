# Generador de Etiquetas — Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Agregar botón y modal en Stock para seleccionar productos sin SKU, generar SKU auto-incremental (RIN-00001, LLA-00001, PROD-00001), e imprimir etiquetas con código de barras decorativo + logo.

**Archivo a modificar:** `src/components/Inventory.jsx`

---

### Task 1: State + Botón + Modal

**Files:**
- Modify: `src/components/Inventory.jsx`

**Steps:**

- [ ] **1.1: Agregar estados del modal de etiquetas**

Después de `const [includePausedReport, setIncludePausedReport] = useState(false)` agregar:

```js
const [showLabelsModal, setShowLabelsModal] = useState(false)
const [labelSearch, setLabelSearch] = useState('')
const [labelSelections, setLabelSelections] = useState({})
const [labelQuantity, setLabelQuantity] = useState(1)
```

- [ ] **1.2: Agregar botón "Etiquetas" en el header**

Buscar el botón de Reporte y agregar después:

```jsx
<button onClick={() => setShowLabelsModal(true)} className="btn-primary bg-violet-600 hover:bg-violet-700 px-6 py-2 text-xs font-black uppercase flex items-center justify-center gap-2">
  🏷️ Etiquetas
</button>
```

- [ ] **1.3: Agregar el modal de etiquetas**

Antes del header (junto a los otros modales), agregar:

```jsx
{showLabelsModal && (
  <div className="fixed inset-0 z-50 bg-black/90 p-4 flex items-center justify-center overflow-y-auto backdrop-blur-md">
    <div className="bg-surface-container-lowest max-w-sm w-full rounded-2xl p-6 border border-white/10 space-y-4">
      <div className="flex items-center gap-3 border-b border-white/5 pb-3">
        <div className="w-10 h-10 rounded-xl bg-violet-600/20 flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-violet-400 text-xl">confirmation_number</span>
        </div>
        <div>
          <h3 className="text-xs font-black uppercase text-primary tracking-widest">Generar Etiquetas</h3>
          <p className="text-[9px] text-slate-500">Productos sin código de barras</p>
        </div>
      </div>

      <input className="w-full input-industrial py-3 text-xs" placeholder="Buscar producto..." value={labelSearch} onChange={e => setLabelSearch(e.target.value)} />

      <div className="max-h-48 overflow-y-auto space-y-1 border border-white/5 rounded-xl p-1">
        {(labelSearch
          ? products.filter(p => !p.sku || p.sku.startsWith('SKU-') || (p.name||'').toLowerCase().includes(labelSearch.toLowerCase()))
          : products.filter(p => !p.sku || p.sku.startsWith('SKU-'))
        ).length === 0 ? (
          <div className="py-8 text-center">
            <span className="material-symbols-outlined text-3xl text-slate-700 block mb-2">check_circle</span>
            <p className="text-[10px] text-slate-500 font-black uppercase">Todos tienen SKU</p>
          </div>
        ) : (
          (labelSearch
            ? products.filter(p => !p.sku || p.sku.startsWith('SKU-') || (p.name||'').toLowerCase().includes(labelSearch.toLowerCase()))
            : products.filter(p => !p.sku || p.sku.startsWith('SKU-'))
          ).map(p => (
            <label key={p.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 cursor-pointer transition-all">
              <input
                type="checkbox"
                checked={!!labelSelections[p.id]}
                onChange={() => setLabelSelections(prev => ({ ...prev, [p.id]: !prev[p.id] }))}
                className="accent-violet-500 w-4 h-4"
              />
              <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0 overflow-hidden">
                {p.img ? (
                  <img src={p.img} className="w-full h-full object-contain" />
                ) : (
                  <span className="material-symbols-outlined text-sm text-slate-600">inventory_2</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-on-surface truncate">{p.name}</p>
                <p className="text-[9px] text-slate-500 truncate">{p.brand || 'Sin marca'} • Stock: {p.qty}</p>
              </div>
              <span className="text-[9px] font-mono text-slate-600">{p.sku || '—'}</span>
            </label>
          ))
        )}
      </div>

      {Object.keys(labelSelections).filter(k => labelSelections[k]).length > 0 && (
        <div className="flex items-center justify-between bg-violet-500/10 rounded-xl p-3 border border-violet-500/20">
          <span className="text-[10px] text-violet-300 font-black uppercase">
            {Object.keys(labelSelections).filter(k => labelSelections[k]).length} producto(s) seleccionado(s)
          </span>
          <div className="flex items-center gap-2">
            <label className="text-[9px] text-slate-500 font-black uppercase">Qty:</label>
            <input type="number" min="1" max="99" value={labelQuantity} onChange={e => setLabelQuantity(Math.max(1, parseInt(e.target.value) || 1))} className="w-14 input-industrial py-1.5 text-xs text-center" />
          </div>
        </div>
      )}

      <button
        onClick={handleGenerateLabels}
        disabled={Object.keys(labelSelections).filter(k => labelSelections[k]).length === 0}
        className="w-full btn-primary bg-violet-600 hover:bg-violet-700 py-4 text-xs font-black uppercase disabled:opacity-30 disabled:cursor-not-allowed"
      >
        Generar e Imprimir
      </button>
      <button onClick={() => { setShowLabelsModal(false); setLabelSelections({}); setLabelSearch(''); }} className="w-full text-slate-500 text-[10px] font-black uppercase">
        Cancelar
      </button>
    </div>
  </div>
)}
```

---

### Task 2: Función `handleGenerateLabels`

**Files:**
- Modify: `src/components/Inventory.jsx`

- [ ] **2.1: Agregar función para obtener el último SKU secuencial**

Antes del `if (loading) return`, agregar las funciones de ayuda:

```js
const getLastSkuNumber = async (prefix) => {
  try {
    const allData = await fetchData('Inventario', activeBranch)
    const existing = allData
      .filter(p => p.sku && p.sku.startsWith(prefix))
      .map(p => parseInt(p.sku.replace(prefix, ''), 10))
      .filter(n => !isNaN(n))
    return existing.length > 0 ? Math.max(...existing) : 0
  } catch {
    return 0
  }
}

const generateSku = (product, lastNumber) => {
  const prefix = product.warehouse === 'rines' ? 'RIN-' : product.warehouse === 'llantas' ? 'LLA-' : 'PROD-'
  return `${prefix}${String(lastNumber + 1).padStart(5, '0')}`
}
```

- [ ] **2.2: Agregar `handleGenerateLabels`**

Pegar después de `generatePDF`:

```js
const handleGenerateLabels = async () => {
  const selected = products.filter(p => labelSelections[p.id])
  if (selected.length === 0) return

  setShowLabelsModal(false)

  const prefijos = [...new Set(selected.map(p => p.warehouse === 'rines' ? 'RIN-' : p.warehouse === 'llantas' ? 'LLA-' : 'PROD-'))]
  const lastNumbers = {}
  for (const prefix of prefijos) {
    lastNumbers[prefix] = await getLastSkuNumber(prefix)
  }

  const printWindow = window.open('', '_blank')
  let allLabelsHtml = ''

  for (const p of selected) {
    let sku = p.sku
    if (!sku || sku.startsWith('SKU-')) {
      const prefix = p.warehouse === 'rines' ? 'RIN-' : p.warehouse === 'llantas' ? 'LLA-' : 'PROD-'
      lastNumbers[prefix]++
      sku = `${prefix}${String(lastNumbers[prefix]).padStart(5, '0')}`
      await updateData('Inventario', p.id, { sku })
    }

    const barcodeSvg = generateBarcodeSvg(sku)

    for (let i = 0; i < labelQuantity; i++) {
      allLabelsHtml += `
        <div class="label">
          <div class="label-top">VULC. NANDO</div>
          <div class="label-name">${(p.name || '').toUpperCase()}</div>
          ${barcodeSvg}
          <div class="label-sku">${sku}</div>
          <div class="label-price">$${parseFloat(p.price || 0).toLocaleString('es-MX', { minimumFractionDigits: 0 })}</div>
        </div>`
    }
  }

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Etiquetas</title>
  <style>
    @page { margin: 8mm; size: letter; }
    @media print { body { margin: 0; padding: 0; } }
    body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 8px; display: flex; flex-wrap: wrap; gap: 4px; justify-content: flex-start; align-items: flex-start; }
    .label { width: 216px; height: 100px; border: 1px solid #ddd; border-radius: 6px; padding: 8px; text-align: center; box-sizing: border-box; page-break-inside: avoid; display: flex; flex-direction: column; justify-content: center; align-items: center; }
    .label-top { font-size: 8px; font-weight: 900; color: #F03E1A; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 2px; }
    .label-name { font-size: 10px; font-weight: 800; text-transform: uppercase; color: #1e293b; line-height: 1.2; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }
    .label svg { height: 22px; width: auto; margin: 2px 0; }
    .label-sku { font-size: 7px; font-family: 'Courier New', monospace; font-weight: 700; color: #475569; letter-spacing: 1px; margin-bottom: 2px; }
    .label-price { font-size: 13px; font-weight: 900; color: #F03E1A; }
  </style>
</head>
<body>
  ${allLabelsHtml}
  <script>window.onload = function() { window.print(); window.close(); }</script>
</body>
</html>`

  printWindow.document.write(html)
  printWindow.document.close()
}
```

- [ ] **2.3: Agregar `generateBarcodeSvg`**

Después de `handleGenerateLabels` agregar:

```js
const generateBarcodeSvg = (text) => {
  const chars = text.split('')
  const bars = chars.map((c, i) => {
    const w = (c.charCodeAt(0) % 3) + 1
    const x = 10 + i * 10
    return `<rect x="${x}" y="2" width="${w}" height="16" fill="#1e293b"/>`
  }).join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${10 + chars.length * 10 + 10} 20" style="width:auto;height:22px;display:block;margin:0 auto;">
    <rect fill="white" width="${10 + chars.length * 10 + 10}" height="20"/>
    <g>${bars}</g>
  </svg>`
}
```

---

### Build y Deploy

- [ ] **Build**: `npm run build`
- [ ] **Deploy**: `firebase deploy --only hosting`
