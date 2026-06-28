import React, { useState, useEffect, useRef } from 'react'
import { fetchData, postData, updateData, deleteData, uploadImage } from '../services/api'
import { Package, ArrowRightLeft, Plus, Trash2, Search, X, Warehouse, CircleDot, Camera, QrCode, Printer, Barcode, Edit, Image, Upload, Pencil, Trash, FileText } from 'lucide-react'
import { LoadingTire } from './LoadingTire'
import { CameraCapture } from './CameraCapture'
import JsBarcode from 'jsbarcode'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import imageCompression from 'browser-image-compression'

const WAREHOUSES = [
  { id: 'rines', name: 'Rines', icon: CircleDot, color: 'text-blue-400', accent: '#3b82f6' },
  { id: 'llantas', name: 'Llantas', icon: Package, color: 'text-amber-400', accent: '#f59e0b' }
]

const BRANCHES = ['Rojo Gomez', 'Morelos', 'Bacalar']

const isMixedBranch = (branch) => branch === 'Bacalar'

function Warehouses({ activeBranch, isAdmin }) {
  const [products, setProducts] = useState([])
  const [allProducts, setAllProducts] = useState([])
  const [llantasProducts, setLlantasProducts] = useState([])
  const [rinesProducts, setRinesProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedWarehouse, setSelectedWarehouse] = useState('rines')
  const [mixedView, setMixedView] = useState('rines') // for mixed branch
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [showLabelsModal, setShowLabelsModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [selectedProducts, setSelectedProducts] = useState([])
  const [isTransferring, setIsTransferring] = useState(false)
  const [transferData, setTransferData] = useState({ quantity: 1, targetBranch: '' })
  const [showAddModal, setShowAddModal] = useState(false)
  const [newProduct, setNewProduct] = useState({ name: '', brand: '', price: '', cost: '', qty: '', sku: '', ubicacion: '', condicion: 'nueva' })
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  const [skuScanMode, setSkuScanMode] = useState(false)
  const [scannedSku, setScannedSku] = useState('')
  const [scanResult, setScanResult] = useState(null)
  const [importing, setImporting] = useState(false)
  const [importResults, setImportResults] = useState(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [editImageFile, setEditImageFile] = useState(null)
  const [editImagePreview, setEditImagePreview] = useState(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deletingProduct, setDeletingProduct] = useState(null)
  const [showReportModal, setShowReportModal] = useState(false)
  const [reportScope, setReportScope] = useState('all')
  const [includePausedReport, setIncludePausedReport] = useState(false)
  const [reportCondition, setReportCondition] = useState('todas')
  const [labelSearch, setLabelSearch] = useState('')
  const [labelQuantity, setLabelQuantity] = useState(1)
  const fileInputRef = useRef(null)
  const skuInputRef = useRef(null)
  const importFileRef = useRef(null)
  const editImageInputRef = useRef(null)
  const [cameraMode, setCameraMode] = useState(null)

  const loadWarehouseData = async (warehouseFilter) => {
    const allData = await fetchData('Inventario', 'Almacen')
    setAllProducts(allData)
    if (isMixedBranch(activeBranch)) {
      setRinesProducts(allData.filter(p => p.warehouse === 'rines'))
      setLlantasProducts(allData.filter(p => p.warehouse === 'llantas'))
    } else {
      setProducts(allData.filter(p => p.warehouse === (warehouseFilter || selectedWarehouse)))
    }
  }

  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        setLoading(true)
        const allData = await fetchData('Inventario', 'Almacen')
        if (!active) return
        setAllProducts(allData)
        if (isMixedBranch(activeBranch)) {
          setRinesProducts(allData.filter(p => p.warehouse === 'rines'))
          setLlantasProducts(allData.filter(p => p.warehouse === 'llantas'))
        } else {
          setProducts(allData.filter(p => p.warehouse === selectedWarehouse))
        }
      } catch (e) { console.error(e) }
      finally { if (active) setLoading(false) }
    }
    load()
    return () => { active = false }
  }, [selectedWarehouse, activeBranch])

  // Get products based on branch type
  const getCurrentProducts = () => {
    if (isMixedBranch(activeBranch)) {
      return mixedView === 'rines' ? rinesProducts : llantasProducts
    }
    return products
  }

  const getAllProducts = () => {
    if (isMixedBranch(activeBranch)) {
      return [...rinesProducts, ...llantasProducts]
    }
    return products
  }

  const handleSkuScan = async (e) => {
    e.preventDefault()
    if (!scannedSku.trim()) return
    
    const sku = scannedSku.trim().toUpperCase()
    const existing = products.find(p => p.sku?.toUpperCase() === sku)
    
    if (existing) {
      setScanResult(existing)
    } else {
      setScanResult('new')
      setNewProduct({ ...newProduct, sku: sku })
      setShowAddModal(true)
    }
    setScannedSku('')
    setSkuScanMode(false)
  }

  const generateBarcodeSvg = (text) => {
    const canvas = document.createElement('canvas')
    JsBarcode(canvas, text, { format: 'CODE128', width: 1.5, height: 30, displayValue: false, margin: 5 })
    const url = canvas.toDataURL('image/png')
    return `<img src="${url}" alt="barcode" style="display:block;height:22px;width:auto" />`
  }

  const printLabels = () => {
    setShowLabelsModal(false)
    const printWindow = window.open('', '_blank')
    let allLabelsHtml = ''

    for (const p of selectedProducts) {
      const sku = p.sku || p.id?.slice(0, 8)
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
              <div class="label-price">${parseFloat(p.price || 0).toLocaleString('es-MX', { minimumFractionDigits: 0 })}</div>
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

  const handleGenerateLabels = async () => {
    const selected = getAllProducts().filter(p => labelSelections && labelSelections[p.id])
    if (!selected || selected.length === 0) return

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
              <div class="label-price">${parseFloat(p.price || 0).toLocaleString('es-MX', { minimumFractionDigits: 0 })}</div>
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

  const [labelSelections, setLabelSelections] = useState({})

  const toggleProductSelection = (product) => {
    setSelectedProducts(prev => {
      const exists = prev.find(p => p.id === product.id)
      if (exists) {
        return prev.filter(p => p.id !== product.id)
      }
      return [...prev, product]
    })
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

  const generatePDF = async () => {
    const data = reportScope === 'filtered' ? filtered : getAllProducts()
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

    const currentWarehouseName = isMixedBranch(activeBranch) ? (mixedView === 'rines' ? 'Rines' : 'Llantas') : (selectedWarehouse === 'rines' ? 'Rines' : 'Llantas')
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

  const handleEditProduct = (product) => {
    setEditingProduct(product)
    setEditForm({
      name: product.name || '',
      brand: product.brand || '',
      price: product.price || '',
      cost: product.cost || '',
      qty: product.qty || '',
      sku: product.sku || '',
      img: product.img || '',
      ubicacion: product.ubicacion || '',
      condicion: product.condicion || 'nueva'
    })
    setEditImageFile(null)
    setEditImagePreview(product.img || null)
    setShowEditModal(true)
  }

  const handleSaveEdit = async () => {
    if (!editingProduct) return
    try {
      let imageUrl = editForm.img || ''
      
      if (editImageFile) {
        const result = await uploadImage(editImageFile, 'warehouse')
        if (!result.success) throw new Error(result.error)
        imageUrl = result.url
      }
      
      const res = await updateData('Inventario', editingProduct.id, {
        ...editForm,
        img: imageUrl,
        price: parseFloat(editForm.price) || 0,
        cost: parseFloat(editForm.cost) || 0,
        qty: parseInt(editForm.qty) || 0
      })
      if (!res.success) throw new Error('Error al guardar en base de datos')
      
      setShowEditModal(false)
      setEditingProduct(null)
      setEditImageFile(null)
      setEditImagePreview(null)
      await loadWarehouseData()
    } catch (e) {
      console.error(e)
      alert('Error: ' + (e.message || 'desconocido'))
    }
  }

  const handleDeleteProduct = (product) => {
    setDeletingProduct(product)
    setShowDeleteConfirm(true)
  }

  const confirmDelete = async () => {
    if (!deletingProduct) return
    try {
      const res = await deleteData('Inventario', deletingProduct.id)
      if (!res.success) throw new Error('Error al eliminar')
      setShowDeleteConfirm(false)
      setDeletingProduct(null)
      await loadWarehouseData()
    } catch (e) {
      console.error(e)
      alert('Error al eliminar')
    }
  }

  const compressImage = async (file) => {
    const options = {
      maxWidthOrHeight: 800,
      useWebWorker: false,
      initialQuality: 0.75,
      fileType: 'image/jpeg'
    }
    const result = await imageCompression(file, options)
    if (!result.name) {
      return new File([result], file.name || `foto_${Date.now()}.jpg`, { type: 'image/jpeg' })
    }
    return result
  }

  const handleCameraCapture = async (blob, target) => {
    const file = new File([blob], `camera_${Date.now()}.jpg`, { type: 'image/jpeg' })
    try {
      const compressed = await compressImage(file)
      if (target === 'add') {
        setImageFile(compressed)
        const reader = new FileReader()
        reader.onloadend = () => setImagePreview(reader.result)
        reader.readAsDataURL(compressed)
      } else {
        setEditImageFile(compressed)
        const reader = new FileReader()
        reader.onloadend = () => setEditImagePreview(reader.result)
        reader.readAsDataURL(compressed)
      }
    } catch (err) {
      console.error('Error al comprimir imagen:', err)
      if (target === 'add') {
        setImageFile(file)
        const reader = new FileReader()
        reader.onloadend = () => setImagePreview(reader.result)
        reader.readAsDataURL(file)
      } else {
        setEditImageFile(file)
        const reader = new FileReader()
        reader.onloadend = () => setEditImagePreview(reader.result)
        reader.readAsDataURL(file)
      }
    }
  }

  const handleImageSelect = async (e) => {
    const file = e.target.files[0]
    if (file) {
      try {
        const compressed = await compressImage(file)
        setImageFile(compressed)
        const reader = new FileReader()
        reader.onloadend = () => setImagePreview(reader.result)
        reader.readAsDataURL(compressed)
      } catch (err) {
        console.error('Error al comprimir imagen:', err)
        setImageFile(file)
        const reader = new FileReader()
        reader.onloadend = () => setImagePreview(reader.result)
        reader.readAsDataURL(file)
      }
    }
  }

  const handleAddProduct = async () => {
    if (!newProduct.name || !newProduct.price || !newProduct.qty) return alert('Nombre, Precio y Cantidad requeridos')
    setIsSaving(true)
    try {
      let imageUrl = 'https://images.unsplash.com/photo-1549441412-10d5b746a48d?q=80&w=200'
      if (imageFile) {
        const result = await uploadImage(imageFile, 'warehouse')
        if (!result.success) throw new Error(result.error)
        imageUrl = result.url
      }

      const currentWarehouseType = isMixedBranch(activeBranch) ? mixedView : selectedWarehouse
      let sku = newProduct.sku
      if (!sku) {
        const prefix = currentWarehouseType === 'rines' ? 'RIN-' : currentWarehouseType === 'llantas' ? 'LLA-' : 'PROD-'
        const lastNum = await getLastSkuNumber(prefix)
        sku = `${prefix}${String(lastNum + 1).padStart(5, '0')}`
      }
      const productData = {
        ...newProduct,
        price: parseFloat(newProduct.price),
        cost: parseFloat(newProduct.cost || 0),
        qty: parseInt(newProduct.qty),
        sku,
        img: imageUrl,
        warehouse: currentWarehouseType,
        branch: 'Almacen',
        timestamp: Date.now()
      }
      const res = await postData('Inventario', productData)
      if (!res.success) throw new Error('Error al guardar en base de datos')
      setShowAddModal(false)
      setNewProduct({ name: '', brand: '', price: '', cost: '', qty: '', sku: '', ubicacion: '', condicion: 'nueva' })
      setImageFile(null)
      setImagePreview(null)
      await loadWarehouseData(currentWarehouseType)
    } catch (e) { console.error('Error al guardar:', e); alert('Error: ' + (e.message || 'desconocido')) }
    finally { setIsSaving(false) }
  }

  const handleTransfer = async () => {
    if (!transferData.targetBranch || transferData.quantity <= 0) return alert('Selecciona sucursal y cantidad')
    if (transferData.quantity > selectedProduct.qty) return alert('Stock insuficiente')
    
    const transferQty = parseInt(transferData.quantity)
    setIsTransferring(true)
    try {
      // Get target branch products to find existing product with same SKU
      const targetProducts = await fetchData('Inventario', transferData.targetBranch)
      const existingTarget = targetProducts.find(p => p.sku === selectedProduct.sku)

      // Decrease source warehouse qty
      const decRes = await updateData('Inventario', selectedProduct.id, { qty: selectedProduct.qty - transferQty })
      if (!decRes.success) throw new Error('Error al actualizar stock origen')

      if (existingTarget) {
        // Increase existing product in target branch
        const incRes = await updateData('Inventario', existingTarget.id, { qty: (existingTarget.qty || 0) + transferQty })
        if (!incRes.success) throw new Error('Error al actualizar stock destino')
      } else {
        // Create new product in target branch
        const { id, created_at, updated_at, ...productData } = selectedProduct
        const newRes = await postData('Inventario', {
          ...productData,
          qty: transferQty,
          branch: transferData.targetBranch,
          warehouse: null
        })
        if (!newRes.success) throw new Error('Error al crear producto destino')
      }

      alert('Transferencia exitosa')
      setShowTransferModal(false)
      await loadWarehouseData()
    } catch (e) { 
      console.error(e)
      alert('Error en transferencia: ' + (e.message || 'desconocido')) 
    }
    finally { setIsTransferring(false) }
  }

  const parseCSV = (text) => {
    const lines = text.trim().split('\n')
    const headers = lines[0].toLowerCase().split(',').map(h => h.trim())
    const results = []
    const errors = []
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim())
      if (values.length < 4) continue
      
      const row = {}
      headers.forEach((h, idx) => { row[h] = values[idx] || '' })
      
      if (!row.nombre || !row.cantidad) {
        errors.push(`Fila ${i + 1}: Falta nombre o cantidad`)
        continue
      }
      
      results.push({
        sku: row.sku || `SKU-${Date.now().toString().slice(-4)}${i}`,
        name: row.nombre,
        brand: row.marca || '',
        qty: parseInt(row.cantidad) || 0,
        price: parseFloat(row.precio) || 0,
        cost: parseFloat(row.costo) || 0,
        warehouse: isMixedBranch(activeBranch) ? mixedView : selectedWarehouse,
        branch: 'Almacen',
        timestamp: Date.now()
      })
    }
    return { products: results, errors }
  }

  const handleImportCSV = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    
    setImporting(true)
    setImportResults(null)
    
    try {
      const text = await file.text()
      const parsed = parseCSV(text)
      
      let added = 0
      for (const product of parsed.products) {
        const res = await postData('Inventario', product)
        if (res.success) added++
      }
      
      setImportResults({ success: added, errors: parsed.errors })
      await loadWarehouseData()
      
    } catch (e) {
      alert('Error al importar: ' + e.message)
    }
    finally {
      setImporting(false)
      if (importFileRef.current) importFileRef.current.value = ''
    }
  }

  const openAddModal = () => {
    setNewProduct({ name: '', brand: '', price: '', cost: '', qty: '', sku: '', img: '' })
    setImageFile(null)
    setImagePreview(null)
    setShowAddModal(true)
  }

  const filtered = getCurrentProducts().filter(p => 
    (p.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.sku || '').includes(searchTerm) ||
    (p.brand || '').toLowerCase().includes(searchTerm.toLowerCase())
  )

  const currentWarehouse = WAREHOUSES.find(w => w.id === (isMixedBranch(activeBranch) ? mixedView : selectedWarehouse))

  if (loading) return <div className="p-20 flex justify-center"><LoadingTire size="lg" /></div>

  return (
    <div className="p-4 lg:p-8 space-y-6">
      {/* Scan Mode Banner */}
      {skuScanMode && (
        <div className="fixed inset-0 z-[60] bg-black/95 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest max-w-md w-full rounded-2xl p-6 border border-primary">
            <div className="flex items-center gap-2 mb-4">
              <QrCode className="w-6 h-6 text-primary" />
              <h3 className="text-primary font-black uppercase">Escanear SKU</h3>
            </div>
            <form onSubmit={handleSkuScan}>
              <input
                ref={skuInputRef}
                type="text"
                autoFocus
                className="input-industrial py-4 text-lg w-full text-center font-mono uppercase"
                placeholder="Escanea o escribe SKU..."
                value={scannedSku}
                onChange={e => setScannedSku(e.target.value)}
              />
            </form>
            {scanResult && (
              <div className="mt-4 p-4 rounded-xl bg-surface-container-high">
                {scanResult === 'new' ? (
                  <p className="text-amber-400 text-center">Nuevo producto - SKU no encontrado</p>
                ) : (
                  <div className="text-center">
                    <p className="font-bold">{scanResult.name}</p>
                    <p className="text-sm text-slate-500">Stock: {scanResult.qty}</p>
                    <button 
                      onClick={() => { setSelectedProduct(scanResult); setShowTransferModal(true) }}
                      className="btn-primary mt-2"
                    >
                      Transferir
                    </button>
                  </div>
                )}
              </div>
            )}
            <button onClick={() => { setSkuScanMode(false); setScannedSku(''); setScanResult(null) }} className="w-full mt-4 text-slate-500 text-xs">Cancelar</button>
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
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest max-w-2xl w-full rounded-2xl p-6 border border-white/10 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-white/5 pb-4 mb-4">
              <h3 className="text-primary font-black uppercase">Generar Etiquetas</h3>
              <button onClick={() => setShowLabelsModal(false)}><X className="w-5 h-5" /></button>
            </div>

            <input className="w-full input-industrial py-3 text-xs mb-4" placeholder="Buscar producto..." value={labelSearch} onChange={e => setLabelSearch(e.target.value)} />

            <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
              {getAllProducts().filter(p => !labelSearch || (p.name||'').toLowerCase().includes(labelSearch.toLowerCase()) || (p.sku||'').toLowerCase().includes(labelSearch.toLowerCase()) || (p.brand||'').toLowerCase().includes(labelSearch.toLowerCase())).map(p => (
                <div 
                  key={p.id} 
                  onClick={() => {
                    setSelectedProducts(prev => {
                      const exists = prev.find(sp => sp.id === p.id)
                      if (exists) return prev.filter(sp => sp.id !== p.id)
                      return [...prev, p]
                    })
                  }}
                  className={`p-3 rounded-lg border cursor-pointer flex items-center gap-3 ${
                    selectedProducts.find(sp => sp.id === p.id) 
                      ? 'border-primary bg-primary/10' 
                      : 'border-white/10'
                  }`}
                >
                  {p.img && p.img.startsWith('data:') ? (
                    <img src={p.img} alt="" className="w-10 h-10 object-cover rounded" />
                  ) : p.img ? (
                    <div className="w-10 h-10 bg-surface-container-high rounded flex items-center justify-center">
                      <Image className="w-5 h-5 text-slate-500" />
                    </div>
                  ) : (
                    <div className="w-10 h-10 bg-surface-container-high rounded flex items-center justify-center">
                      <Package className="w-5 h-5 text-slate-500" />
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="text-xs font-bold">{p.name}</p>
                    <p className="text-[10px] text-slate-500">{p.brand} • {p.sku}</p>
                  </div>
                  <div className="text-primary font-bold">${p.price}</div>
                </div>
              ))}
            </div>

            {selectedProducts.length > 0 && (
              <div className="flex items-center justify-between bg-primary/10 rounded-xl p-3 border border-primary/20 mb-4">
                <span className="text-[10px] text-primary font-black uppercase">
                  {selectedProducts.length} producto(s) seleccionado(s)
                </span>
                <div className="flex items-center gap-2">
                  <label className="text-[9px] text-slate-500 font-black uppercase">Qty:</label>
                  <input type="number" min="1" max="99" value={labelQuantity} onChange={e => setLabelQuantity(Math.max(1, parseInt(e.target.value) || 1))} className="w-14 input-industrial py-1.5 text-xs text-center" />
                </div>
              </div>
            )}

            <button 
              onClick={printLabels}
              disabled={selectedProducts.length === 0}
              className="w-full btn-primary py-4 text-xs font-black uppercase flex items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Printer className="w-4 h-4" />
              Imprimir {selectedProducts.length} Etiquetas
            </button>
          </div>
        </div>
      )}

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest max-w-lg w-full rounded-2xl p-6 border border-white/10 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-primary font-black uppercase text-xs tracking-widest border-b border-white/5 pb-2">
              Agregar a {currentWarehouse?.name}
            </h3>
            
            <div className="space-y-2">
              <p className="text-[10px] text-slate-500 uppercase font-black">Foto del producto</p>
              {imagePreview ? (
                <div className="relative">
                  <img src={imagePreview} alt="Preview" className="w-full max-h-48 object-contain rounded-lg" />
                  <button 
                    onClick={() => { setImageFile(null); setImagePreview(null) }}
                    className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setCameraMode('add')}
                    className="border-2 border-dashed border-white/20 rounded-xl py-6 cursor-pointer hover:border-primary/50 transition-colors text-center"
                  >
                    <Camera className="w-8 h-8 mx-auto text-slate-500 mb-1" />
                    <p className="text-[10px] text-slate-500">Tomar foto</p>
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-white/20 rounded-xl py-6 cursor-pointer hover:border-primary/50 transition-colors text-center"
                  >
                    <Image className="w-8 h-8 mx-auto text-slate-500 mb-1" />
                    <p className="text-[10px] text-slate-500">Subir foto</p>
                  </button>
                </div>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
            </div>

            <div className="relative">
              <QrCode className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input 
                className="input-industrial py-3 text-xs pl-10 font-mono uppercase" 
                placeholder="SKU (escanea o escribe)"
                value={newProduct.sku} 
                onChange={e => setNewProduct({...newProduct, sku: e.target.value.toUpperCase()})}
              />
            </div>
            
            <input className="input-industrial py-3 text-xs" placeholder="Nombre *" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} />
            <input className="input-industrial py-3 text-xs" placeholder="Marca" value={newProduct.brand} onChange={e => setNewProduct({...newProduct, brand: e.target.value})} />
            <div className="flex gap-2">
              <button type="button" onClick={() => setNewProduct({...newProduct, condicion: 'nueva'})} className={`flex-1 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${newProduct.condicion === 'nueva' ? 'bg-emerald-500 text-black shadow-md' : 'bg-white/5 text-slate-500 hover:text-slate-300'}`}>Nueva</button>
              <button type="button" onClick={() => setNewProduct({...newProduct, condicion: 'medio_uso'})} className={`flex-1 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${newProduct.condicion === 'medio_uso' ? 'bg-amber-500 text-black shadow-md' : 'bg-white/5 text-slate-500 hover:text-slate-300'}`}>Medio Uso</button>
            </div>
            <input className="input-industrial py-3 text-xs" placeholder="Ubicación (pasillo, rack, etc.)" value={newProduct.ubicacion} onChange={e => setNewProduct({...newProduct, ubicacion: e.target.value})} />
            <div className="grid grid-cols-2 gap-2">
              <input type="number" className="input-industrial py-3 text-xs" placeholder="Precio $" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: e.target.value})} />
              <input type="number" className="input-industrial py-3 text-xs" placeholder="Cantidad" value={newProduct.qty} onChange={e => setNewProduct({...newProduct, qty: e.target.value})} />
            </div>
            <input type="number" className="input-industrial py-3 text-xs" placeholder="Costo (opcional)" value={newProduct.cost} onChange={e => setNewProduct({...newProduct, cost: e.target.value})} />
            <button onClick={handleAddProduct} disabled={isSaving} className="w-full btn-primary py-4 text-xs font-black uppercase">
              {isSaving ? 'Guardando...' : 'Agregar'}
            </button>
            <button onClick={() => setShowAddModal(false)} className="w-full text-slate-500 text-xs">Cancelar</button>
          </div>
        </div>
      )}

      {/* Transfer Modal */}
      {showTransferModal && selectedProduct && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest max-w-sm w-full rounded-2xl p-6 border border-white/10 space-y-4">
            <h3 className="text-primary font-black uppercase text-xs tracking-widest border-b border-white/5 pb-2">Transferir a Sucursal</h3>
            <div className="py-4 text-center">
              {selectedProduct.img && selectedProduct.img.startsWith('data:') ? (
                <img src={selectedProduct.img} alt={selectedProduct.name} className="w-24 h-24 object-contain mx-auto rounded-lg mb-2" />
              ) : selectedProduct.img ? (
                <div className="w-24 h-24 mx-auto mb-2 bg-surface-container-high rounded-lg flex items-center justify-center cursor-pointer"
                  onClick={() => window.open(selectedProduct.img, '_blank')}>
                  <Image className="w-8 h-8 text-slate-500" />
                </div>
              ) : null}
              <p className="text-sm font-bold">{selectedProduct.name}</p>
              <p className="text-xs text-slate-500">Stock: {selectedProduct.qty}</p>
            </div>
            <select 
              className="input-industrial py-3 text-xs"
              value={transferData.targetBranch}
              onChange={e => setTransferData({...transferData, targetBranch: e.target.value})}
            >
              <option value="">Seleccionar sucursal...</option>
              {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
            <input 
              type="number" 
              className="input-industrial py-3 text-xs" 
              placeholder="Cantidad"
              value={transferData.quantity}
              onChange={e => setTransferData({...transferData, quantity: parseInt(e.target.value) || 1})}
            />
            <button onClick={handleTransfer} disabled={isTransferring} className="w-full btn-primary py-4 text-xs font-black uppercase flex items-center justify-center gap-2">
              <ArrowRightLeft className="w-4 h-4" />
              {isTransferring ? 'Transferiendo...' : 'Transferir'}
            </button>
            <button onClick={() => setShowTransferModal(false)} className="w-full text-slate-500 text-xs">Cancelar</button>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest max-w-md w-full rounded-2xl p-6 border border-white/10 space-y-4">
            <h3 className="text-primary font-black uppercase text-xs tracking-widest border-b border-white/5 pb-2">
              Importar desde CSV
            </h3>
            
            <div className="space-y-2">
              <p className="text-xs text-slate-500">Sube un archivo CSV con el siguiente formato:</p>
              <div className="bg-surface-container-high p-3 rounded-lg text-[10px] font-mono text-slate-400 overflow-x-auto">
                sku,nombre,marca,cantidad,precio,costo<br/>
                RIN001,Rin 15",Fox,10,1200,800<br/>
                LLAN205,Michelin 205/R16,Michelin,20,2500,1800
              </div>
            </div>

            <input
              ref={importFileRef}
              type="file"
              accept=".csv"
              onChange={handleImportCSV}
              className="hidden"
            />
            
            <button 
              onClick={() => importFileRef.current?.click()}
              disabled={importing}
              className="w-full btn-primary py-4 text-xs font-black uppercase flex items-center justify-center gap-2"
            >
              {importing ? (
                <LoadingTire size="sm" />
              ) : (
                <>
                  <Upload className="w-4 h-4" /> Seleccionar CSV
                </>
              )}
            </button>

            {importResults && (
              <div className={`p-4 rounded-lg ${importResults.errors?.length > 0 ? 'bg-amber-500/20' : 'bg-emerald-500/20'}`}>
                <p className="text-sm font-bold">{importResults.success} productos importados</p>
                {importResults.errors?.length > 0 && (
                  <p className="text-xs text-amber-400 mt-2">{importResults.errors.length} errores</p>
                )}
              </div>
            )}

            <button onClick={() => setShowImportModal(false)} className="w-full text-slate-500 text-xs">Cerrar</button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sticky top-0 bg-background/50 backdrop-blur-md py-4 z-10 border-b border-white/10">
        <div>
          <h2 className="text-2xl font-headline font-black text-on-surface uppercase">Almacenes</h2>
          <p className="text-slate-400 text-[10px] uppercase font-black">InventarioCentral</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <button 
            onClick={() => { setSkuScanMode(true); setTimeout(() => skuInputRef.current?.focus(), 100) }}
            className="btn-primary px-4 py-2 text-xs font-black uppercase flex items-center justify-center gap-2"
          >
            <QrCode className="w-4 h-4" /> Escanear
          </button>
          <button 
            onClick={() => { setSelectedProducts([]); setShowLabelsModal(true) }}
            className="btn-primary px-4 py-2 text-xs font-black uppercase flex items-center justify-center gap-2"
          >
            <Barcode className="w-4 h-4" /> Etiquetas
          </button>
          <button 
            onClick={() => setShowReportModal(true)}
            className="btn-primary px-4 py-2 text-xs font-black uppercase flex items-center justify-center gap-2"
          >
            <FileText className="w-4 h-4" /> Reporte
          </button>
          <button 
            onClick={() => { setImportResults(null); setShowImportModal(true) }}
            className="btn-primary px-4 py-2 text-xs font-black uppercase flex items-center justify-center gap-2"
          >
            <Upload className="w-4 h-4" /> Importar
          </button>
          <input className="input-industrial px-4 py-2 text-xs w-full sm:w-48" placeholder="Buscar..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          <button onClick={openAddModal} className="btn-primary px-4 py-2 text-xs font-black uppercase flex items-center justify-center gap-2">
            <Plus className="w-4 h-4" /> Agregar
          </button>
        </div>
      </header>

      {/* Warehouse Tabs - Premium Design for Mixed Branch */}
      {isMixedBranch(activeBranch) ? (
        <div className="space-y-4">
          {/* Mixed Branch Header */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-white/10 p-6">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-amber-500/10 via-transparent to-transparent"></div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl"></div>
            <div className="relative flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-[10px] font-black uppercase tracking-wider rounded">Mixto</span>
                </div>
                <h3 className="text-lg font-headline font-bold text-white">{activeBranch}</h3>
                <p className="text-slate-400 text-xs">Llantas + Rines</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">Total Inventario</p>
                <p className="text-3xl font-headline text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-blue-400">
                  {rinesProducts.length + llantasProducts.length}
                </p>
              </div>
            </div>
          </div>

          {/* Dual Pane Selector */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setMixedView('rines')}
              className={`relative overflow-hidden rounded-xl p-4 transition-all duration-300 group ${
                mixedView === 'rines' 
                  ? 'bg-blue-500/20 border-2 border-blue-500 shadow-lg shadow-blue-500/20' 
                  : 'bg-slate-800/50 border-2 border-transparent hover:border-white/10'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${mixedView === 'rines' ? 'bg-blue-500' : 'bg-slate-700'}`}>
                  <CircleDot className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold uppercase text-white">Rines</p>
                  <p className="text-[10px] text-slate-400">{rinesProducts.length} items</p>
                </div>
              </div>
              {mixedView === 'rines' && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-500"></div>
              )}
            </button>

            <button
              onClick={() => setMixedView('llantas')}
              className={`relative overflow-hidden rounded-xl p-4 transition-all duration-300 group ${
                mixedView === 'llantas' 
                  ? 'bg-amber-500/20 border-2 border-amber-500 shadow-lg shadow-amber-500/20' 
                  : 'bg-slate-800/50 border-2 border-transparent hover:border-white/10'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${mixedView === 'llantas' ? 'bg-amber-500' : 'bg-slate-700'}`}>
                  <Package className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold uppercase text-white">Llantas</p>
                  <p className="text-[10px] text-slate-400">{llantasProducts.length} items</p>
                </div>
              </div>
              {mixedView === 'llantas' && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-amber-500"></div>
              )}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          {WAREHOUSES.map(wh => {
            const Icon = wh.icon
            return (
              <button
                key={wh.id}
                onClick={() => setSelectedWarehouse(wh.id)}
                className={`flex-1 surface-workbench p-4 rounded-xl border transition-all ${
                  selectedWarehouse === wh.id 
                    ? 'border-primary shadow-lg shadow-primary/10' 
                    : 'border-white/5 hover:border-white/20'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-6 h-6 ${wh.color}`} />
                  <div className="text-left">
                    <p className="text-sm font-bold uppercase">{wh.name}</p>
                    <p className="text-[10px] text-slate-500">
                      {allProducts.filter(p => p.warehouse === wh.id).length} items
                    </p>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* Current Warehouse Info */}
      <div className="surface-workbench p-4 rounded-xl border border-white/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Warehouse className={`w-5 h-5 ${isMixedBranch(activeBranch) ? (mixedView === 'rines' ? 'text-blue-400' : 'text-amber-400') : currentWarehouse?.color}`} />
            <span className="text-sm font-bold uppercase">
              {isMixedBranch(activeBranch) ? (mixedView === 'rines' ? 'Rines' : 'Llantas') : currentWarehouse?.name}
            </span>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-slate-500">TOTAL ITEMS</p>
            <p className="text-xl font-headline text-primary">{filtered.length}</p>
          </div>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="surface-workbench rounded-2xl border border-white/5 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p className="text-xs">No hay productos en {currentWarehouse?.name}</p>
          </div>
        ) : (
          <table className="hidden md:table w-full text-left">
            <thead>
              <tr className="bg-surface-container-high/50 text-slate-500 text-[10px] uppercase font-black tracking-widest">
                <th className="px-4 py-4">Img</th>
                <th className="px-4 py-4">Producto / SKU</th>
                <th className="px-4 py-4 text-right">Stock</th>
                <th className="px-4 py-4 text-right">Precio</th>
                <th className="px-4 py-4 text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map(p => (
                <tr key={p.id} className="hover:bg-white/5">
                  <td className="px-4 py-3">
                    {p.img && p.img.startsWith('data:') ? (
                      <img src={p.img} alt={p.name} className="w-10 h-10 object-cover rounded-lg" />
                    ) : p.img ? (
                      <div className="w-10 h-10 bg-surface-container-high rounded-lg flex items-center justify-center relative group cursor-pointer"
                        onClick={() => window.open(p.img, '_blank')} title={p.img}>
                        <Image className="w-5 h-5 text-slate-500" />
                        <span className="absolute inset-0 flex items-center justify-center bg-black/60 text-[7px] text-white opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">Ver</span>
                      </div>
                    ) : (
                      <div className="w-10 h-10 bg-surface-container-high rounded-lg flex items-center justify-center">
                        <Image className="w-5 h-5 text-slate-500" />
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-bold">{p.name}</p>
                    <p className="text-xs text-slate-500">{p.brand}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <Barcode className="w-3 h-3 text-slate-500" />
                      <span className="text-[10px] font-mono text-primary">{p.sku || 'Sin SKU'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`text-sm font-bold ${p.qty <= 5 ? 'text-error' : 'text-primary'}`}>{p.qty}</span>
                  </td>
                  <td className="px-4 py-3 text-right text-primary font-bold">${(p.price || 0).toFixed(2)}</td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button 
                        onClick={() => { setSelectedProduct(p); setShowTransferModal(true) }}
                        className="btn-primary px-3 py-2 text-xs flex items-center gap-1"
                        title="Transferir"
                      >
                        <ArrowRightLeft className="w-3 h-3" />
                      </button>
                      {isAdmin && (
                        <>
                          <button 
                            onClick={() => handleEditProduct(p)}
                            className="p-2 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDeleteProduct(p)}
                            className="p-2 bg-error/20 text-error hover:bg-error/30 rounded-lg transition-colors"
                            title="Eliminar"
                          >
                            <Trash className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Mobile */}
        <div className="md:hidden divide-y divide-white/5">
          {filtered.map(p => (
            <div key={p.id} className="p-4 flex gap-3">
              {p.img && p.img.startsWith('data:') ? (
                <img src={p.img} alt={p.name} className="w-16 h-16 object-cover rounded-lg shrink-0" />
              ) : p.img ? (
                <div className="w-16 h-16 bg-surface-container-high rounded-lg flex items-center justify-center shrink-0 relative group cursor-pointer"
                  onClick={() => window.open(p.img, '_blank')} title={p.img}>
                  <Image className="w-6 h-6 text-slate-500" />
                  <span className="absolute inset-0 flex items-center justify-center bg-black/60 text-[7px] text-white opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">Ver</span>
                </div>
              ) : (
                <div className="w-16 h-16 bg-surface-container-high rounded-lg flex items-center justify-center shrink-0">
                  <Image className="w-6 h-6 text-slate-500" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold truncate">{p.name}</p>
                <p className="text-[10px] text-slate-500">{p.brand}</p>
                <p className="text-[10px] font-mono text-primary">{p.sku}</p>
                <p className="text-[10px] text-primary">${p.price} x{p.qty}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold">{p.qty}</span>
                <button 
                  onClick={() => { setSelectedProduct(p); setShowTransferModal(true) }}
                  className="bg-primary/20 text-primary p-2 rounded"
                >
                  <ArrowRightLeft className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-high border border-white/10 rounded-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-headline font-bold">Editar Producto</h3>
              <button onClick={() => setShowEditModal(false)} className="p-2 hover:bg-white/10 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              {/* Imagen */}
              <div>
                <label className="text-xs text-slate-500 uppercase font-black mb-2 block">Imagen</label>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-xl bg-surface-container-high border border-white/10 overflow-hidden flex items-center justify-center shrink-0">
                    {editImagePreview ? (
                      <img src={editImagePreview} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <Image className="w-8 h-8 text-slate-500" />
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <input
                      type="file"
                      accept="image/*"
                      ref={editImageInputRef}
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files[0]
                        if (file) {
                          try {
                            const compressed = await compressImage(file)
                            setEditImageFile(compressed)
                            const reader = new FileReader()
                            reader.onloadend = () => setEditImagePreview(reader.result)
                            reader.readAsDataURL(compressed)
                          } catch (err) {
                            console.error('Error al comprimir imagen:', err)
                            setEditImageFile(file)
                            const reader = new FileReader()
                            reader.onloadend = () => setEditImagePreview(reader.result)
                            reader.readAsDataURL(file)
                          }
                        }
                      }}
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setCameraMode('edit')}
                        className="btn-primary py-2 px-3 text-xs flex items-center gap-1"
                      >
                        <Camera className="w-3 h-3" />
                        Tomar foto
                      </button>
                      <button
                        type="button"
                        onClick={() => editImageInputRef.current?.click()}
                        className="btn-primary py-2 px-3 text-xs flex items-center gap-1"
                      >
                        <Upload className="w-3 h-3" />
                        {editImagePreview ? 'Cambiar' : 'Subir'}
                      </button>
                    </div>
                    {editImagePreview && (
                      <button
                        type="button"
                        onClick={() => { setEditImageFile(null); setEditImagePreview(null) }}
                        className="text-error text-xs hover:underline"
                      >
                        Quitar imagen
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-500 uppercase font-black">Nombre</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={e => setEditForm({...editForm, name: e.target.value})}
                  className="input-industrial w-full"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 uppercase font-black">Marca</label>
                <input
                  type="text"
                  value={editForm.brand}
                  onChange={e => setEditForm({...editForm, brand: e.target.value})}
                  className="input-industrial w-full"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 uppercase font-black">Condición</label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setEditForm({...editForm, condicion: 'nueva'})} className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${editForm.condicion === 'nueva' ? 'bg-emerald-500 text-black shadow-md' : 'bg-white/5 text-slate-500 hover:text-slate-300'}`}>Nueva</button>
                  <button type="button" onClick={() => setEditForm({...editForm, condicion: 'medio_uso'})} className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${editForm.condicion === 'medio_uso' ? 'bg-amber-500 text-black shadow-md' : 'bg-white/5 text-slate-500 hover:text-slate-300'}`}>Medio Uso</button>
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-500 uppercase font-black">Ubicación</label>
                <input
                  type="text"
                  value={editForm.ubicacion || ''}
                  onChange={e => setEditForm({...editForm, ubicacion: e.target.value})}
                  className="input-industrial w-full"
                  placeholder="Pasillo, rack, etc."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-500 uppercase font-black">Precio</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editForm.price}
                    onChange={e => setEditForm({...editForm, price: e.target.value})}
                    className="input-industrial w-full"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 uppercase font-black">Costo</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editForm.cost}
                    onChange={e => setEditForm({...editForm, cost: e.target.value})}
                    className="input-industrial w-full"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-500 uppercase font-black">Cantidad</label>
                  <input
                    type="number"
                    value={editForm.qty}
                    onChange={e => setEditForm({...editForm, qty: e.target.value})}
                    className="input-industrial w-full"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 uppercase font-black">SKU</label>
                  <input
                    type="text"
                    value={editForm.sku}
                    onChange={e => setEditForm({...editForm, sku: e.target.value})}
                    className="input-industrial w-full"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowEditModal(false)} className="flex-1 btn-secondary py-3">
                Cancelar
              </button>
              <button onClick={handleSaveEdit} className="flex-1 btn-primary py-3">
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-high border border-error/30 rounded-2xl w-full max-w-sm p-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-error/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash className="w-8 h-8 text-error" />
              </div>
              <h3 className="text-lg font-headline font-bold mb-2">Confirmar Eliminación</h3>
              <p className="text-slate-400 text-sm mb-6">
                ¿Estás seguro de eliminar <span className="text-white font-bold">{deletingProduct?.name}</span>? Esta acción no se puede deshacer.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 btn-secondary py-3">
                  Cancelar
                </button>
                <button onClick={confirmDelete} className="flex-1 bg-error text-white py-3 rounded-xl font-bold uppercase text-sm hover:bg-error/80 transition-colors">
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {cameraMode && (
        <CameraCapture
          onCapture={(blob) => handleCameraCapture(blob, cameraMode)}
          onClose={() => setCameraMode(null)}
        />
      )}
    </div>
  )
}

export default Warehouses