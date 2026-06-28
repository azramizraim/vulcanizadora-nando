import React, { useState, useEffect } from 'react'
import { fetchData, postData, updateData, deleteData, uploadImage } from '../services/api'

function ServicesManagement({ activeBranch, isAdmin }) {
  const [services, setServices] = useState([])
  const [editingService, setEditingService] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    img: '',
    isService: true,
    branch: activeBranch
  })

  useEffect(() => {
    loadServices()
  }, [activeBranch])

  const loadServices = async () => {
    const data = await fetchData('Servicios', activeBranch)
    setServices(Array.isArray(data) ? data : [])
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleImageChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const result = await uploadImage(file)
    if (result.success) {
      setFormData(prev => ({ ...prev, img: result.url }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const serviceData = {
        name: formData.name,
        price: parseFloat(formData.price),
        branch: activeBranch
      }
      if (formData.img) {
        serviceData.img = formData.img
      }
      let result
      if (editingService) {
        result = await updateData('Servicios', editingService.id, serviceData)
      } else {
        result = await postData('Servicios', serviceData)
      }
      if (result.success) {
        alert('Servicio guardado correctamente')
        setShowForm(false)
        setFormData({ name: '', price: '', img: '', isService: true, branch: activeBranch })
        setEditingService(null)
        loadServices()
      } else {
        alert('Error al guardar el servicio')
      }
    } catch (error) {
      console.error(error)
      alert('Error al guardar')
    }
  }

  const handleEdit = (service) => {
    setEditingService(service)
    setFormData({
      name: service.name || '',
      price: service.price?.toString() || '',
      img: service.img || '',
      isService: true,
      branch: service.branch || activeBranch
    })
    setShowForm(true)
  }

  const handleDelete = async (serviceId) => {
    if (!isAdmin) {
      alert('Solo los administradores pueden eliminar servicios')
      return
    }
    if (window.confirm('¿Estás seguro de eliminar este servicio?')) {
      try {
        const res = await deleteData('Servicios', serviceId)
        if (res.success) {
          loadServices()
        } else {
          alert('Error al eliminar el servicio')
        }
      } catch (err) {
        console.error(err)
        alert('Error al eliminar')
      }
    }
  }

  return (
    <div className="p-4 lg:p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-black text-on-surface uppercase tracking-tight">Gestión de Servicios</h2>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Administra los servicios disponibles</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => {
              setEditingService(null)
              setFormData({ name: '', price: '', img: '', isService: true, branch: activeBranch })
              setShowForm(true)
            }}
            className="btn-primary px-5 py-2.5 rounded-xl text-[11px]"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            Nuevo Servicio
          </button>
        )}
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {services.map((service) => (
          <div key={service.id || service.sku} className="bg-surface-container-low rounded-2xl border border-white/5 p-4 hover:border-primary/40 transition-all">
            <div className="aspect-square bg-surface-container p-4 rounded-xl mb-3 flex items-center justify-center">
              {service.img ? (
                <img src={service.img} alt={service.name} className="w-full h-full object-contain" />
              ) : (
                <span className="material-symbols-outlined text-5xl text-slate-600">build</span>
              )}
            </div>
            <h3 className="text-sm font-bold text-on-surface uppercase truncate mb-1">{service.name}</h3>
            <p className="text-lg font-black text-primary mb-3">${parseFloat(service.price).toFixed(2)}</p>
            
            {isAdmin && (
              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(service)}
                  className="flex-1 py-2 rounded-lg bg-blue-500/20 text-blue-400 text-[10px] font-bold uppercase tracking-wider hover:bg-blue-500/30 transition-all"
                >
                  <span className="material-symbols-outlined text-sm">edit</span>
                  Editar
                </button>
                <button
                  onClick={() => handleDelete(service.id)}
                  className="flex-1 py-2 rounded-lg bg-red-500/20 text-red-400 text-[10px] font-bold uppercase tracking-wider hover:bg-red-500/30 transition-all"
                >
                  <span className="material-symbols-outlined text-sm">delete</span>
                  Eliminar
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {services.length === 0 && (
        <div className="text-center py-12 text-slate-500">
          <span className="material-symbols-outlined text-5xl mb-3 block">construction</span>
          <p className="uppercase font-bold text-[10px] tracking-wider">No hay servicios registrados</p>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center backdrop-blur-md p-4">
          <div className="bg-surface max-w-md w-full rounded-2xl p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-on-surface mb-4">
              {editingService ? 'Editar Servicio' : 'Nuevo Servicio'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Nombre del Servicio</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full bg-surface-container-low border border-white/10 rounded-lg px-4 py-2.5 text-sm text-on-surface focus:outline-none focus:border-primary/50"
                  placeholder="Ej. Reparación de llanta"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Precio</label>
                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleInputChange}
                  className="w-full bg-surface-container-low border border-white/10 rounded-lg px-4 py-2.5 text-sm text-on-surface focus:outline-none focus:border-primary/50"
                  placeholder="150"
                  min="0"
                  step="0.01"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Imagen</label>
                <div className="flex items-center gap-3">
                  <label className="flex-1 flex items-center gap-2 bg-surface-container-low border border-white/10 rounded-lg px-4 py-2.5 text-sm text-slate-400 cursor-pointer hover:border-primary/50 transition-all">
                    <span className="material-symbols-outlined text-sm">add_photo_alternate</span>
                    {formData.img ? 'Cambiar imagen' : 'Seleccionar foto'}
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </label>
                  {formData.img && (
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, img: '' }))}
                      className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-all"
                    >
                      <span className="material-symbols-outlined text-sm">close</span>
                    </button>
                  )}
                </div>
                {formData.img && (
                  <div className="mt-2 rounded-lg overflow-hidden border border-white/10">
                    <img src={formData.img} alt="Preview" className="w-full h-32 object-cover" />
                  </div>
                )}
                <p className="text-[9px] text-slate-500 mt-1">Toma una foto o selecciona una de tu dispositivo</p>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false)
                    setEditingService(null)
                  }}
                  className="flex-1 py-2.5 rounded-lg border border-white/10 text-slate-400 text-[11px] font-bold uppercase tracking-wider hover:bg-white/5 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-lg bg-primary text-on-primary text-[11px] font-bold uppercase tracking-wider hover:bg-primary-dim transition-all"
                >
                  {editingService ? 'Actualizar' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default ServicesManagement;
