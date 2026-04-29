import React, { useState, useEffect } from 'react'
import { fetchData, postData, db, storage } from '../services/api'
import { doc, runTransaction, getDoc, collection } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'

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

  const BRANCHES = ['Rojo Gomez', 'Morelos', 'Bacalar']

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
    if (!newProduct.name || !newProduct.price || !newProduct.qty) return alert('Campos obligatorios: Nombre, Precio y Cantidad.')
    setIsSaving(true)
    try {
      let imageUrl = 'https://images.unsplash.com/photo-1549441412-10d5b746a48d?q=80&w=200'
      if (imageFile) {
        const storageRef = ref(storage, `products/${Date.now()}_${imageFile.name}`)
        const snapshot = await uploadBytes(storageRef, imageFile)
        imageUrl = await getDownloadURL(snapshot.ref)
      }

      const productData = {
        ...newProduct,
        price: parseFloat(newProduct.price),
        cost: parseFloat(newProduct.cost || 0),
        qty: parseInt(newProduct.qty),
        sku: newProduct.sku || `SKU-${Date.now().toString().slice(-4)}`,
        img: imageUrl,
        branch: activeBranch,
        timestamp: new Date().getTime()
      }
      const res = await postData('Inventario', productData)
      if (res.success) {
        setShowAddModal(false)
        setNewProduct({ name: '', brand: '', price: '', cost: '', qty: '', sku: '', img: '' })
        const data = await fetchData('Inventario', activeBranch)
        if (Array.isArray(data)) setProducts(data)
      }
    } catch (e) { alert('Error al guardar') } 
    finally { setIsSaving(false) }
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

      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sticky top-0 bg-background/50 backdrop-blur-md py-4 z-10 border-b border-white/10">
        <div>
          <h2 className="text-2xl lg:text-3xl font-headline font-black text-on-surface uppercase">Inventario</h2>
          <p className="text-slate-400 text-xs">Consulta y Traspasos en <span className="text-primary font-bold">{activeBranch}</span></p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <input className="input-industrial px-4 py-2 text-xs w-full sm:w-64" placeholder="Buscar llanta o SKU..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          <button onClick={() => setShowAddModal(true)} className="btn-primary px-6 py-2 text-xs font-black uppercase flex items-center justify-center gap-2">Nuevo <span className="material-symbols-outlined text-[18px]">add</span></button>
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
                <th className="px-6 py-4 text-center">Traspaso</th>
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
                    <button onClick={() => { setSelectedProduct(p); setShowTransferModal(true); }} className="w-10 h-10 rounded-full border border-white/5 flex items-center justify-center text-slate-500 hover:text-primary transition-all mx-auto"><span className="material-symbols-outlined text-[20px]">swap_horiz</span></button>
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
                   <button onClick={() => { setSelectedProduct(p); setShowTransferModal(true); }} className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center text-primary active:bg-primary/20 shrink-0">
                      <span className="material-symbols-outlined text-[20px]">move_up</span>
                   </button>
                </div>
             ))}
          </div>
          {filtered.length === 0 && <div className="py-20 text-center opacity-20 font-black tracking-widest text-sm italic uppercase">Sin resultados</div>}
        </div>
      </div>
    </div>
  )
}

export default Inventory
