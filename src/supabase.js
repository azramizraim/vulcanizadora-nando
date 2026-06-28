import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://tcixwdrtfhfzjaznvobz.supabase.co'
const supabaseKey = 'sb_publishable_42UM7h88bSsQkcuRUNeEfg_kjRx_BoJ'

export const supabase = createClient(supabaseUrl, supabaseKey)

// Tables: inventario, usuarios, clientes, cotizaciones, servicios, gastos
export const TABLES = {
  INVENTARIO: 'inventario',
  USUARIOS: 'usuarios',
  CLIENTES: 'clientes',
  COTIZACIONES: 'cotizaciones',
  SERVICIOS: 'servicios',
  GASTOS: 'gastos',
  VENTAS: 'ventas'
}

export const BRANCHES = ['Rojo Gomez', 'Morelos', 'Bacalar']