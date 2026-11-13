import { put } from '@vercel/blob'

export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024 // Vercel functions accept request bodies up to 4.5 MB

const TYPES: Record<string, { ext: string; magic: (b: Buffer) => boolean }> = {
  'image/jpeg': { ext: 'jpg', magic: (b) => b[0] === 0xff && b[1] === 0xd8 },
  'image/png': { ext: 'png', magic: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  'image/gif': { ext: 'gif', magic: (b) => b.subarray(0, 3).toString() === 'GIF' },
  'image/webp': { ext: 'webp', magic: (b) => b.subarray(0, 4).toString() === 'RIFF' && b.subarray(8, 12).toString() === 'WEBP' },
}

/** Works out the real image type from the file's first bytes (ignores what the browser claims) */
export function detectImageType(data: Buffer) {
  for (const [type, t] of Object.entries(TYPES)) if (t.magic(data)) return { type, ext: t.ext }
  return null
}

export function blobConfigured() {
  return !!(blobToken() || process.env.BLOB_STORE_ID)
}

interface StoredUpload { type: string; data: string; createdAt: string }
export const uploadStore = () => useStorage<StoredUpload>('uploads')

/**
 * Saves an image and returns its public URL.
 * Vercel Blob (public store) when connected; otherwise the app's own storage, served from /u/<name>.
 */
export async function saveUpload(data: Buffer, origin: string) {
  const kind = detectImageType(data)
  if (!kind) throw createError({ statusCode: 415, statusMessage: 'Only JPEG, PNG, WebP or GIF images can be uploaded' })
  if (data.length > MAX_UPLOAD_BYTES) throw createError({ statusCode: 413, statusMessage: 'Image is larger than 4 MB' })

  const name = `${Date.now().toString(36)}-${randomSlug(8)}.${kind.ext}`

  if (blobConfigured()) {
    try {
      const ctrl = new AbortController()
      // The Blob SDK can keep retrying for a long time, so give up after 20 s and use app storage
      const blob = await Promise.race([
        put(`previews/${name}`, data, {
          access: 'public', contentType: kind.type, addRandomSuffix: false, abortSignal: ctrl.signal,
          token: blobToken() || undefined,
        }),
        new Promise<never>((_, rej) => setTimeout(() => { ctrl.abort(); rej(new Error('Vercel Blob timed out')) }, 20_000)),
      ])
      return { url: blob.url, storage: 'blob' as const, bytes: data.length, type: kind.type }
    } catch (e: any) {
      // e.g. a private Blob store: Telegram can't read private files, so fall back to app storage
      console.warn('[uploads] Vercel Blob upload failed, using app storage instead:', e?.message || e)
    }
  }

  await uploadStore().setItem(name, { type: kind.type, data: data.toString('base64'), createdAt: new Date().toISOString() })
  return { url: `${origin}/u/${name}`, storage: 'app' as const, bytes: data.length, type: kind.type }
}
