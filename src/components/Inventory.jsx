import React, { useState, useEffect, useRef } from 'react'
import { fetchData, postData, updateData, deleteData, db, storage, uploadImage } from '../services/api'
import { Html5Qrcode } from 'html5-qrcode'
import JsBarcode from 'jsbarcode'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

function Inventory({ activeBranch, isAdmin }) {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [isTransferring, setIsTransferring] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState(null)
  
  const [newProduct, setNewProduct] = useState({ name: '', brand: '', price: '', cost: '', qty: '', sku: '', img: '', ubicacion: '', condicion: 'nueva' })
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [editImageFile, setEditImageFile] = useState(null)
  const [editImagePreview, setEditImagePreview] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  const [transferData, setTransferData] = useState({ quantity: 1, targetBranch: '' })
  const [showScanner, setShowScanner] = useState(false)
  const [showSearchScanner, setShowSearchScanner] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const scannerRef = useRef(null)
  const searchScannerRef = useRef(null)
  const [showImportModal, setShowImportModal] = useState(false)
  const [importData, setImportData] = useState([])
  const [importing, setImporting] = useState(false)
  const [searchingAll, setSearchingAll] = useState(false)
  const [menuOpenId, setMenuOpenId] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [confirmText, setConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [showPaused, setShowPaused] = useState(true)
  const [showReportModal, setShowReportModal] = useState(false)
  const [reportScope, setReportScope] = useState('all')
  const [includePausedReport, setIncludePausedReport] = useState(false)
  const [reportCondition, setReportCondition] = useState('todas')
  const [showLabelsModal, setShowLabelsModal] = useState(false)
  const [labelSearch, setLabelSearch] = useState('')
  const [labelSelections, setLabelSelections] = useState({})
  const [labelQuantity, setLabelQuantity] = useState(1)
  const [showLabelPrompt, setShowLabelPrompt] = useState(false)
  const [labelPromptProduct, setLabelPromptProduct] = useState(null)
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
      if (e.target.closest('[data-menu]')) return
      setMenuOpenId(null)
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
      let imageUrl = newProduct.img
      if (imageFile) {
        const upload = await uploadImage(imageFile)
        if (!upload.success) {
          alert('Error al subir la imagen: ' + (upload.error || 'desconocido'))
          setIsSaving(false)
          return
        }
        imageUrl = upload.url
      }

      let sku = newProduct.sku
      if (!sku || sku.startsWith('SKU-')) {
        const prefix = /rin|rim/i.test(newProduct.name) ? 'RIN-' : 'PROD-'
        const lastNum = await getLastSkuNumber(prefix)
        sku = `${prefix}${String(lastNum + 1).padStart(5, '0')}`
      }

      const productData = {
        name: newProduct.name,
        brand: newProduct.brand || 'Sin marca',
        price: parseFloat(newProduct.price) || 0,
        cost: parseFloat(newProduct.cost) || 0,
        qty: parseInt(newProduct.qty) || 0,
        sku,
        ubicacion: newProduct.ubicacion || '',
        condicion: newProduct.condicion || 'nueva',
        img: imageUrl || '',
        branch: activeBranch
      }

      const res = await postData('Inventario', productData)

      if (res.id || res.success) {
        setShowAddModal(false)
        setNewProduct({ name: '', brand: '', price: '', cost: '', qty: '', sku: '', img: '', ubicacion: '', condicion: 'nueva' })
        setImageFile(null)
        setImagePreview(null)
        const data = await fetchData('Inventario', activeBranch)
        if (Array.isArray(data)) setProducts(data)
        const newId = res.id || res.data?.id
        if (newId) {
          const created = products.find(p => p.id === newId) || { ...productData, id: newId }
          setShowLabelPrompt(true)
          setLabelPromptProduct(created)
        }
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
      let imageUrl = editingProduct.img
      if (editImageFile) {
        const upload = await uploadImage(editImageFile)
        if (!upload.success) {
          alert('Error al subir la imagen: ' + (upload.error || 'desconocido'))
          setIsSaving(false)
          return
        }
        imageUrl = upload.url
      }

      const res = await updateData('Inventario', editingProduct.id, {
        name: editingProduct.name,
        brand: editingProduct.brand,
        price: parseFloat(editingProduct.price) || 0,
        cost: parseFloat(editingProduct.cost) || 0,
        qty: parseInt(editingProduct.qty) || 0,
        sku: editingProduct.sku || '',
        ubicacion: editingProduct.ubicacion || '',
        condicion: editingProduct.condicion || 'nueva',
        img: imageUrl || ''
      })

      if (res.success) {
        setIsEditing(false)
        setEditingProduct(null)
        setEditImageFile(null)
        setEditImagePreview(null)
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
    setEditImageFile(null)
    setEditImagePreview(null)
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

  // Search scanner functions
  useEffect(() => {
    if (showSearchScanner && !searchScannerRef.current) {
      setTimeout(() => startSearchScanner(), 300)
    }
    return () => {
      if (searchScannerRef.current) {
        searchScannerRef.current.stop().catch(() => {})
        searchScannerRef.current = null
      }
    }
  }, [showSearchScanner])

  const startSearchScanner = async () => {
    try {
      searchScannerRef.current = new Html5Qrcode('search-scanner-reader')
      await searchScannerRef.current.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 280, height: 150 } },
        (decodedText) => {
          handleSearchScannedCode(decodedText)
        },
        () => {}
      )
    } catch (err) {
      console.error('Search scanner error:', err)
      alert('No se pudo iniciar la cámara')
      setShowSearchScanner(false)
    }
  }

  const handleSearchScannedCode = (code) => {
    if (searchScannerRef.current) {
      searchScannerRef.current.stop().catch(() => {})
      searchScannerRef.current = null
    }
    setShowSearchScanner(false)
    setSearchTerm(code.trim())
  }

  const handleTransfer = async () => {
    if (!transferData.targetBranch || transferData.quantity <= 0) return alert('Datos de traspaso inválidos')
    if (transferData.quantity > selectedProduct.qty) return alert('No hay stock suficiente')
    
    setIsTransferring(true)
    try {
        const targetQuery = await fetchData('Inventario', transferData.targetBranch)
        const existingTargetDoc = Array.isArray(targetQuery) ? targetQuery.find(p => p.sku === selectedProduct.sku) : null
        
        // Subtract from origin
        const originUpdate = await updateData('Inventario', selectedProduct.id, { qty: selectedProduct.qty - parseInt(transferData.quantity) })
        if (!originUpdate.success) throw new Error('Error al restar stock')
        
        // Add to target
        if (existingTargetDoc) {
          const targetUpdate = await updateData('Inventario', existingTargetDoc.id, { qty: parseInt(existingTargetDoc.qty) + parseInt(transferData.quantity) })
          if (!targetUpdate.success) throw new Error('Error al agregar stock')
        } else {
          const { id: newId, ...productData } = selectedProduct
          const newProduct = await postData('Inventario', {
            ...productData,
            qty: parseInt(transferData.quantity),
            branch: transferData.targetBranch
          })
          if (!newProduct.success) throw new Error('Error al crear producto destino')
        }
        alert('Traspaso exitoso')
        setShowTransferModal(false)
        const data = await fetchData('Inventario', activeBranch)
        if (Array.isArray(data)) setProducts(data)
    } catch (e) { alert('Error en traspaso') } 
    finally { setIsTransferring(false) }
  }

  const generatePDF = async () => {
    const data = reportScope === 'filtered' ? filtered : products
    let reportData = includePausedReport ? data : data.filter(p => p.active ?? true)
    if (reportCondition !== 'todas') reportData = reportData.filter(p => (p.condicion || 'nueva') === reportCondition)
    if (reportData.length === 0) return alert('No hay productos para exportar')

    setShowReportModal(false)

    const imgResponse = await fetch('/images/logo_nando.jpg')
    const imgBlob = await imgResponse.blob()
    const logoBase64 = await new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result)
      reader.readAsDataURL(imgBlob)
    })

    const doc = new jsPDF('landscape', 'mm', 'letter')
    const pageWidth = doc.internal.pageSize.getWidth()
    const primary = [240, 62, 26]
    const gray = [100, 116, 139]

    doc.setFillColor(...primary)
    doc.rect(0, 0, pageWidth, 35, 'F')

    try {
      doc.addImage(logoBase64, 'JPEG', 12, 5, 25, 25)
    } catch (e) {}

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(18)
    doc.setTextColor(255, 255, 255)
    doc.text('VULCANIZADORA NANDO', 42, 15)

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text('Reporte de Existencias', 42, 22)

    doc.setFontSize(8)
    doc.text(`Sucursal: ${activeBranch}  |  Fecha: ${new Date().toLocaleDateString('es-MX')}`, 42, 28)

    const tableColumn = ['#', 'Medida / Modelo', 'Marca', 'SKU', 'Stock', 'Precio', 'Costo', 'Almacén']
    const tableRows = reportData.map((p, i) => [
      i + 1,
      p.name || '—',
      p.brand || '—',
      p.sku || '—',
      { content: String(p.qty || 0), styles: { textColor: parseInt(p.qty) < 5 ? [220, 38, 38] : [52, 211, 153] } },
      `$${parseFloat(p.price || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`,
      `$${parseFloat(p.cost || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`,
      p.warehouse === 'rines' ? 'Rines' : p.warehouse === 'llantas' ? 'Llantas' : 'General'
    ])

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 42,
      styles: {
        font: 'helvetica',
        fontSize: 8,
        cellPadding: 3,
        lineColor: [226, 232, 240],
        lineWidth: 0.5
      },
      headStyles: {
        fillColor: primary,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        4: { halign: 'center' },
        5: { halign: 'right' },
        6: { halign: 'right' }
      },
      didDrawPage: (data) => {
        doc.setFontSize(7)
        doc.setTextColor(...gray)
        doc.text(
          `Generado el ${new Date().toLocaleString('es-MX')} — Vulcanizadora Nando`,
          data.settings.margin.left,
          doc.internal.pageSize.getHeight() - 8
        )
      }
    })

    const finalY = doc.lastAutoTable.finalY + 10
    doc.setFillColor(248, 250, 252)
    doc.rect(12, finalY, pageWidth - 24, 18, 'F')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(...gray)
    doc.text(`Total Productos: ${reportData.length}`, 16, finalY + 7)
    doc.text(`Stock Total: ${reportData.reduce((sum, p) => sum + (parseInt(p.qty) || 0), 0)}`, 16, finalY + 14)
    doc.setFont('helvetica', 'normal')

    doc.save(`Inventario_${activeBranch.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`)
  }

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
            <div class="label-left">
              <img src="${window.location.origin}/images/logo_nando.jpg" alt="Nando" class="label-logo" />
            </div>
            <div class="label-center">
              <div class="label-name">${(p.name || '').toUpperCase()}</div>
              ${barcodeSvg}
              <div class="label-sku">${sku}</div>
            </div>
            <div class="label-right">
              <div class="label-price">$${parseFloat(p.price || 0).toLocaleString('es-MX', { minimumFractionDigits: 0 })}</div>
            </div>
          </div>`
      }
    }

    const html = `<!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
    <title>Etiquetas</title>
    <style>
      @page { size: 3.5in 1.1in; margin: 0; }
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: Arial, sans-serif; padding: 0; margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .label { width: 3.5in; height: 1.1in; display: flex; flex-direction: row; align-items: stretch; padding: 0 1.5mm; }
      .label-left { display: flex; flex-direction: column; align-items: center; justify-content: center; width: 0.7in; flex-shrink: 0; }
      .label-logo { height: 38px; }
      .label-center { flex: 1; display: flex; flex-direction: column; justify-content: space-evenly; padding: 0 4px; min-width: 0; }
      .label-name { font-size: 13px; font-weight: 800; text-transform: uppercase; color: #1e293b; line-height: 1.1; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .label-center svg, .label-center img { height: 22px; width: auto; display: block; margin: 0 !important; }
      .label-sku { font-size: 18px; font-weight: 900; font-family: 'Courier New', monospace; color: #1e293b; letter-spacing: 0.5px; white-space: nowrap; }
      .label-right { display: flex; flex-direction: column; align-items: center; justify-content: center; width: 0.7in; flex-shrink: 0; }
      .label-price { font-size: 16px; font-weight: 900; color: #F03E1A; }
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

  const generateBarcodeSvg = (text) => {
    const canvas = document.createElement('canvas')
    JsBarcode(canvas, text, { format: 'CODE128', width: 1.5, height: 30, displayValue: false, margin: 5 })
    const url = canvas.toDataURL('image/png')
    return `<img src="${url}" alt="barcode" style="display:block;height:22px;width:auto" />`
  }

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

  const handlePrintSingleLabel = (product) => {
    setShowLabelPrompt(false)
    const barcodeSvg = generateBarcodeSvg(product.sku || 'PROD-00000')
    const printWindow = window.open('', '_blank')
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Etiqueta</title>
  <style>
    @page { size: 3.5in 1.1in; margin: 0; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; padding: 0; margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .label { width: 3.5in; height: 1.1in; display: flex; flex-direction: row; align-items: stretch; padding: 0 1.5mm; }
    .label-left { display: flex; flex-direction: column; align-items: center; justify-content: center; width: 0.7in; flex-shrink: 0; }
    .label-logo { height: 38px; }
    .label-center { flex: 1; display: flex; flex-direction: column; justify-content: space-evenly; padding: 0 4px; min-width: 0; }
    .label-name { font-size: 13px; font-weight: 800; text-transform: uppercase; color: #1e293b; line-height: 1.1; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .label-center svg, .label-center img { height: 22px; width: auto; display: block; margin: 0 !important; }
    .label-sku { font-size: 18px; font-weight: 900; font-family: 'Courier New', monospace; color: #1e293b; letter-spacing: 0.5px; white-space: nowrap; }
    .label-right { display: flex; flex-direction: column; align-items: center; justify-content: center; width: 0.7in; flex-shrink: 0; }
    .label-price { font-size: 16px; font-weight: 900; color: #F03E1A; }
  </style>
</head>
<body>
  <div class="label">
    <div class="label-left">
      <img src="${window.location.origin}/images/logo_nando.jpg" alt="Nando" class="label-logo" />
    </div>
    <div class="label-center">
      <div class="label-name">${(product.name || '').toUpperCase()}</div>
      ${barcodeSvg}
      <div class="label-sku">${product.sku || ''}</div>
    </div>
    <div class="label-right">
      <div class="label-price">$${parseFloat(product.price || 0).toLocaleString('es-MX', { minimumFractionDigits: 0 })}</div>
    </div>
  </div>
  <script>window.onload = function() { window.print(); window.close(); }</script>
</body>
</html>`
    printWindow.document.write(html)
    printWindow.document.close()
  }

  if (loading) return <div className="p-20 text-center animate-pulse"><div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>Cargando Inventario...</div>

  const filtered = products
    .filter(p => (showPaused || (p.active ?? true)))
    .filter(p => (p.name||'').toLowerCase().includes(searchTerm.toLowerCase()) || (p.sku||'').toLowerCase().includes(searchTerm.toLowerCase()))

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
                <div className="flex gap-2">
                  <button type="button" onClick={() => setNewProduct({...newProduct, condicion: 'nueva'})} className={`flex-1 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${newProduct.condicion === 'nueva' ? 'bg-emerald-500 text-black shadow-md' : 'bg-white/5 text-slate-500 hover:text-slate-300'}`}>Nueva</button>
                  <button type="button" onClick={() => setNewProduct({...newProduct, condicion: 'medio_uso'})} className={`flex-1 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${newProduct.condicion === 'medio_uso' ? 'bg-amber-500 text-black shadow-md' : 'bg-white/5 text-slate-500 hover:text-slate-300'}`}>Medio Uso</button>
                </div>
                <input className="w-full input-industrial py-3 text-xs" placeholder="Ubicación (pasillo, rack, etc.)" value={newProduct.ubicacion} onChange={e => setNewProduct({...newProduct, ubicacion: e.target.value})} />
                <div className="grid grid-cols-2 gap-2">
                  <input type="number" className="w-full input-industrial py-3 text-xs" placeholder="Stock" value={newProduct.qty} onChange={e => setNewProduct({...newProduct, qty: e.target.value})} />
                  <input type="number" className="w-full input-industrial py-3 text-xs" placeholder="Precio Venta" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: e.target.value})} />
               </div>
                <div className="border-2 border-dashed border-white/10 p-4 rounded-xl text-center bg-white/5">
                   <p className="text-[10px] text-slate-500 uppercase font-black mb-2">Imagen del Producto</p>
                   {imagePreview ? (
                     <div className="relative">
                       <img src={imagePreview} className="w-full aspect-video object-contain bg-background rounded-lg border border-white/10 mx-auto" />
                       <button type="button" onClick={() => { setImageFile(null); setImagePreview(null); }} className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/70 text-white text-xs flex items-center justify-center">✕</button>
                     </div>
                    ) : (
                      <div className="flex gap-2">
                        <label className="flex-1 cursor-pointer flex flex-col items-center gap-1 py-3 rounded-xl bg-primary/10 border border-primary/30 hover:bg-primary/20 transition-all">
                          <span className="material-symbols-outlined text-primary text-lg">photo_camera</span>
                          <span className="text-[9px] text-primary font-bold uppercase">Tomar Foto</span>
                          <input type="file" accept="image/*" capture="environment" onChange={e => {
                            const file = e.target.files[0]
                            if (file) { setImageFile(file); const r = new FileReader(); r.onloadend = () => setImagePreview(r.result); r.readAsDataURL(file) }
                          }} className="hidden" />
                        </label>
                        <label className="flex-1 cursor-pointer flex flex-col items-center gap-1 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all">
                          <span className="material-symbols-outlined text-slate-400 text-lg">photo_library</span>
                          <span className="text-[9px] text-slate-400 font-bold uppercase">Seleccionar</span>
                          <input type="file" accept="image/*" onChange={e => {
                            const file = e.target.files[0]
                            if (file) { setImageFile(file); const r = new FileReader(); r.onloadend = () => setImagePreview(r.result); r.readAsDataURL(file) }
                          }} className="hidden" />
                        </label>
                      </div>
                    )}
               </div>
               <button onClick={handleAddProduct} disabled={isSaving} className="w-full btn-primary py-4 text-[10px] font-black uppercase">{isSaving ? 'Subiendo...' : 'Guardar Llanta'}</button>
                <button onClick={() => { setShowAddModal(false); setImageFile(null); setImagePreview(null); }} className="w-full text-slate-500 text-[10px] font-black uppercase mt-2">Cancelar</button>
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

      {showSearchScanner && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
          <div id="search-scanner-reader" className="flex-1 w-full" />
          <div className="p-4 bg-zinc-900 space-y-3">
            <p className="text-white text-center text-sm">Apunta al código de barras para buscar</p>
            <button onClick={() => setShowSearchScanner(false)} className="w-full py-3 bg-zinc-700 text-white rounded-xl font-medium">Cerrar</button>
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
                  <img src={editImagePreview || editingProduct.img} className="w-full aspect-video object-contain bg-background rounded-xl border border-white/10" />
                  <div className="w-full mt-2">
                    <label className="text-[10px] text-slate-500 font-black uppercase block mb-2">Cambiar imagen</label>
                    {editImagePreview ? (
                      <div className="relative">
                        <p className="text-[10px] text-emerald-400 font-black uppercase">Nueva imagen seleccionada — se subirá al guardar</p>
                        <button type="button" onClick={() => { setEditImageFile(null); setEditImagePreview(null); }} className="mt-1 text-[10px] text-slate-400 underline">Descartar cambio</button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <label className="flex-1 cursor-pointer flex flex-col items-center gap-1 py-3 rounded-xl bg-primary/10 border border-primary/30 hover:bg-primary/20 transition-all">
                          <span className="material-symbols-outlined text-primary text-lg">photo_camera</span>
                          <span className="text-[9px] text-primary font-bold uppercase">Tomar Foto</span>
                          <input type="file" accept="image/*" capture="environment" onChange={e => {
                            const file = e.target.files[0]
                            if (file) { setEditImageFile(file); const r = new FileReader(); r.onloadend = () => setEditImagePreview(r.result); r.readAsDataURL(file) }
                          }} className="hidden" />
                        </label>
                        <label className="flex-1 cursor-pointer flex flex-col items-center gap-1 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all">
                          <span className="material-symbols-outlined text-slate-400 text-lg">photo_library</span>
                          <span className="text-[9px] text-slate-400 font-bold uppercase">Seleccionar</span>
                          <input type="file" accept="image/*" onChange={e => {
                            const file = e.target.files[0]
                            if (file) { setEditImageFile(file); const r = new FileReader(); r.onloadend = () => setEditImagePreview(r.result); r.readAsDataURL(file) }
                          }} className="hidden" />
                        </label>
                      </div>
                    )}
                  </div>
                </div>
                
                <input className="w-full input-industrial py-3 text-xs" placeholder="Medida" value={editingProduct.name || ''} onChange={e => setEditingProduct({...editingProduct, name: e.target.value})} />
                  <input className="w-full input-industrial py-3 text-xs" placeholder="Marca" value={editingProduct.brand || ''} onChange={e => setEditingProduct({...editingProduct, brand: e.target.value})} />
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setEditingProduct({...editingProduct, condicion: 'nueva'})} className={`flex-1 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${editingProduct.condicion === 'nueva' ? 'bg-emerald-500 text-black shadow-md' : 'bg-white/5 text-slate-500 hover:text-slate-300'}`}>Nueva</button>
                    <button type="button" onClick={() => setEditingProduct({...editingProduct, condicion: 'medio_uso'})} className={`flex-1 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${editingProduct.condicion === 'medio_uso' ? 'bg-amber-500 text-black shadow-md' : 'bg-white/5 text-slate-500 hover:text-slate-300'}`}>Medio Uso</button>
                  </div>
                  <input className="w-full input-industrial py-3 text-xs" placeholder="Ubicación (pasillo, rack, etc.)" value={editingProduct.ubicacion || ''} onChange={e => setEditingProduct({...editingProduct, ubicacion: e.target.value})} />
                 <div className="grid grid-cols-2 gap-2">
                   <input type="number" className="w-full input-industrial py-3 text-xs" placeholder="Stock" value={editingProduct.qty || 0} onChange={e => setEditingProduct({...editingProduct, qty: parseInt(e.target.value) || 0})} />
                   <input type="number" className="w-full input-industrial py-3 text-xs" placeholder="Precio" value={editingProduct.price || 0} onChange={e => setEditingProduct({...editingProduct, price: parseFloat(e.target.value) || 0})} />
                </div>
                <input className="w-full input-industrial py-3 text-xs" placeholder="SKU" value={editingProduct.sku || ''} onChange={e => setEditingProduct({...editingProduct, sku: e.target.value})} />
                <input type="number" className="w-full input-industrial py-3 text-xs" placeholder="Costo" value={editingProduct.cost || 0} onChange={e => setEditingProduct({...editingProduct, cost: parseFloat(e.target.value) || 0})} />
                <button onClick={handleEditProduct} disabled={isSaving} className="w-full btn-primary py-4 text-xs font-black uppercase">{isSaving ? 'Guardando...' : 'Actualizar'}</button>
                <div className="flex gap-2">
                  <button onClick={() => { setIsEditing(false); setEditImageFile(null); setEditImagePreview(null); }} className="flex-1 text-slate-500 text-[10px] font-black uppercase py-3">Cancelar</button>
                </div>
             </div>
          </div>
       )}

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

      {/* Detail Modal */}
      {showDetailModal && selectedProduct && (
        <div className="fixed inset-0 z-50 bg-black/90 p-4 flex items-center justify-center overflow-y-auto backdrop-blur-md">
          <div className="bg-surface-container-lowest max-w-sm w-full rounded-2xl p-0 border border-white/10 overflow-hidden">
            <div className="relative bg-surface-container-high">
              {selectedProduct.img ? (
                <img src={selectedProduct.img} className="w-full aspect-square object-contain p-8" />
              ) : (
                <div className="w-full aspect-square flex items-center justify-center">
                  <span className="material-symbols-outlined text-8xl text-slate-700">tire_repair</span>
                </div>
              )}
            </div>
            <div className="p-6 space-y-4">
              <div className="text-center border-b border-white/5 pb-4">
                <p className="text-[10px] text-primary font-black uppercase tracking-[3px] mb-1">{selectedProduct.brand || 'SIN MARCA'}</p>
                <h3 className="font-headline font-bold text-lg text-on-surface uppercase leading-tight">{selectedProduct.name}</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/5 rounded-xl p-3 text-center">
                  <p className="text-[9px] text-slate-500 font-black uppercase tracking-wider mb-1">SKU</p>
                  <p className="text-xs font-mono font-bold text-on-surface">{selectedProduct.sku || '—'}</p>
                </div>
                <div className="bg-white/5 rounded-xl p-3 text-center">
                  <p className="text-[9px] text-slate-500 font-black uppercase tracking-wider mb-1">Stock</p>
                  <p className={`text-lg font-black ${parseInt(selectedProduct.qty) < 5 ? 'text-error' : 'text-emerald-400'}`}>{selectedProduct.qty}</p>
                </div>
                <div className="bg-white/5 rounded-xl p-3 text-center">
                  <p className="text-[9px] text-slate-500 font-black uppercase tracking-wider mb-1">Precio Venta</p>
                  <p className="text-lg font-black text-primary">${parseFloat(selectedProduct.price).toFixed(2)}</p>
                </div>
                <div className="bg-white/5 rounded-xl p-3 text-center">
                  <p className="text-[9px] text-slate-500 font-black uppercase tracking-wider mb-1">Almacén</p>
                  <p className="text-xs font-black uppercase text-on-surface">{selectedProduct.warehouse === 'rines' ? 'Rines' : selectedProduct.warehouse === 'llantas' ? 'Llantas' : 'General'}</p>
                </div>
              </div>
              <button onClick={() => setShowDetailModal(false)} className="w-full btn-primary py-4 text-xs font-black uppercase">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 bg-black/90 p-4 flex items-center justify-center overflow-y-auto backdrop-blur-md">
          <div className="bg-surface-container-lowest max-w-sm w-full rounded-2xl p-6 border border-white/10 space-y-4">
            <div className="flex items-center gap-3 border-b border-white/5 pb-3">
              <div className="w-10 h-10 rounded-xl overflow-hidden border border-white/10 shrink-0">
                <img src="/images/logo_nando.jpg" className="w-full h-full object-contain" />
              </div>
              <div>
                <h3 className="text-xs font-black uppercase text-primary tracking-widest">Reporte de Existencias</h3>
                <p className="text-[9px] text-slate-500">{activeBranch}</p>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-slate-500 font-black uppercase tracking-wider">Alcance</label>
              <select
                value={reportScope}
                onChange={e => setReportScope(e.target.value)}
                className="w-full input-industrial py-3 text-xs"
              >
                <option value="all">Todos los productos</option>
                <option value="filtered">Solo resultados del filtro</option>
              </select>
            </div>

            <label className="flex items-center gap-2 text-[10px] text-slate-400 uppercase font-black cursor-pointer">
              <input
                type="checkbox"
                checked={includePausedReport}
                onChange={e => setIncludePausedReport(e.target.checked)}
                className="accent-primary w-4 h-4"
              />
              Incluir productos pausados
            </label>

            <div className="space-y-1">
              <label className="text-[10px] text-slate-500 font-black uppercase tracking-wider">Condición</label>
              <select
                value={reportCondition}
                onChange={e => setReportCondition(e.target.value)}
                className="w-full input-industrial py-3 text-xs"
              >
                <option value="todas">Todas</option>
                <option value="nueva">Nuevas</option>
                <option value="medio_uso">Medio Uso</option>
              </select>
            </div>

            <button onClick={generatePDF} className="w-full btn-primary py-4 text-xs font-black uppercase">
              Generar PDF
            </button>
            <button onClick={() => setShowReportModal(false)} className="w-full text-slate-500 text-[10px] font-black uppercase">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Labels Modal */}
      {showLabelsModal && (
        <div className="fixed inset-0 z-50 bg-black/90 p-4 flex items-center justify-center overflow-y-auto backdrop-blur-md">
          <div className="bg-surface-container-lowest max-w-sm w-full rounded-2xl p-6 border border-white/10 space-y-4">
            <div className="flex items-center gap-3 border-b border-white/5 pb-3">
              <div className="w-10 h-10 rounded-xl bg-violet-600/20 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-violet-400 text-xl">confirmation_number</span>
              </div>
              <div>
                <h3 className="text-xs font-black uppercase text-primary tracking-widest">Generar Etiquetas</h3>
                <p className="text-[9px] text-slate-500">Selecciona productos para etiquetar</p>
              </div>
            </div>

            <input className="w-full input-industrial py-3 text-xs" placeholder="Buscar producto..." value={labelSearch} onChange={e => setLabelSearch(e.target.value)} />

            <div className="max-h-48 overflow-y-auto space-y-1 border border-white/5 rounded-xl p-1">
              {(products.length === 0) ? (
                <div className="py-8 text-center">
                  <span className="material-symbols-outlined text-3xl text-slate-700 block mb-2">inventory_2</span>
                  <p className="text-[10px] text-slate-500 font-black uppercase">No hay productos</p>
                </div>
              ) : (
                products.filter(p => !labelSearch || (p.name||'').toLowerCase().includes(labelSearch.toLowerCase()) || (p.sku||'').toLowerCase().includes(labelSearch.toLowerCase())).map(p => (
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
                        <div className="relative w-full h-full flex items-center justify-center">
                          <img src="/images/logo_nando.jpg" className="w-3/4 h-3/4 object-contain opacity-30" />
                          <span className="absolute bottom-0 text-[7px] font-black uppercase text-slate-600 tracking-wider bg-background/80 px-1 rounded">MEDIO USO</span>
                        </div>
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

      {/* Label Prompt after adding product */}
      {showLabelPrompt && labelPromptProduct && (
        <div className="fixed inset-0 z-50 bg-black/90 p-4 flex items-center justify-center backdrop-blur-md">
          <div className="bg-surface-container-lowest max-w-sm w-full rounded-2xl p-6 border border-white/10 space-y-4 text-center">
            <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-emerald-400 text-3xl">check_circle</span>
            </div>
            <div>
              <h3 className="text-sm font-black uppercase text-emerald-400 tracking-widest">Producto Guardado</h3>
              <p className="text-xs text-slate-400 mt-1">SKU: <span className="font-mono font-bold text-slate-200">{labelPromptProduct.sku}</span></p>
            </div>
            <p className="text-[10px] text-slate-500">¿Quieres imprimir una etiqueta para este producto?</p>
            <div className="flex gap-2">
              <button onClick={() => handlePrintSingleLabel(labelPromptProduct)} className="flex-1 btn-primary py-4 text-xs font-black uppercase">
                Imprimir Etiqueta
              </button>
              <button onClick={() => setShowLabelPrompt(false)} className="flex-1 py-4 text-xs font-black uppercase text-slate-500 bg-white/5 rounded-xl hover:bg-white/10">
                No, gracias
              </button>
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
          <input className="input-industrial px-4 py-2 text-xs w-full sm:w-64" placeholder="Buscar llanta o SKU..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          <button onClick={() => setShowSearchScanner(true)} className="btn-secondary px-3 py-2 text-xs font-black uppercase flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h2M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg>
            Escanear
          </button>
          <button onClick={() => setShowReportModal(true)} className="btn-primary bg-blue-600 hover:bg-blue-700 px-6 py-2 text-xs font-black uppercase flex items-center justify-center gap-2">📄 Reporte</button>
          <button onClick={() => setShowLabelsModal(true)} className="btn-primary bg-violet-600 hover:bg-violet-700 px-6 py-2 text-xs font-black uppercase flex items-center justify-center gap-2">🏷️ Etiquetas</button>
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
                <tr key={p.id} onClick={() => { setSelectedProduct(p); setShowDetailModal(true); }} className={`cursor-pointer hover:bg-white/5 transition-all group ${!(p.active ?? true) ? 'opacity-60' : ''}`}>
                  <td className="px-6 py-4">{p.img ? <img src={p.img} className="w-12 h-12 object-contain bg-background p-1 rounded-lg border border-white/5" /> : <div className="relative w-12 h-12 flex items-center justify-center bg-background rounded-lg border border-white/5"><img src="/images/logo_nando.jpg" className="w-8 h-8 object-contain opacity-30" /><span className="absolute bottom-0 text-[6px] font-black uppercase text-slate-600">USO</span></div>}</td>
                  <td className="px-6 py-4 font-bold text-sm uppercase text-on-surface">
                    <div className="flex items-center gap-2">
                      <span>{p.name}</span>
                      {!(p.active ?? true) && (
                        <span className="text-[9px] font-black uppercase bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded">⏸ Pausado</span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500 font-mono italic">#{p.sku}</p>
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-400 uppercase font-black">{p.brand}</td>
                  <td className="px-6 py-4 text-center"><span className={`px-2 py-1 rounded text-xs font-black ${parseInt(p.qty) < 5 ? 'bg-error/20 text-error animate-pulse' : 'bg-emerald-400/20 text-emerald-400'}`}>{p.qty}</span></td>
                  <td className="px-6 py-4 text-right font-headline font-bold text-primary">${parseFloat(p.price).toFixed(2)}</td>
                      <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {isAdmin && (
                          <div className="relative" data-menu ref={menuOpenId === p.id ? menuRef : null}>
                            <button
                              onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === p.id ? null : p.id); }}
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
                        <button onClick={(e) => { e.stopPropagation(); setSelectedProduct(p); setShowTransferModal(true); }} className="w-8 h-8 rounded-full border border-white/5 flex items-center justify-center text-slate-500 hover:text-primary transition-all"><span className="material-symbols-outlined text-[16px]">swap_horiz</span></button>
                      </div>
                    </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Version Móvil (Cards) */}
          <div className="md:hidden flex flex-col divide-y divide-white/5">
             {filtered.map(p => (
                 <div key={p.id} onClick={() => { setSelectedProduct(p); setShowDetailModal(true); }} className={`p-4 flex gap-4 items-center cursor-pointer ${!(p.active ?? true) ? 'opacity-60' : ''}`}>
                    {p.img ? <img src={p.img} className="w-16 h-16 object-contain bg-background p-2 rounded-xl border border-white/5 shrink-0" /> : <div className="relative w-16 h-16 flex items-center justify-center bg-background rounded-xl border border-white/5 shrink-0"><img src="/images/logo_nando.jpg" className="w-10 h-10 object-contain opacity-30" /><span className="absolute bottom-1 text-[7px] font-black uppercase text-slate-600">USO</span></div>}
                   <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-on-surface uppercase truncate">{p.name}</h4>
                        {!(p.active ?? true) && (
                          <span className="text-[8px] font-black uppercase bg-amber-500/20 text-amber-400 px-1 py-0.5 rounded shrink-0">⏸ Pausado</span>
                        )}
                      </div>
                      <p className="text-[9px] text-slate-500 font-black uppercase mb-1">{p.brand}</p>
<div className="flex justify-between items-center">
                          <span className={`text-[10px] font-black uppercase ${parseInt(p.qty) < 5 ? 'text-error animate-pulse' : 'text-emerald-400'}`}>{p.qty} DISP.</span>
                          <span className="text-sm font-headline font-black text-primary">${parseFloat(p.price).toFixed(0)}</span>
                       </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button onClick={(e) => { e.stopPropagation(); setSelectedProduct(p); setShowTransferModal(true); }} className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-primary active:bg-primary/20">
                        <span className="material-symbols-outlined text-[20px]">move_up</span>
                      </button>
                      {isAdmin && (
                        <div className="relative" data-menu ref={menuOpenId === p.id ? menuRef : null}>
                          <button
                            onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === p.id ? null : p.id); }}
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
