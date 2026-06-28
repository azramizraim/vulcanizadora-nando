import React, { useState, useEffect } from 'react'
import { postData, deleteData } from '../services/api'
import { supabase, TABLES } from '../supabase'
import { Plus, Trash2, X, Edit } from 'lucide-react'

// Hash function for passwords
async function hashPassword(password) {
  const encoder = new TextEncoder()
  const data = encoder.encode(password + 'vulcanizadora-salt-2024')
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

function UsersManagement({ activeBranch, isAdmin }) {
  const [users, setUsers] = useState([])
  const [branches] = useState(['Rojo Gomez', 'Morelos', 'Bacalar'])
  const [showForm, setShowForm] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [formData, setFormData] = useState({
    email: '',
    role: 'vendedor',
    branch: 'Rojo Gomez',
    password: ''
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => { loadUsers() }, [])

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase.from(TABLES.USUARIOS).select('*')
      if (error) { console.error('Error:', error); return }
      setUsers(data || [])
    } catch (e) { console.error(e) }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!isAdmin) return alert('Solo admins')
    if (!formData.email || !formData.branch || !formData.password) return alert('Falta email, password o sucursal')
    
    setLoading(true)
    try {
      const { data: existingUser } = await supabase
        .from(TABLES.USUARIOS)
        .select('id, email')
        .eq('email', formData.email)
        .single()
      
      if (existingUser) {
        alert('Este email ya existe. Usa la opción de editar para cambiar la password.')
        setLoading(false)
        return
      }
      
      const newId = formData.email.replace('@', '-at-').replace('.', '-')
      const hashedPassword = await hashPassword(formData.password)
      
      const { error } = await supabase
        .from(TABLES.USUARIOS)
        .insert([{ id: newId, email: formData.email, role: formData.role, branch: formData.branch, password: hashedPassword }])
      
      if (error) { alert('Error: ' + error.message) }
      else {
        alert('Usuario creado exitosamente')
        setShowForm(false)
        setFormData({ email: '', role: 'vendedor', branch: 'Rojo Gomez', password: '' })
        loadUsers()
      }
    } catch (err) { console.error(err); alert('Error') }
    setLoading(false)
  }

  const handleEditClick = (user) => {
    if (!isAdmin) return
    setEditingUser(user)
    setFormData({
      email: user.email,
      role: user.role,
      branch: user.branch,
      password: ''
    })
  }

const handleUpdatePassword = async (e) => {
    e.preventDefault()
    if (!isAdmin) return alert('Solo admins')
    if (!formData.password) return alert('Nueva password requerida')
    
    setLoading(true)
    try {
      // Hash the password before saving
      const hashedPassword = await hashPassword(formData.password)
      
      // Use REST API directly to avoid issues
      const supabaseUrl = 'https://tcixwdrtfhfzjaznvobz.supabase.co'
      const supabaseKey = 'sb_publishable_42UM7h88bSsQkcuRUNeEfg_kjRx_BoJ'
      
      // Find user ID first
      const userResponse = await fetch(
        `${supabaseUrl}/rest/v1/usuarios?email=eq.${encodeURIComponent(formData.email)}`,
        {
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`
          }
        }
      )
      
      const userData = await userResponse.json()
      
      if (!userData || userData.length === 0) {
        alert('Usuario no encontrado')
        setLoading(false)
        return
      }
      
      const userId = userData[0].id
      
      // Update password using REST API with hash
      const updateResponse = await fetch(
        `${supabaseUrl}/rest/v1/usuarios?id=eq.${userId}`,
        {
          method: 'PATCH',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({ password: hashedPassword })
        }
      )
      
      if (!updateResponse.ok) {
        const errorText = await updateResponse.text()
        throw new Error(errorText)
      }
      
      alert('✅ Password actualizado correctamente\n\nUsuario: ' + formData.email + '\nNueva contraseña guardada con seguridad hash.')
      loadUsers()
      
      setEditingUser(null)
      setFormData({ email: '', role: 'vendedor', branch: 'Rojo Gomez', password: '' })
    } catch (err) {
      alert('Error: ' + err.message) 
    }
    setLoading(false)
  }

  const handleDeleteUser = async (userId, userEmail) => {
    if (!isAdmin) return
    if (window.confirm(`¿Eliminar ${userEmail}?`)) {
      try {
        await deleteData('Usuarios', userId)
        alert('Usuario eliminado')
        loadUsers()
      } catch (e) { alert('Error al eliminar') }
    }
  }

  return (
    <div className="p-4 lg:p-6">
      <div className="mb-8 md:mb-12">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h2 className="text-3xl md:text-4xl font-black text-on-surface uppercase tracking-tight mb-2">
              Gestión de <span className="text-primary">Usuarios</span>
            </h2>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Administra vendedores y personal</p>
          </div>
          {isAdmin && (
            <button onClick={() => { setShowForm(true); setEditingUser(null); setFormData({ email: '', role: 'vendedor', branch: 'Rojo Gomez', password: '' }) }}
              className="bg-primary text-on-primary px-6 py-3 rounded-2xl text-[11px] font-bold uppercase tracking-wider hover:bg-primary-dim">
              <span className="material-symbols-outlined text-sm mr-2">person_add</span>
              Nuevo Usuario
            </button>
          )}
        </div>
      </div>

      <div className="bg-surface-container-low rounded-3xl border border-white/5 overflow-hidden">
        <table className="w-full">
          <thead className="bg-surface-container border-b border-white/5">
            <tr>
              <th className="text-left text-[10px] font-bold uppercase text-slate-500 px-6 py-4">Usuario</th>
              <th className="text-left text-[10px] font-bold uppercase text-slate-500 px-6 py-4">Rol</th>
              <th className="text-left text-[10px] font-bold uppercase text-slate-500 px-6 py-4">Sucursal</th>
              <th className="text-right text-[10px] font-bold uppercase text-slate-500 px-6 py-4">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {users.map(user => (
              <tr key={user.id} className="hover:bg-white/[0.02]">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                      <span className="text-primary font-bold">{user.email?.charAt(0).toUpperCase()}</span>
                    </div>
                    <p className="font-medium">{user.email}</p>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-bold ${user.role === 'admin' ? 'bg-primary/20 text-primary' : 'bg-slate-700 text-slate-300'}`}>
                    {user.role}
                  </span>
                </td>
                <td className="px-6 py-4 text-slate-400">{user.branch}</td>
                <td className="px-6 py-4 text-right">
                  {isAdmin && (
                    <button onClick={() => handleEditClick(user)} className="p-2 hover:bg-primary/20 rounded-lg mr-2">
                      <Edit className="w-4 h-4 text-primary" />
                    </button>
                  )}
                  <button onClick={() => handleDeleteUser(user.id, user.email)} className="p-2 hover:bg-error/20 rounded-lg">
                    <Trash2 className="w-4 h-4 text-error" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal Crear Usuario */}
      {showForm && !editingUser && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-container rounded-3xl border border-white/10 p-6 md:p-8 w-full max-w-md">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">Nuevo Usuario</h3>
              <button onClick={() => setShowForm(false)} className="p-2 hover:bg-white/10 rounded-lg">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] text-slate-500 font-bold uppercase mb-2">Email *</label>
                <input type="email" name="email" value={formData.email} onChange={handleInputChange}
                  className="w-full bg-surface-container-low border border-white/10 rounded-xl px-4 py-3" required />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 font-bold uppercase mb-2">Password *</label>
                <input type="password" name="password" value={formData.password} onChange={handleInputChange}
                  className="w-full bg-surface-container-low border border-white/10 rounded-xl px-4 py-3" required minLength={4} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] text-slate-500 font-bold uppercase mb-2">Rol *</label>
                  <select name="role" value={formData.role} onChange={handleInputChange}
                    className="w-full bg-surface-container-low border border-white/10 rounded-xl px-4 py-3">
                    <option value="vendedor">Vendedor</option>
                    <option value="staff">Staff</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 font-bold uppercase mb-2">Sucursal *</label>
                  <select name="branch" value={formData.branch} onChange={handleInputChange}
                    className="w-full bg-surface-container-low border border-white/10 rounded-xl px-4 py-3">
                    {branches.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 py-3 rounded-xl border border-white/10 text-slate-400 text-[11px] font-bold">Cancelar</button>
                <button type="submit" disabled={loading}
                  className="flex-1 py-3 rounded-xl bg-primary text-on-primary text-[11px] font-bold disabled:opacity-50">
                  {loading ? 'Creando...' : 'Crear Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar Usuario - Solo password */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-container rounded-3xl border border-white/10 p-6 md:p-8 w-full max-w-md">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">Editar Password</h3>
              <button onClick={() => setEditingUser(null)} className="p-2 hover:bg-white/10 rounded-lg">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div className="mb-4 p-4 bg-primary/10 rounded-xl">
              <p className="text-sm text-slate-400">Usuario:</p>
              <p className="font-bold text-primary">{editingUser.email}</p>
              <p className="text-sm text-slate-400 mt-2">Rol: <span className="text-white">{editingUser.role}</span></p>
              <p className="text-sm text-slate-400">Sucursal: <span className="text-white">{editingUser.branch}</span></p>
            </div>
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div>
                <label className="block text-[10px] text-slate-500 font-bold uppercase mb-2">Nueva Password *</label>
                <input type="password" name="password" value={formData.password} onChange={handleInputChange}
                  className="w-full bg-surface-container-low border border-white/10 rounded-xl px-4 py-3" required minLength={4} 
                  placeholder="Ingresa nueva password" />
              </div>
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setEditingUser(null)}
                  className="flex-1 py-3 rounded-xl border border-white/10 text-slate-400 text-[11px] font-bold">Cancelar</button>
                <button type="submit" disabled={loading}
                  className="flex-1 py-3 rounded-xl bg-primary text-on-primary text-[11px] font-bold disabled:opacity-50">
                  {loading ? 'Guardando...' : 'Guardar Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default UsersManagement