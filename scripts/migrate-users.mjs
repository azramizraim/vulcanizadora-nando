#!/usr/bin/env node
import { readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

const SUPABASE_URL = 'https://tcixwdrtfhfzjaznvobz.supabase.co'
const SUPABASE_KEY = 'sb_publishable_42UM7h88bSsQkcuRUNeEfg_kjRx_BoJ'
const SALT = 'vulcanizadora-salt-2024'
const VALID_ROLES = new Set(['admin', 'staff', 'vendedor'])
const VALID_BRANCHES = new Set(['Rojo Gomez', 'Morelos', 'Bacalar'])

const args = new Set(process.argv.slice(2))
const dryRun = args.has('--dry-run')
const fileArg = process.argv.find((a) => a.endsWith('.json'))
const inputFile = resolve(fileArg || 'scripts/users.json')

function buildId(email) {
  return email.replace('@', '-at-').replace('.', '-')
}

async function hashPassword(password) {
  const data = new TextEncoder().encode(password + SALT)
  const buffer = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function validateUser(u, i) {
  if (!u.email || typeof u.email !== 'string') {
    throw new Error(`users[${i}].email es requerido`)
  }
  if (!u.password || typeof u.password !== 'string') {
    throw new Error(`users[${i}].password es requerido`)
  }
  if (u.password.length < 6) {
    throw new Error(`users[${i}].password debe tener al menos 6 caracteres`)
  }
  if (u.role && !VALID_ROLES.has(u.role)) {
    throw new Error(
      `users[${i}].role inválido: ${u.role}. Permitidos: ${[...VALID_ROLES].join(', ')}`
    )
  }
  if (u.branch && !VALID_BRANCHES.has(u.branch)) {
    throw new Error(
      `users[${i}].branch inválido: ${u.branch}. Permitidos: ${[...VALID_BRANCHES].join(', ')}`
    )
  }
}

async function fetchExistingEmails() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/usuarios?select=email`,
    {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
    }
  )
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`No se pudo leer usuarios existentes: ${text}`)
  }
  const rows = await res.json()
  return new Set(rows.map((r) => r.email))
}

async function insertUser(record) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/usuarios`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(record),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text)
  }
}

function log(level, msg) {
  const colors = {
    info: '\x1b[36m',
    ok: '\x1b[32m',
    warn: '\x1b[33m',
    err: '\x1b[31m',
    dim: '\x1b[2m',
  }
  const reset = '\x1b[0m'
  const icon = { info: '·', ok: '✓', warn: '!', err: '✗' }[level] || '·'
  console.log(`${colors[level] || ''}${icon}${reset} ${msg}`)
}

async function main() {
  if (!existsSync(inputFile)) {
    log('err', `Archivo no encontrado: ${inputFile}`)
    log('info', 'Copia scripts/users.template.json a scripts/users.json y rellena los usuarios.')
    process.exit(1)
  }

  const raw = await readFile(inputFile, 'utf8')
  let parsed
  try {
    parsed = JSON.parse(raw)
  } catch (e) {
    log('err', `JSON inválido en ${inputFile}: ${e.message}`)
    process.exit(1)
  }

  const users = Array.isArray(parsed) ? parsed : parsed.users
  if (!Array.isArray(users) || users.length === 0) {
    log('err', 'El archivo debe contener un array de usuarios o un objeto con clave "users"')
    process.exit(1)
  }

  users.forEach(validateUser)

  log('info', `${users.length} usuario(s) en ${inputFile}`)
  if (dryRun) log('warn', 'Modo dry-run: no se escribirá nada en Supabase')

  let existing
  try {
    existing = await fetchExistingEmails()
    log('info', `${existing.size} usuario(s) ya existen en Supabase`)
  } catch (e) {
    log('err', e.message)
    process.exit(1)
  }

  let created = 0
  let skipped = 0
  let failed = 0

  for (const u of users) {
    if (existing.has(u.email)) {
      log('warn', `Saltar ${u.email} (ya existe)`)
      skipped++
      continue
    }

    const record = {
      id: buildId(u.email),
      email: u.email,
      role: u.role || 'vendedor',
      branch: u.branch || 'Rojo Gomez',
      password: await hashPassword(u.password),
    }

    if (dryRun) {
      log('dim', `[dry-run] Insertaría: ${record.email} (${record.role} / ${record.branch})`)
      created++
      continue
    }

    try {
      await insertUser(record)
      log('ok', `Creado ${record.email} (${record.role} / ${record.branch})`)
      created++
    } catch (e) {
      log('err', `Falló ${u.email}: ${e.message}`)
      failed++
    }
  }

  console.log('')
  log('info', `Resumen: ${created} creado(s), ${skipped} saltado(s), ${failed} fallido(s)`)
  if (failed > 0) process.exit(1)
}

main().catch((e) => {
  log('err', e.message)
  process.exit(1)
})
