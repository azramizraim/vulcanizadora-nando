import { supabase, TABLES, BRANCHES } from '../supabase'
import { supabase as supabaseClient } from '../supabase'

export { BRANCHES }

// ==================== INVENTARIO ====================
export const fetchInventory = async (branchName) => {
  console.log(`[Supabase API] Fetch inventario for '${branchName}'`)
  try {
    if (!branchName) return []
    
    const { data, error } = await supabase
      .from(TABLES.INVENTARIO)
      .select('*')
      .eq('branch', branchName)
    
    if (error) {
      console.error('[Supabase API Error] fetchInventory:', error)
      return []
    }
    
    console.log(`[Supabase API] Success inventario items: ${data?.length || 0}`)
    return data || []
  } catch (err) {
    console.error('[Supabase API Error] fetchInventory:', err)
    return []
  }
}

export const addProduct = async (productData) => {
  try {
    const { data, error } = await supabase
      .from(TABLES.INVENTARIO)
      .insert([productData])
      .select()
    
    if (error) {
      console.error('[Supabase API Error] addProduct:', error)
      return { success: false }
    }
    
    return { success: true, data: data?.[0] }
  } catch (err) {
    console.error('[Supabase API Error] addProduct:', err)
    return { success: false }
  }
}

export const updateProductQty = async (productId, newQty) => {
  try {
    const { error } = await supabase
      .from(TABLES.INVENTARIO)
      .update({ qty: newQty, updated_at: new Date().toISOString() })
      .eq('id', productId)
    
    if (error) {
      console.error('[Supabase API Error] updateProductQty:', error)
      return { success: false }
    }
    
    return { success: true }
  } catch (err) {
    console.error('[Supabase API Error] updateProductQty:', err)
    return { success: false }
  }
}

export const deleteProduct = async (productId) => {
  try {
    const { error } = await supabase
      .from(TABLES.INVENTARIO)
      .delete()
      .eq('id', productId)
    
    if (error) {
      console.error('[Supabase API Error] deleteProduct:', error)
      return { success: false }
    }
    
    return { success: true }
  } catch (err) {
    console.error('[Supabase API Error] deleteProduct:', err)
    return { success: false }
  }
}

// ==================== CLIENTES ====================
export const fetchClientes = async (branchName) => {
  try {
    if (!branchName) return []
    
    const { data, error } = await supabase
      .from(TABLES.CLIENTES)
      .select('*')
      .eq('branch', branchName)
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('[Supabase API Error] fetchClientes:', error)
      return []
    }
    
    return data || []
  } catch (err) {
    console.error('[Supabase API Error] fetchClientes:', err)
    return []
  }
}

export const addCliente = async (clienteData) => {
  try {
    const { data, error } = await supabase
      .from(TABLES.CLIENTES)
      .insert([clienteData])
      .select()
    
    if (error) {
      console.error('[Supabase API Error] addCliente:', error)
      return { success: false }
    }
    
    return { success: true, data: data?.[0] }
  } catch (err) {
    console.error('[Supabase API Error] addCliente:', err)
    return { success: false }
  }
}

export const updateCliente = async (clienteId, clienteData) => {
  try {
    const { error } = await supabase
      .from(TABLES.CLIENTES)
      .update({ ...clienteData, updated_at: new Date().toISOString() })
      .eq('id', clienteId)
    
    if (error) {
      console.error('[Supabase API Error] updateCliente:', error)
      return { success: false }
    }
    
    return { success: true }
  } catch (err) {
    console.error('[Supabase API Error] updateCliente:', err)
    return { success: false }
  }
}

export const deleteCliente = async (clienteId) => {
  try {
    const { error } = await supabase
      .from(TABLES.CLIENTES)
      .delete()
      .eq('id', clienteId)
    
    if (error) {
      console.error('[Supabase API Error] deleteCliente:', error)
      return { success: false }
    }
    
    return { success: true }
  } catch (err) {
    console.error('[Supabase API Error] deleteCliente:', err)
    return { success: false }
  }
}

// ==================== COTIZACIONES ====================
export const fetchCotizaciones = async (branchName) => {
  try {
    if (!branchName) return []
    
    const { data, error } = await supabase
      .from(TABLES.COTIZACIONES)
      .select('*')
      .eq('branch', branchName)
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('[Supabase API Error] fetchCotizaciones:', error)
      return []
    }
    
    return data || []
  } catch (err) {
    console.error('[Supabase API Error] fetchCotizaciones:', err)
    return []
  }
}

export const addCotizacion = async (cotizacionData) => {
  try {
    const { data, error } = await supabase
      .from(TABLES.COTIZACIONES)
      .insert([cotizacionData])
      .select()
    
    if (error) {
      console.error('[Supabase API Error] addCotizacion:', error)
      return { success: false }
    }
    
    return { success: true, data: data?.[0] }
  } catch (err) {
    console.error('[Supabase API Error] addCotizacion:', err)
    return { success: false }
  }
}

export const updateCotizacion = async (cotizacionId, cotizacionData) => {
  try {
    const { error } = await supabase
      .from(TABLES.COTIZACIONES)
      .update(cotizacionData)
      .eq('id', cotizacionId)
    
    if (error) {
      console.error('[Supabase API Error] updateCotizacion:', error)
      return { success: false }
    }
    
    return { success: true }
  } catch (err) {
    console.error('[Supabase API Error] updateCotizacion:', err)
    return { success: false }
  }
}

export const deleteCotizacion = async (cotizacionId) => {
  try {
    const { error } = await supabase
      .from(TABLES.COTIZACIONES)
      .delete()
      .eq('id', cotizacionId)
    
    if (error) {
      console.error('[Supabase API Error] deleteCotizacion:', error)
      return { success: false }
    }
    
    return { success: true }
  } catch (err) {
    console.error('[Supabase API Error] deleteCotizacion:', err)
    return { success: false }
  }
}

// ==================== SERVICIOS ====================
export const fetchServicios = async (branchName) => {
  try {
    if (!branchName) return []
    
    const { data, error } = await supabase
      .from(TABLES.SERVICIOS)
      .select('*')
      .eq('branch', branchName)
      .order('name')
    
    if (error) {
      console.error('[Supabase API Error] fetchServicios:', error)
      return []
    }
    
    return data || []
  } catch (err) {
    console.error('[Supabase API Error] fetchServicios:', err)
    return []
  }
}

export const addServicio = async (servicioData) => {
  try {
    const { data, error } = await supabase
      .from(TABLES.SERVICIOS)
      .insert([servicioData])
      .select()
    
    if (error) {
      console.error('[Supabase API Error] addServicio:', error)
      return { success: false }
    }
    
    return { success: true, data: data?.[0] }
  } catch (err) {
    console.error('[Supabase API Error] addServicio:', err)
    return { success: false }
  }
}

export const deleteServicio = async (servicioId) => {
  try {
    const { error } = await supabase
      .from(TABLES.SERVICIOS)
      .delete()
      .eq('id', servicioId)
    
    if (error) {
      console.error('[Supabase API Error] deleteServicio:', error)
      return { success: false }
    }
    
    return { success: true }
  } catch (err) {
    console.error('[Supabase API Error] deleteServicio:', err)
    return { success: false }
  }
}

// ==================== GASTOS ====================
export const fetchGastos = async (branchName) => {
  try {
    if (!branchName) return []
    
    const { data, error } = await supabase
      .from(TABLES.GASTOS)
      .select('*')
      .eq('branch', branchName)
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('[Supabase API Error] fetchGastos:', error)
      return []
    }
    
    return data || []
  } catch (err) {
    console.error('[Supabase API Error] fetchGastos:', err)
    return []
  }
}

export const addGasto = async (gastoData) => {
  try {
    const { data, error } = await supabase
      .from(TABLES.GASTOS)
      .insert([gastoData])
      .select()
    
    if (error) {
      console.error('[Supabase API Error] addGasto:', error)
      return { success: false }
    }
    
    return { success: true, data: data?.[0] }
  } catch (err) {
    console.error('[Supabase API Error] addGasto:', err)
    return { success: false }
  }
}

export const deleteGasto = async (gastoId) => {
  try {
    const { error } = await supabase
      .from(TABLES.GASTOS)
      .delete()
      .eq('id', gastoId)
    
    if (error) {
      console.error('[Supabase API Error] deleteGasto:', error)
      return { success: false }
    }
    
    return { success: true }
  } catch (err) {
    console.error('[Supabase API Error] deleteGasto:', err)
    return { success: false }
  }
}

// ==================== USUARIOS ====================
export const fetchUsuarios = async () => {
  try {
    const { data, error } = await supabase
      .from(TABLES.USUARIOS)
      .select('*')
    
    if (error) {
      console.error('[Supabase API Error] fetchUsuarios:', error)
      return []
    }
    
    return data || []
  } catch (err) {
    console.error('[Supabase API Error] fetchUsuarios:', err)
    return []
  }
}

export const addUsuario = async (usuarioData) => {
  try {
    const { data, error } = await supabase
      .from(TABLES.USUARIOS)
      .insert([usuarioData])
      .select()
    
    if (error) {
      console.error('[Supabase API Error] addUsuario:', error)
      return { success: false }
    }
    
    return { success: true, data: data?.[0] }
  } catch (err) {
    console.error('[Supabase API Error] addUsuario:', err)
    return { success: false }
  }
}

export const updateUsuario = async (usuarioId, usuarioData) => {
  try {
    const { error } = await supabase
      .from(TABLES.USUARIOS)
      .update(usuarioData)
      .eq('id', usuarioId)
    
    if (error) {
      console.error('[Supabase API Error] updateUsuario:', error)
      return { success: false }
    }
    
    return { success: true }
  } catch (err) {
    console.error('[Supabase API Error] updateUsuario:', err)
    return { success: false }
  }
}

export const deleteUsuario = async (usuarioId) => {
  try {
    const { error } = await supabase
      .from(TABLES.USUARIOS)
      .delete()
      .eq('id', usuarioId)
    
    if (error) {
      console.error('[Supabase API Error] deleteUsuario:', error)
      return { success: false }
    }
    
    return { success: true }
  } catch (err) {
    console.error('[Supabase API Error] deleteUsuario:', err)
    return { success: false }
  }
}

// ==================== IMAGE UPLOAD ====================
export const uploadImage = async (file, folder = 'products') => {
  try {
    const fileName = `${folder}/${Date.now()}_${file.name}`
    const { data, error } = await supabase.storage
      .from('products')
      .upload(fileName, file)
    
    if (error) {
      console.error('[Supabase API Error] uploadImage:', error)
      return { success: false }
    }
    
    // Get public URL
    const { data: urlData } = supabase.storage
      .from('products')
      .getPublicUrl(fileName)
    
    return { success: true, url: urlData.publicUrl }
  } catch (err) {
    console.error('[Supabase API Error] uploadImage:', err)
    return { success: false }
  }
}