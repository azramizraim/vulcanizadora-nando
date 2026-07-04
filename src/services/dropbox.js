import { getStoredToken, storeToken } from './dropboxConfig'

const DROPBOX_API = 'https://api.dropboxapi.com/2'
const DROPBOX_CONTENT = 'https://content.dropboxapi.com/2'
const DROPBOX_FOLDER = '/productos'

let accessToken = getStoredToken()

export function setAccessToken(token) {
  accessToken = token
  if (token) storeToken(token)
}

export function getAccessToken() {
  return accessToken
}

async function request(method, endpoint, body, contentHeaders) {
  const url = endpoint.startsWith('http') ? endpoint : `${DROPBOX_API}/${endpoint}`
  const headers = {
    'Authorization': `Bearer ${accessToken}`,
  }
  if (contentHeaders) {
    Object.assign(headers, contentHeaders)
  } else {
    headers['Content-Type'] = 'application/json'
  }
  const response = await fetch(url, {
    method,
    headers,
    body: body || undefined,
  })
  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Dropbox error ${response.status}: ${text}`)
  }
  return response.json()
}

export async function uploadImage(file) {
  if (!accessToken) throw new Error('Dropbox token not configured')

  const timestamp = Date.now()
  const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
  const fileName = `img_${timestamp}_${cleanName}`
  const path = `${DROPBOX_FOLDER}/${fileName}`

  const response = await fetch(`${DROPBOX_CONTENT}/files/upload`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/octet-stream',
      'Dropbox-API-Arg': JSON.stringify({
        path,
        mode: 'add',
        autorename: true,
        mute: false,
      }),
    },
    body: await file.arrayBuffer(),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Dropbox upload error ${response.status}: ${text}`)
  }

  const result = await response.json()
  const sharedLink = await createSharedLink(path)

  return {
    path: result.path_display,
    id: result.id,
    url: sharedLink.url.replace('?dl=0', '?raw=1'),
    name: result.name,
    size: result.size,
  }
}

async function createSharedLink(path) {
  const response = await fetch(`${DROPBOX_API}/sharing/create_shared_link_with_settings`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      path,
      settings: {
        requested_visibility: 'public',
        audience: 'public',
        access: 'viewer',
      },
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    if (response.status === 409) {
      const list = await request('POST', '/sharing/list_shared_links', JSON.stringify({ path }))
      if (list.links && list.links.length > 0) {
        return list.links[0]
      }
    }
    throw new Error(`Dropbox share error ${response.status}: ${text}`)
  }

  return response.json()
}

export async function listFiles(folder = DROPBOX_FOLDER) {
  return request('POST', '/files/list_folder', JSON.stringify({ path: folder, limit: 100 }))
}

export async function deleteFile(path) {
  return request('POST', '/files/delete_v2', JSON.stringify({ path }))
}

export async function getAccountInfo() {
  return request('POST', '/users/get_current_account', null)
}

export function getConfigStatus() {
  return {
    configured: !!accessToken,
    folder: DROPBOX_FOLDER,
  }
}
