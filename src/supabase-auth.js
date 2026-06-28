import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://tcixwdrtfhfzjaznvobz.supabase.co'
const supabaseKey = 'sb_publishable_42UM7h88bSsQkcuRUNeEfg_kjRx_BoJ'

export const supabase = createClient(supabaseUrl, supabaseKey)

export const TABLES = {
  INVENTARIO: 'inventario',
  USUARIOS: 'usuarios',
  CLIENTES: 'clientes',
  COTIZACIONES: 'cotizaciones',
  SERVICIOS: 'servicios',
  GASTOS: 'gastos'
}

export const BRANCHES = ['Rojo Gomez', 'Morelos', 'Bacalar']

// Session configuration
const SESSION_EXPIRY_MS = 24 * 60 * 60 * 1000 // 24 hours
const SESSION_KEY = 'secureSession'

// Admin setup code
const ADMIN_SETUP_CODE = 'AdminNando2026'

// Hash password using SHA-256
async function hashPassword(password) {
  const encoder = new TextEncoder()
  const data = encoder.encode(password + 'vulcanizadora-salt-2024')
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

// Generate random token
function generateToken() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}

// Create secure session
function createSecureSession(user) {
  const session = {
    user: {
      email: user.email,
      role: user.role,
      branch: user.branch,
      multi_branch: user.multi_branch === true
    },
    createdAt: Date.now(),
    expiresAt: Date.now() + SESSION_EXPIRY_MS,
    token: generateToken()
  }
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  return session
}

// Validate session
function validateSession() {
  try {
    const sessionStr = localStorage.getItem(SESSION_KEY)
    if (!sessionStr) return null

    const session = JSON.parse(sessionStr)
    if (Date.now() > session.expiresAt) {
      localStorage.removeItem(SESSION_KEY)
      return null
    }
    return session
  } catch {
    return null
  }
}

// Logout
export function logout() {
  localStorage.removeItem(SESSION_KEY)
}

// Check if logged in
export function isAuthenticated() {
  return validateSession() !== null
}

// Get current user
export function getCurrentUser() {
  const session = validateSession()
  return session?.user || null
}

// Setup admin user
export const setupAdmin = async (email, secretCode) => {
  if (secretCode !== ADMIN_SETUP_CODE) {
    return { success: false, error: 'Código inválido' }
  }
  
  try {
    const { data: existingUser } = await supabase
      .from(TABLES.USUARIOS)
      .select('*')
      .eq('email', email)
      .single()
    
    if (!existingUser) {
      return { success: false, error: 'Usuario no encontrado' }
    }
    
    const { error: updateError } = await supabase
      .from(TABLES.USUARIOS)
      .update({ role: 'admin' })
      .eq('id', existingUser.id)
    
    if (updateError) {
      return { success: false, error: updateError.message }
    }
    
    return { success: true, message: 'Ahora eres administrador' }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

// Change password with hash
export const changePassword = async (email, newPassword, secretCode) => {
  if (secretCode !== ADMIN_SETUP_CODE && secretCode !== 'PASS-Nando2026!') {
    return { success: false, error: 'Código secreto incorrecto' }
  }
  
  try {
    const { data: existingUser, error: findError } = await supabase
      .from(TABLES.USUARIOS)
      .select('*')
      .eq('email', email)
      .single()
    
    if (findError || !existingUser) {
      return { success: false, error: 'Usuario no encontrado' }
    }
    
    // Hash the new password
    const hashedPassword = await hashPassword(newPassword)
    
    const { error: updateError } = await supabase
      .from(TABLES.USUARIOS)
      .update({ password: hashedPassword })
      .eq('id', existingUser.id)
    
    if (updateError) {
      return { success: false, error: updateError.message }
    }
    
    return { success: true, message: 'Contraseña actualizada' }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

// Login con verificación de contraseña con hash
export const loginWithEmail = async (email, password) => {
  try {
    // Reset failed attempts on login attempt (allow retry)
    localStorage.setItem('loginAttempts_' + email, '0')
    
    const { data: user } = await supabase
      .from(TABLES.USUARIOS)
      .select('*')
      .eq('email', email)
      .single()

    if (!user) {
      return { success: false, error: 'Usuario no encontrado' }
    }

    // Verify password with proper hash
    const hashedInput = await hashPassword(password)
    
    // Check if password matches hash or plain text
    const passwordMatch = (user.password === hashedInput) || (user.password === password)
    
    if (!passwordMatch && user.password) {
      return { success: false, error: 'Contraseña incorrecta' }
    }
    
    // If password is plain text, convert to hash for security
    if (user.password && user.password === password) {
      const secureHash = await hashPassword(password)
      await supabase
        .from(TABLES.USUARIOS)
        .update({ password: secureHash })
        .eq('id', user.id)
    }
    
    // Create session
    const session = createSecureSession(user)
    return { success: true, user: session.user }

  } catch (err) {
    return { success: false, error: 'Error de autenticación' }
  }
}