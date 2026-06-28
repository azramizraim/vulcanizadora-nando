import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://tcixwdrtfhfzjaznvobz.supabase.co'
const supabaseKey = 'sb_publishable_42UM7h88bSsQkcuRUNeEfg_kjRx_BoJ'
const supabase = createClient(supabaseUrl, supabaseKey)

async function migrateSku() {
  const { data: products, error } = await supabase
    .from('inventario')
    .select('*')
    .limit(10000)

  if (error) {
    console.error('Error fetching products:', error)
    return
  }

  console.log(`Total products: ${products.length}`)

  // Determine highest sequential number per prefix
  const lastNumbers = {}
  for (const p of products) {
    if (p.sku) {
      for (const prefix of ['RIN-', 'LLA-', 'PROD-']) {
        if (p.sku.startsWith(prefix)) {
          const num = parseInt(p.sku.replace(prefix, ''), 10)
          if (!isNaN(num) && (!lastNumbers[prefix] || num > lastNumbers[prefix])) {
            lastNumbers[prefix] = num
          }
        }
      }
    }
  }

  // Default starts
  if (!lastNumbers['RIN-']) lastNumbers['RIN-'] = 1
  if (!lastNumbers['LLA-']) lastNumbers['LLA-'] = 17
  if (!lastNumbers['PROD-']) lastNumbers['PROD-'] = 51

  console.log('Starting numbers:', JSON.stringify(lastNumbers))

  let updated = 0

  for (const p of products) {
    if (p.sku && /^(PROD-|RIN-|LLA-)/.test(p.sku)) {
      continue // Already has proper SKU
    }

    // Determine prefix
    const isRin = /rin|rim/i.test(p.name || '') || p.warehouse === 'rines'
    const isLlantas = /llant/i.test(p.name || '') ||
      p.warehouse === 'llantas' ||
      p.warehouse === 'llantas_usadas' ||
      /^\d/.test((p.sku || '').replace(/\s/g, '')) ||
      /\d+\/\d+R\d+/i.test(p.name || '') ||
      /\d+\.\d+-\d+/i.test(p.name || '')
    let prefix = 'PROD-'
    if (isRin) prefix = 'RIN-'
    else if (isLlantas) prefix = 'LLA-'

    lastNumbers[prefix] += 1
    const newSku = `${prefix}${String(lastNumbers[prefix]).padStart(5, '0')}`

    console.log(`[${prefix.replace('-','')}] ${p.id}: ${(p.sku || '(vacio)').padEnd(18)} -> ${newSku}  (${(p.name || '').substring(0, 30)})`)

    const { error: updateError } = await supabase
      .from('inventario')
      .update({ sku: newSku, updated_at: new Date().toISOString() })
      .eq('id', p.id)

    if (updateError) {
      console.error(`  ERROR: ${updateError.message}`)
    } else {
      updated++
    }
  }

  console.log(`\nDone! Updated ${updated} products.`)
}

migrateSku().catch(console.error)
