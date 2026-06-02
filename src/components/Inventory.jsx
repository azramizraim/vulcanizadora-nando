import React, { useState, useEffect, useRef } from 'react'
import { fetchData, postData, updateData, deleteData, db, storage } from '../services/api'
import { doc, runTransaction, getDoc, collection } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { Html5Qrcode } from 'html5-qrcode'

function Inventory({ activeBranch, isAdmin }) {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [isTransferring, setIsTransferring] = useState(false)
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState(null)
  
  const [newProduct, setNewProduct] = useState({ name: '', brand: '', price: '', cost: '', qty: '', sku: '', img: '' })
  const [imageFile, setImageFile] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  const [transferData, setTransferData] = useState({ quantity: 1, targetBranch: '' })
  const [showScanner, setShowScanner] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const scannerRef = useRef(null)
  const [showImportModal, setShowImportModal] = useState(false)
  const [importData, setImportData] = useState([])
  const [importing, setImporting] = useState(false)
  const [searchingAll, setSearchingAll] = useState(false)
  const [menuOpenId, setMenuOpenId] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [confirmText, setConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [showPaused, setShowPaused] = useState(true)
  const menuRef = useRef(null)

  const BRANCHES = ['Rojo Gomez', 'Morelos', 'Bacalar']

  // CSV Import functions
  const handleFileImport = (e) => {
    const file = e.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target.result
      const lines = text.split('\n').filter(line => line.trim())
      
      if (lines.length < 2) {
        alert('El archivo CSV está vacío o no tiene datos')
        return
      }

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
      const data = []

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim())
        const row = {}
        headers.forEach((header, index) => {
          row[header] = values[index] || ''
        })
        
        if (row.nombre || row.sku) {
          data.push({
            name: row.nombre || '',
            brand: row.marca || '',
            price: parseFloat(row.precio) || 0,
            cost: parseFloat(row.costo) || 0,
            qty: parseInt(row.cantidad) || 0,
            sku: row.sku || '',
            status: 'pending'
          })
        }
      }

      setImportData(data)
      setShowImportModal(true)
    }
    reader.readAsText(file)
  }

  const handleConfirmImport = async () => {
    setImporting(true)
    let successCount = 0
    let errorCount = 0

    for (const product of importData) {
      try {
        // Check if product exists by SKU
        const existing = products.find(p => p.sku === product.sku)
        
        if (existing) {
          // Update existing
          await updateData('Inventario', existing.id, {
            ...product,
            qty: existing.qty + product.qty
          })
        } else {
          // Create new
          await postData('Inventario', {
            ...product,
            branch: activeBranch,
            createdAt: new Date().toISOString()
          })
        }
        successCount++
      } catch (err) {
        console.error('Error importing:', product, err)
        errorCount++
      }
    }

    setImporting(false)
    setShowImportModal(false)
    alert(`Importación completada: ${successCount} productos, ${errorCount} errores`)
    loadInventory()
  }

  const handleWebSearch = async (index) => {
    const product = importData[index]
    if (!product.sku && !product.name) {
      alert('SKU o nombre requerido para búsqueda')
      return
    }

    const updated = [...importData]
    updated[index] = { ...updated[index], status: 'searching' }
    setImportData(updated)

    const query = product.sku || product.name
    const brands = ['Michelin', 'Bridgestone', 'Goodyear', 'Continental', 'Pirelli', 'Firestone', 'Cooper', 'Yokohama', 'Hankook', 'Dunlop']
    let foundBrand = ''
    brands.forEach(brand => {
      if (query.toLowerCase().includes(brand.toLowerCase())) {
        foundBrand = brand
      }
    })
    
    try {
      const response = await fetch(
        `https://api.upcitemdb.com/prod/trial/lookup?upc=${encodeURIComponent(query)}`
      )
      const data = await response.json()
      
      if (data?.items && data.items.length > 0) {
        const item = data.items[0]
        updated[index] = { 
          ...updated[index], 
          name: product.name || item.title || '',
          brand: product.brand || foundBrand || item.brand || '',
          status: 'complete' 
        }
      } else {
        // Fallback to Wikipedia
        const wikiResponse = await fetch(
          `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*`
        )
        const wikiData = await wikiResponse.json()
        const searchResult = wikiData?.query?.search?.[0]
        
        updated[index] = { 
          ...updated[index], 
          name: product.name || searchResult?.title || '',
          brand: product.brand || foundBrand || '',
          status: 'complete' 
        }
      }
      setImportData(updated)

    } catch (err) {
      console.error('Search error:', err)
      updated[index] = { 
        ...updated[index], 
        brand: product.brand || foundBrand || '',
        status: 'complete' 
      }
      setImportData(updated)
    }
  }

  const handleSearchAll = async () => {
    setSearchingAll(true)
    const brands = ['Michelin', 'Bridgestone', 'Goodyear', 'Continental', 'Pirelli', 'Firestone', 'Cooper', 'Yokohama', 'Hankook', 'Dunlop']
    
    for (let i = 0; i < importData.length; i++) {
      const product = importData[i]
      const existing = products.find(p => p.sku === product.sku)
      if (!existing && (!product.status || product.status === 'pending')) {
        const query = product.sku || product.name
        let foundBrand = ''
        brands.forEach(brand => {
          if (query.toLowerCase().includes(brand.toLowerCase())) {
            foundBrand = brand
          }
        })
        
        const updated = [...importData]
        
        try {
          const response = await fetch(
            `https://api.upcitemdb.com/prod/trial/lookup?upc=${encodeURIComponent(query)}`
          )
          const data = await response.json()
          
          if (data?.items && data.items.length > 0) {
            const item = data.items[0]
            updated[i] = {
              ...updated[i],
              name: product.name || item.title || '',
              brand: product.brand || foundBrand || item.brand || '',
              status: 'complete'
            }
          } else {
            // Fallback to Wikipedia
            const wikiResponse = await fetch(
              `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*`
            )
            const wikiData = await wikiResponse.json()
            const searchResult = wikiData?.query?.search?.[0]
            
            updated[i] = {
              ...updated[i],
              name: product.name || searchResult?.title || '',
              brand: product.brand || foundBrand || '',
              status: 'complete'
            }
          }
        } catch (err) {
          updated[i] = {
            ...updated[i],
            brand: product.brand || foundBrand || '',
            status: 'complete'
          }
        }
        
        setImportData(updated)
      }
    }
    setSearchingAll(false)
  }

  useEffect(() => {
    const handleFocus = () => {
      const productId = localStorage.getItem('focusProduct')
      if (productId) {
        setSearchTerm('')
        setSearchTerm(productId)
        localStorage.removeItem('focusProduct')
      }
    }
    window.addEventListener('focusProduct', handleFocus)
    return () => window.removeEventListener('focusProduct', handleFocus)
  }, [])

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

  useEffect(() => {
    let active = true
    const loadInventory = async () => {
      try {
        setLoading(true)
        const data = await fetchData('Inventario', activeBranch)
        if (active) {
            setProducts(Array.isArray(data) ? data : [])
        }
      } catch (err) {
        console.error(err)
      } finally {
        if (active) setLoading(false)
      }
    }
    loadInventory()
    return () => { active = false }
  }, [activeBranch])

const handleAddProduct = async () => {
    if (!newProduct.name) return alert('La Medida es obligatoria')
    if (!newProduct.price) return alert('El Precio es obligatorio')
    if (!newProduct.qty) return alert('La Cantidad es obligatoria')
    
    setIsSaving(true)
    try {
      const productData = {
        name: newProduct.name,
        brand: newProduct.brand || 'Sin marca',
        price: parseFloat(newProduct.price) || 0,
        cost: parseFloat(newProduct.cost) || 0,
        qty: parseInt(newProduct.qty) || 0,
        sku: newProduct.sku || 'SKU-' + Date.now(),
        img: newProduct.img || 'https://images.unsplash.com/photo-1549441412-10d5b746a48d?q=80&w=200',
        branch: activeBranch,
        updated_at: Date.now()
      }
      
      const res = await postData('Inventario', productData)
      
      if (res.id || res.success) {
        setShowAddModal(false)
        setNewProduct({ name: '', brand: '', price: '', cost: '', qty: '', sku: '', img: '' })
        const data = await fetchData('Inventario', activeBranch)
        if (Array.isArray(data)) setProducts(data)
      }
    } catch (e) { 
      alert('Error al guardar: ' + e.message)
    } finally { 
      setIsSaving(false) 
    }
  }

  const handleEditProduct = async () => {
    if (!editingProduct?.name) return alert('La Medida es obligatoria')
    
    setIsSaving(true)
    try {
      const res = await updateData('Inventario', editingProduct.id, {
        name: editingProduct.name,
        brand: editingProduct.brand,
        price: parseFloat(editingProduct.price) || 0,
        cost: parseFloat(editingProduct.cost) || 0,
        qty: parseInt(editingProduct.qty) || 0,
        sku: editingProduct.sku || '',
        img: editingProduct.img || ''
      })
      
      if (res.success) {
        setIsEditing(false)
        setEditingProduct(null)
        const data = await fetchData('Inventario', activeBranch)
        if (Array.isArray(data)) setProducts(data)
      } else {
        throw new Error('Error en actualización')
      }
    } catch (e) { 
      alert('Error al actualizar: ' + e.message)
    } finally { 
      setIsSaving(false) 
    }
  }

const openEditModal = (product) => {
    setEditingProduct({ ...product })
    setIsEditing(true)
  }

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

  // Scanner functions
  useEffect(() => {
    if (showScanner && !scannerRef.current) {
      setTimeout(() => startScanner(), 300)
    }
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {})
        scannerRef.current = null
      }
    }
  }, [showScanner])

  const startScanner = async () => {
    try {
      scannerRef.current = new Html5Qrcode('scanner-reader')
      await scannerRef.current.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 280, height: 150 } },
        (decodedText) => {
          handleScannedCode(decodedText)
        },
        () => {}
      )
    } catch (err) {
      console.error('Scanner error:', err)
      alert('No se pudo iniciar la cámara')
      setShowScanner(false)
    }
  }

  const handleScannedCode = async (code) => {
    if (scannerRef.current) {
      scannerRef.current.stop().catch(() => {})
      scannerRef.current = null
    }
    setShowScanner(false)
    
    const scannedCode = code.trim()
    const brands = ['Michelin', 'Bridgestone', 'Goodyear', 'Continental', 'Pirelli', 'Firestone', 'Cooper', 'Yokohama', 'Hankook', 'Dunlop']
    let foundBrand = ''
    brands.forEach(brand => {
      if (scannedCode.toLowerCase().includes(brand.toLowerCase())) {
        foundBrand = brand
      }
    })
    
    // Set initial product with scanned code
    const initialProduct = { sku: scannedCode, name: '', brand: foundBrand, price: '', cost: '', qty: '', img: '' }
    setNewProduct(initialProduct)
    
    // Auto-search using UPC Item DB (free API for barcodes)
    try {
      const response = await fetch(
        `https://api.upcitemdb.com/prod/trial/lookup?upc=${encodeURIComponent(scannedCode)}`
      )
      const data = await response.json()
      
      if (data?.items && data.items.length > 0) {
        const item = data.items[0]
        const updated = {
          ...initialProduct,
          name: item.title || '',
          brand: foundBrand || item.brand || ''
        }
        setNewProduct(updated)
      } else {
        // Try Wikipedia as fallback
        const wikiResponse = await fetch(
          `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(scannedCode)}&format=json&origin=*`
        )
        const wikiData = await wikiResponse.json()
        const searchResult = wikiData?.query?.search?.[0]
        
        if (searchResult) {
          setNewProduct({
            ...initialProduct,
            name: searchResult.title
          })
        }
      }
    } catch (err) {
      console.error('Search error:', err)
      // Fallback to Wikipedia
      try {
        const wikiResponse = await fetch(
          `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(scannedCode)}&format=json&origin=*`
        )
        const wikiData = await wikiResponse.json()
        const searchResult = wikiData?.query?.search?.[0]
        
        if (searchResult) {
          setNewProduct({
            ...initialProduct,
            name: searchResult.title
          })
        }
      } catch (e) {
        console.error('Wikipedia also failed:', e)
      }
    }
    
    setTimeout(() => {
      const nameInput = document.querySelector('input[placeholder="Medida / Nombre"]')
      if (nameInput) nameInput.focus()
    }, 300)
  }

  const handleTransfer = async () => {
    if (!transferData.targetBranch || transferData.quantity <= 0) return alert('Datos de traspaso inválidos')
    if (transferData.quantity > selectedProduct.qty) return alert('No hay stock suficiente')
    
    setIsTransferring(true)
    try {
        const targetQuery = await fetchData('Inventario', transferData.targetBranch)
        const existingTargetDoc = Array.isArray(targetQuery) ? targetQuery.find(p => p.sku === selectedProduct.sku) : null
        
        await runTransaction(db, async (transaction) => {
           const originDocRef = doc(db, 'Inventario', selectedProduct.id)
           transaction.update(originDocRef, { qty: selectedProduct.qty - parseInt(transferData.quantity) })
           
           if (existingTargetDoc) {
              const targetDocRef = doc(db, 'Inventario', existingTargetDoc.id)
              transaction.update(targetDocRef, { qty: parseInt(existingTargetDoc.qty) + parseInt(transferData.quantity) })
           } else {
              const newDocRef = doc(collection(db, 'Inventario'))
              transaction.set(newDocRef, { 
                 ...selectedProduct, 
                 id: newDocRef.id, 
                 qty: parseInt(transferData.quantity), 
                 branch: transferData.targetBranch 
              })
           }
        })
        alert('Traspaso exitoso')
        setShowTransferModal(false)
        const data = await fetchData('Inventario', activeBranch)
        if (Array.isArray(data)) setProducts(data)
    } catch (e) { alert('Error en traspaso') } 
    finally { setIsTransferring(false) }
  }

  if (loading) return <div className="p-20 text-center animate-pulse"><div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>Cargando Inventario...</div>

  const filtered = products.filter(p => (p.name||'').toLowerCase().includes(searchTerm.toLowerCase()) || (p.sku||'').toLowerCase().includes(searchTerm.toLowerCase()))

  return (
    <div className="p-4 lg:p-8 space-y-6">
      
{/* Modals are hidden here for brevity but logic remains same */}
      {showAddModal && (
         <div className="fixed inset-0 z-50 bg-black/90 p-4 flex items-center justify-center overflow-y-auto backdrop-blur-md">
            <div className="bg-surface-container-lowest max-w-sm w-full rounded-2xl p-6 border border-white/10 space-y-4">
              <h3 className="text-sm font-black uppercase text-primary tracking-widest border-b border-white/5 pb-2">Registrar Nueva Llanta</h3>
               
               <div className="flex gap-2">
                 <button onClick={() => setShowScanner(true)} className="flex-1 btn-secondary py-3 text-xs font-black uppercase flex items-center justify-center gap-2">
                   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h2M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg>
                   Escanear
                 </button>
<button 
                    onClick={async () => {
                      const query = newProduct.sku || newProduct.name
                      if (!query) return alert('Ingresa SKU o nombre para buscar')
                      
                      const btn = document.getElementById('searchBtn')
                      if (btn) btn.disabled = true
                      
                      const brands = ['Michelin', 'Bridgestone', 'Goodyear', 'Continental', 'Pirelli', 'Firestone', 'Cooper', 'Yokohama', 'Hankook', 'Dunlop']
                      let foundBrand = ''
                      brands.forEach(brand => {
                        if (query.toLowerCase().includes(brand.toLowerCase())) {
                          foundBrand = brand
                        }
                      })
                      
                      // Try UPC Item DB first
                      try {
                        const response = await fetch(
                          `https://api.upcitemdb.com/prod/trial/lookup?upc=${encodeURIComponent(query)}`
                        )
                        const data = await response.json()
                        
                        if (data?.items && data.items.length > 0) {
                          const item = data.items[0]
                          setNewProduct({
                            ...newProduct,
                            name: item.title || newProduct.name,
                            brand: newProduct.brand || foundBrand || item.brand || ''
                          })
                          alert('✅ Producto encontrado: ' + item.title + (item.brand ? ' - ' + item.brand : ''))
                        } else {
                          // Fallback to Wikipedia
                          const wikiResponse = await fetch(
                            `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*`
                          )
                          const wikiData = await wikiResponse.json()
                          const searchResult = wikiData?.query?.search?.[0]
                          
                          if (searchResult) {
                            setNewProduct({
                              ...newProduct,
                              name: searchResult.title,
                              brand: newProduct.brand || foundBrand || ''
                            })
                            alert('✅ Encontrado en Wikipedia: ' + searchResult.title)
                          } else if (foundBrand) {
                            setNewProduct({ ...newProduct, brand: foundBrand })
                            alert('✅ Marca detectada: ' + foundBrand + '. Completa los demás datos.')
                          } else {
                            alert('⚠️ No se encontró. Ingresa los datos manualmente.')
                          }
                        }
                      } catch (err) {
                        console.error('Search error:', err)
                        if (foundBrand) {
                          setNewProduct({ ...newProduct, brand: foundBrand })
                          alert('✅ Marca detectada: ' + foundBrand)
                        } else {
                          alert('⚠️ Sin resultados. Ingresa los datos manualmente.')
                        }
                      } finally {
                        if (btn) btn.disabled = false
                      }
                    }}
                    id="searchBtn"
                    className="flex-1 bg-blue-600 hover:bg-blue-500 py-3 text-xs font-black uppercase flex items-center justify-center gap-2 rounded-xl"
                  >
                    🔍 Buscar
                  </button>
               </div>
               
               <input className="w-full input-industrial py-3 text-xs" placeholder="SKU / Código" value={newProduct.sku} onChange={e => setNewProduct({...newProduct, sku: e.target.value})} />
               <input className="w-full input-industrial py-3 text-xs" placeholder="Medida / Nombre" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} />
               <input className="w-full input-industrial py-3 text-xs" placeholder="Marca" value={newProduct.brand} onChange={e => setNewProduct({...newProduct, brand: e.target.value})} />
               <div className="grid grid-cols-2 gap-2">
                  <input type="number" className="w-full input-industrial py-3 text-xs" placeholder="Stock" value={newProduct.qty} onChange={e => setNewProduct({...newProduct, qty: e.target.value})} />
                  <input type="number" className="w-full input-industrial py-3 text-xs" placeholder="Precio Venta" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: e.target.value})} />
               </div>
               <div className="border-2 border-dashed border-white/10 p-4 rounded-xl text-center bg-white/5">
                   <p className="text-[10px] text-slate-500 uppercase font-black mb-2">Imagen del Producto</p>
                   <input type="file" onChange={e => setImageFile(e.target.files[0])} className="text-[10px] text-slate-400" />
               </div>
               <button onClick={handleAddProduct} disabled={isSaving} className="w-full btn-primary py-4 text-[10px] font-black uppercase">{isSaving ? 'Subiendo...' : 'Guardar Llanta'}</button>
               <button onClick={() => setShowAddModal(false)} className="w-full text-slate-500 text-[10px] font-black uppercase mt-2">Cancelar</button>
            </div>
         </div>
      )}

      {showScanner && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
          <div id="scanner-reader" className="flex-1 w-full" />
          <div className="p-4 bg-zinc-900 space-y-3">
            <p className="text-white text-center text-sm">Apunta al código de barras</p>
            <button onClick={() => setShowScanner(false)} className="w-full py-3 bg-zinc-700 text-white rounded-xl font-medium">Cerrar</button>
          </div>
        </div>
      )}

      {/* Traspaso Modal */}
      {showTransferModal && selectedProduct && (
         <div className="fixed inset-0 z-50 bg-black/90 p-4 flex items-center justify-center backdrop-blur-md">
            <div className="bg-surface-container-lowest max-w-sm w-full rounded-2xl p-6 border border-white/10 space-y-6">
                <div className="text-center">
                   <p className="text-[10px] text-primary font-black uppercase tracking-[3px] mb-1">Mover Mercancía</p>
                   <h3 className="font-headline font-bold text-lg text-on-surface uppercase">{selectedProduct.name}</h3>
                </div>
                <div className="space-y-4">
                   <div className="space-y-1">
                      <label className="text-[10px] text-slate-500 font-black uppercase">Sucursal Destino</label>
                      <select className="w-full input-industrial py-3 text-xs" value={transferData.targetBranch} onChange={e => setTransferData({...transferData, targetBranch: e.target.value})}>
                         <option value="">Selecciona sucursal...</option>
                         {BRANCHES.filter(b => b !== activeBranch).map(b => <option key={b} value={b}>{b}</option>)}
                      </select>
                   </div>
                   <div className="space-y-1">
                      <label className="text-[10px] text-slate-500 font-black uppercase">Cantidad (Máx: {selectedProduct.qty})</label>
                      <input type="number" className="w-full input-industrial py-3 text-lg font-black text-primary text-center" value={transferData.quantity} onChange={e => setTransferData({...transferData, quantity: e.target.value})} min="1" max={selectedProduct.qty} />
                   </div>
                </div>
<button onClick={handleTransfer} disabled={isTransferring} className="w-full btn-primary py-4 text-xs font-black uppercase">{isTransferring ? 'Moviendo...' : 'Confirmar Traspaso'}</button>
                 <button onClick={() => setShowTransferModal(false)} className="w-full text-slate-500 text-[10px] font-black uppercase">Volver</button>
             </div>
          </div>
       )}

      {/* Edit Modal */}
      {isEditing && editingProduct && (
          <div className="fixed inset-0 z-50 bg-black/90 p-4 flex items-center justify-center overflow-y-auto backdrop-blur-md">
             <div className="bg-surface-container-lowest max-w-sm w-full rounded-2xl p-6 border border-white/10 space-y-4">
                <h3 className="text-sm font-black uppercase text-primary tracking-widest border-b border-white/5 pb-2">Editar Producto</h3>
                
                {/* Imagen actual */}
                <div className="flex flex-col items-center">
                  <img src={editingProduct.img || 'https://images.unsplash.com/photo-1549441412-10d5b746a48d?q=80&w=200'} className="w-full aspect-video object-contain bg-background rounded-xl border border-white/10" />
                  <div className="w-full mt-2">
                    <label className="text-[10px] text-slate-500 font-black uppercase block mb-2">Cambiar imagen</label>
                    <input type="file" accept="image/*" onChange={e => {
                      const file = e.target.files[0]
                      if (file) {
                        const reader = new FileReader()
                        reader.onloadend = () => {
                          setEditingProduct({...editingProduct, img: reader.result})
                        }
                        reader.readAsDataURL(file)
                      }
                    }} className="text-xs text-slate-400 w-full" />
                  </div>
                </div>
                
                <input className="w-full input-industrial py-3 text-xs" placeholder="Medida" value={editingProduct.name || ''} onChange={e => setEditingProduct({...editingProduct, name: e.target.value})} />
                <input className="w-full input-industrial py-3 text-xs" placeholder="Marca" value={editingProduct.brand || ''} onChange={e => setEditingProduct({...editingProduct, brand: e.target.value})} />
                <div className="grid grid-cols-2 gap-2">
                   <input type="number" className="w-full input-industrial py-3 text-xs" placeholder="Stock" value={editingProduct.qty || 0} onChange={e => setEditingProduct({...editingProduct, qty: parseInt(e.target.value) || 0})} />
                   <input type="number" className="w-full input-industrial py-3 text-xs" placeholder="Precio" value={editingProduct.price || 0} onChange={e => setEditingProduct({...editingProduct, price: parseFloat(e.target.value) || 0})} />
                </div>
                <input className="w-full input-industrial py-3 text-xs" placeholder="SKU" value={editingProduct.sku || ''} onChange={e => setEditingProduct({...editingProduct, sku: e.target.value})} />
                <input type="number" className="w-full input-industrial py-3 text-xs" placeholder="Costo" value={editingProduct.cost || 0} onChange={e => setEditingProduct({...editingProduct, cost: parseFloat(e.target.value) || 0})} />
                <button onClick={handleEditProduct} disabled={isSaving} className="w-full btn-primary py-4 text-xs font-black uppercase">{isSaving ? 'Guardando...' : 'Actualizar'}</button>
                <div className="flex gap-2">
                  <button onClick={() => setIsEditing(false)} className="flex-1 text-slate-500 text-[10px] font-black uppercase py-3">Cancelar</button>
                </div>
             </div>
          </div>
       )}

      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sticky top-0 bg-background/50 backdrop-blur-md py-4 z-10 border-b border-white/10">
        <div>
          <h2 className="text-2xl lg:text-3xl font-headline font-black text-on-surface uppercase">Inventario</h2>
          <p className="text-slate-400 text-xs">Consulta y Traspasos en <span className="text-primary font-bold">{activeBranch}</span></p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <input className="input-industrial px-4 py-2 text-xs w-full sm:w-64" placeholder="Buscar llanta o SKU..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          <button onClick={() => setShowAddModal(true)} className="btn-primary px-6 py-2 text-xs font-black uppercase flex items-center justify-center gap-2">Nuevo <span className="material-symbols-outlined text-[18px]">add</span></button>
            <label className="btn-primary bg-green-600 hover:bg-green-700 px-6 py-2 text-xs font-black uppercase flex items-center justify-center gap-2 cursor-pointer ml-2">
              📥 Importar CSV
              <input type="file" accept=".csv" onChange={handleFileImport} className="hidden" />
            </label>
        </div>
      </header>

      {/* Grid Responsivo: Lista en móvil, Tabla en Desktop */}
      <div className="surface-workbench rounded-2xl border border-white/5 overflow-hidden">
        <div className="overflow-x-auto">
          {/* Version Escritorio (Table) */}
          <table className="hidden md:table w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-high/50 text-slate-500 text-[10px] uppercase font-black">
                <th className="px-6 py-4">Foto</th>
                <th className="px-6 py-4">Medida / Modelo</th>
                <th className="px-6 py-4">Marca</th>
                <th className="px-6 py-4 text-center">Stock</th>
                <th className="px-6 py-4 text-right">Precio Venta</th>
                <th className="px-6 py-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map(p => (
                <tr key={p.id} className="hover:bg-white/5 transition-all group">
                  <td className="px-6 py-4"><img src={p.img} className="w-12 h-12 object-contain bg-background p-1 rounded-lg border border-white/5" /></td>
                  <td className="px-6 py-4 font-bold text-sm uppercase text-on-surface">{p.name} <p className="text-[10px] text-slate-500 font-mono italic">#{p.sku}</p></td>
                  <td className="px-6 py-4 text-xs text-slate-400 uppercase font-black">{p.brand}</td>
                  <td className="px-6 py-4 text-center"><span className={`px-2 py-1 rounded text-xs font-black ${parseInt(p.qty) < 5 ? 'bg-error/20 text-error animate-pulse' : 'bg-emerald-400/20 text-emerald-400'}`}>{p.qty}</span></td>
                  <td className="px-6 py-4 text-right font-headline font-bold text-primary">${parseFloat(p.price).toFixed(2)}</td>
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
                </tr>
              ))}
            </tbody>
          </table>

          {/* Version Móvil (Cards) */}
          <div className="md:hidden flex flex-col divide-y divide-white/5">
             {filtered.map(p => (
                <div key={p.id} className="p-4 flex gap-4 items-center">
                   <img src={p.img} className="w-16 h-16 object-contain bg-background p-2 rounded-xl border border-white/5 shrink-0" />
                   <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-bold text-on-surface uppercase truncate">{p.name}</h4>
                      <p className="text-[9px] text-slate-500 font-black uppercase mb-1">{p.brand}</p>
<div className="flex justify-between items-center">
                          <span className={`text-[10px] font-black uppercase ${parseInt(p.qty) < 5 ? 'text-error animate-pulse' : 'text-emerald-400'}`}>{p.qty} DISP.</span>
                          <span className="text-sm font-headline font-black text-primary">${parseFloat(p.price).toFixed(0)}</span>
                       </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => { setSelectedProduct(p); setShowTransferModal(true); }} className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-primary active:bg-primary/20">
                        <span className="material-symbols-outlined text-[20px]">move_up</span>
                      </button>
                      {isAdmin && <button onClick={() => openEditModal(p)} className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-amber-400 active:bg-amber-400/20">
                        <span className="material-symbols-outlined text-[20px]">edit</span>
                      </button>}
                    </div>
                 </div>
             ))}
          </div>
          {filtered.length === 0 && <div className="py-20 text-center opacity-20 font-black tracking-widest text-sm italic uppercase">Sin resultados</div>}
        </div>

        {/* Import Modal */}
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
      </div>
    </div>
  )
}

export default Inventory
