# CSV Import Mejorado - Plan de Implementación

> **Para agentes:** Ejecutar tarea por tarea. Cada paso es una acción de 2-5 minutos.

**Meta:** Mejorar sistema de importación CSV del inventario con búsqueda web para productos nuevos y preview mejorado.

**Arquitectura:** Modificar Inventory.jsx para agregar estados a productos en preview, funciones de búsqueda web, y UI mejorada.

**Tech Stack:** React, Html5Qrcode (ya existe), búsqueda web via fetch.

---

### Task 1: Actualizar estructura de importData con status

**Files:**
- Modify: `src/components/Inventory.jsx:25-26`

- [ ] **Paso 1: Agregar estados para tracking de búsqueda**

Reemplazar línea 25-26:
```javascript
const [importData, setImportData] = useState([])
const [importing, setImporting] = useState(false)
```

Con:
```javascript
const [importData, setImportData] = useState([])
const [importing, setImporting] = useState(false)
const [searchingAll, setSearchingAll] = useState(false)
```

- [ ] **Paso 2: Commit**
```bash
git add src/components/Inventory.jsx
git commit -m "feat: add importData status tracking states"
```

---

### Task 2: Agregar función de búsqueda web

**Files:**
- Modify: `src/components/Inventory.jsx:108-109` (agregar después de handleConfirmImport)

- [ ] **Paso 1: Agregar función handleWebSearch después de handleConfirmImport (~línea 108)**

```javascript
const handleWebSearch = async (index) => {
  const product = importData[index]
  if (!product.sku && !product.name) {
    alert('SKU o nombre requerido para búsqueda')
    return
  }

  // Update status to searching
  const updated = [...importData]
  updated[index] = { ...updated[index], status: 'searching' }
  setImportData(updated)

  try {
    // Search query
    const query = product.sku || product.name
    // Use DuckDuckGo HTML search (free, no API key)
    const response = await fetch(
      `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query + ' llanta precio')}`

    )
    const html = await response.text()
    
    // Simple extraction - look for common patterns
    let foundData = { name: product.name, brand: product.brand, price: product.price, cost: product.cost }

    // Try to extract price (looks for $ or currency patterns)
    const priceMatch = html.match(/\$[\d,]+(?:\.\d{2})?/)
    if (priceMatch) {
      const price = parseFloat(priceMatch[0].replace(/[$,]/g,))
      if (price > 0 && price < 50000) {
        foundData.price = price
        foundData.cost = Math.round(price * 0.7) // Estimate cost as 70%
      }
    }

    // Try to extract brand from query if present
    const brands = ['Michelin', 'Bridgestone', 'Goodyear', 'Continental', 'Pirelli', 'Firestone', 'Cooper', ' Yokohama', 'Hankook', 'Dunlop']
    brands.forEach(brand => {
      if (query.toLowerCase().includes(brand.toLowerCase())) {
        foundData.brand = brand
      }
    })

    // Update with found data
    updated[index] = { 
      ...updated[index], 
      ...foundData,
      status: 'complete' 
    }
    setImportData(updated)

  } catch (err) {
    console.error('Search error:', err)
    updated[index] = { ...updated[index], status: 'error' }
    setImportData(updated)
  }
}
```

- [ ] **Paso 2: Agregar función handleSearchAll**

```javascript
const handleSearchAll = async () => {
  setSearchingAll(true)
  const newProducts = importData.filter(p => !products.find(ex => ex.sku === p.sku))
  
  for (let i = 0; i < importData.length; i++) {
    const product = importData[i]
    const existing = products.find(p => p.sku === product.sku)
    if (!existing && !product.status) {
      await handleWebSearch(i)
      // Small delay between searches
      await new Promise(r => setTimeout(r, 500))
    }
  }
  setSearchingAll(false)
}
```

- [ ] **Paso 3: Commit**
```bash
git add src/components/Inventory.jsx
git commit -m "feat: add web search functions for new products"
```

---

### Task 3: Actualizar handleFileImport para agregar status

**Files:**
- Modify: `src/components/Inventory.jsx:31-71` (handleFileImport)

- [ ] **Paso 1: Modificar handleFileImport para agregar status a cada producto**

Reemplazar líneas 55-64:
```javascript
if (row.nombre || row.sku) {
  data.push({
    name: row.nombre || '',
    brand: row.marca || '',
    price: parseFloat(row.precio) || 0,
    cost: parseFloat(row.costo) || 0,
    qty: parseInt(row.cantidad) || 0,
    sku: row.sku || ''
  })
}
```

Con:
```javascript
if (row.nombre || row.sku) {
  data.push({
    name: row.nombre || '',
    brand: row.marca || '',
    price: parseFloat(row.precio) || 0,
    cost: parseFloat(row.costo) || 0,
    qty: parseInt(row.cantidad) || 0,
    sku: row.sku || '',
    status: 'pending' // pending | searching | complete | error
  })
}
```

- [ ] **Paso 2: Commit**
```bash
git add src/components/Inventory.jsx
git commit -m "feat: add status field to import products"
```

---

### Task 4: Actualizar modal de preview con UI mejorada

**Files:**
- Modify: `src/components/Inventory.jsx:480-530` (showImportModal render)

- [ ] **Paso 1: Leer el código actual del modal (~líneas 480-530)**

- [ ] **Paso 2: Reemplazar el modal completo con versión mejorada**

Reemplazar todo el bloque `showImportModal` (líneas ~480-530):

```jsx
{showImportModal && (
  <div className="fixed inset-0 z-50 bg-black/90 p-4 flex items-center justify-center overflow-y-auto backdrop-blur-md">
    <div className="bg-surface-container-lowest max-w-2xl w-full rounded-2xl p-6 border border-white/10 max-h-[90vh] overflow-y-auto">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-black text-primary">📥 Preview Importación CSV</h3>
        <button onClick={() => setShowImportModal(false)} className="text-slate-400 hover:text-white">✕</button>
      </div>

      {/* Stats */}
      <div className="flex gap-4 mb-4">
        <div className="flex-1 bg-emerald-500/20 rounded-xl p-3 text-center">
          <p className="text-xs text-slate-400 uppercase font-black">Existentes</p>
          <p className="text-2xl font-black text-emerald-400">{importData.filter(p => products.find(ex => ex.sku === p.sku)).length}</p>
        </div>
        <div className="flex-1 bg-amber-500/20 rounded-xl p-3 text-center">
          <p className="text-xs text-slate-400 uppercase font-black">Nuevos</p>
          <p className="text-2xl font-black text-amber-400">{importData.filter(p => !products.find(ex => ex.sku === p.sku)).length}</p>
        </div>
      </div>

      {/* Search all button */}
      <button 
        onClick={handleSearchAll}
        disabled={searchingAll}
        className="w-full mb-4 py-2 bg-blue-600 text-white font-bold rounded-lg flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {searchingAll ? '🔍 Buscando...' : '🔍 Buscar Todos los Nuevos'}
      </button>

      {/* Product list */}
      <div className="space-y-3 max-h-[400px] overflow-y-auto">
        {importData.map((row, i) => {
          const isExisting = products.find(p => p.sku === row.sku)
          return (
            <div key={i} className={`p-3 rounded-xl border ${isExisting ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-amber-500/30 bg-amber-500/10'}`}>
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="font-bold text-sm">{row.name || 'Sin nombre'}</p>
                  <p className="text-xs text-slate-400">SKU: {row.sku || 'N/A'}</p>
                </div>
                {isExisting ? (
                  <span className="text-xs bg-emerald-500/30 text-emerald-400 px-2 py-1 rounded">Existente</span>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded ${
                      row.status === 'complete' ? 'bg-green-500/30 text-green-400' :
                      row.status === 'searching' ? 'bg-blue-500/30 text-blue-400' :
                      row.status === 'error' ? 'bg-red-500/30 text-red-400' :
                      'bg-slate-500/30 text-slate-400'
                    }`}>
                      {row.status === 'searching' ? 'Buscando...' : 
                       row.status === 'complete' ? 'Encontrado' :
                       row.status === 'error' ? 'Error' : 'Pendiente'}
                    </span>
                    <button
                      onClick={() => handleWebSearch(i)}
                      disabled={row.status === 'searching'}
                      className="text-xs bg-blue-600 hover:bg-blue-500 px-2 py-1 rounded text-white disabled:opacity-50"
                    >
                      🔍
                    </button>
                  </div>
                )}
              </div>

              {/* Editable fields for new products */}
              {!isExisting && (
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <input 
                    type="text" 
                    placeholder="Nombre"
                    value={row.name}
                    onChange={(e) => {
                      const updated = [...importData]
                      updated[i].name = e.target.value
                      setImportData(updated)
                    }}
                    className="input-industrial text-xs py-2"
                  />
                  <input 
                    type="text" 
                    placeholder="Marca"
                    value={row.brand}
                    onChange={(e) => {
                      const updated = [...importData]
                      updated[i].brand = e.target.value
                      setImportData(updated)
                    }}
                    className="input-industrial text-xs py-2"
                  />
                  <input 
                    type="number" 
                    placeholder="Precio"
                    value={row.price}
                    onChange={(e) => {
                      const updated = [...importData]
                      updated[i].price = parseFloat(e.target.value) || 0
                      setImportData(updated)
                    }}
                    className="input-industrial text-xs py-2"
                  />
                  <input 
                    type="number" 
                    placeholder="Costo"
                    value={row.cost}
                    onChange={(e) => {
                      const updated = [...importData]
                      updated[i].cost = parseFloat(e.target.value) || 0
                      setImportData(updated)
                    }}
                    className="input-industrial text-xs py-2"
                  />
                  <input 
                    type="number" 
                    placeholder="Cantidad"
                    value={row.qty}
                    onChange={(e) => {
                      const updated = [...importData]
                      updated[i].qty = parseInt(e.target.value) || 0
                      setImportData(updated)
                    }}
                    className="input-industrial text-xs py-2 col-span-2"
                  />
                </div>
              )}

              {/* Show update info for existing */}
              {isExisting && (
                <div className="mt-2 text-xs text-slate-400">
                  Stock actual: {products.find(p => p.sku === row.sku)?.qty || 0} → +{row.qty} = {products.find(p => p.sku === row.sku)?.qty + row.qty}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Actions */}
      <div className="flex gap-2 mt-4">
        <button onClick={handleConfirmImport} disabled={importing} className="flex-1 py-3 rounded-xl bg-green-600 text-white font-bold disabled:opacity-50">
          {importing ? 'Importando...' : `✅ Importar ${importData.length} productos`}
        </button>
        <button onClick={() => setShowImportModal(false)} className="px-4 py-3 rounded-xl bg-slate-700 text-slate-300 font-bold">
          Cancelar
        </button>
      </div>
    </div>
  </div>
)}
```

- [ ] **Paso 3: Commit**
```bash
git add src/components/Inventory.jsx
git commit -m "feat: add improved CSV import preview modal with search"
```

---

### Task 5: Build y test

**Files:**
- Verify: `npm run build`

- [ ] **Paso 1: Build del proyecto**

```bash
npm run build
```

- [ ] **Paso 2: Deploy a Firebase**

```bash
firebase deploy
```

- [ ] **Paso 3: Commit final**
```bash
git add .
git commit -m "feat: complete CSV import with web search - ready for testing"
```

---

## Verificación de Spec vs Plan

- ✅ Preview muestra existentes vs nuevos separados
- ✅ Botón "🔍 Buscar" por producto
- ✅ Botón "🔍 Buscar Todos"
- ✅ Campos editables
- ✅ Estados visuales (pendiente/buscando/completo/error)
- ✅ Scanner de cámara ya existe (no tocar)
- ✅ Lógica de importación (existente suma, nuevo crea)

**Plan completo.** ¿Ejecuto tarea por tarea o todo seguido?