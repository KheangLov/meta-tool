/** Browser-side image resizing/compression (canvas → JPEG). */
export async function compressImage(file: Blob, opts: { maxSide: number; maxBytes: number; force?: boolean }): Promise<Blob> {
  const keepAsIs = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)
  let bmp: ImageBitmap
  try { bmp = await createImageBitmap(file) }
  catch { if (keepAsIs && file.size <= opts.maxBytes) return file; throw new Error('This browser can’t read that image. Try a JPEG or PNG.') }

  const big = Math.max(bmp.width, bmp.height) > opts.maxSide
  if (!opts.force && keepAsIs && !big && file.size <= opts.maxBytes) { bmp.close(); return file }
  if (!opts.force && file.type === 'image/gif' && file.size <= opts.maxBytes) { bmp.close(); return file }

  let scale = Math.min(1, opts.maxSide / Math.max(bmp.width, bmp.height))
  const qualities = [0.86, 0.78, 0.7, 0.62]
  for (let attempt = 0; attempt < 8; attempt++) {
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(bmp.width * scale))
    canvas.height = Math.max(1, Math.round(bmp.height * scale))
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#fff' // JPEG has no transparency
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height)
    const q = qualities[Math.min(attempt, qualities.length - 1)]
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', q))
    if (blob && blob.size <= opts.maxBytes) { bmp.close(); return blob }
    if (attempt >= 3) scale *= 0.8
  }
  bmp.close()
  throw new Error('Could not make the image small enough.')
}

/** Uploads a blob through /api/uploads and returns its public URL */
export async function uploadBlob(api: ReturnType<typeof useApi>, blob: Blob, name = 'image') {
  const form = new FormData()
  const ext = blob.type.split('/')[1] || 'jpg'
  form.append('file', blob, `${name.replace(/\.[^.]+$/, '') || 'image'}.${ext}`)
  return await api<{ url: string; bytes: number; storage: string }>('/api/uploads', { method: 'POST', body: form })
}

export const IMAGE_PRESETS = {
  whatsapp: { label: 'WhatsApp-safe (≤ 300 KB)', maxSide: 1200, maxBytes: 290 * 1024 },
  all: { label: 'All apps (1200 px, ≤ 600 KB)', maxSide: 1200, maxBytes: 590 * 1024 },
}
