/**
 * Image width/height/type for og:image:width, og:image:height and og:image:type,
 * so Facebook and Messenger can show the image on the very first share.
 * Only the first 128 KB is downloaded (sizes are in the file header); results are cached per server instance.
 */
const cache = new Map<string, { width: number; height: number; type: string } | null>()

export async function imageDims(url: string, origin?: string): Promise<{ width: number; height: number; type: string } | null> {
  if (!url || !/^https?:\/\//.test(url)) return null
  if (cache.has(url)) return cache.get(url)!

  // Our own test images: known sizes, no request needed
  if (origin && url.startsWith(`${origin}/test/`)) {
    const t = TEST_IMAGES.find((i) => url.endsWith(`/test/${i.file}`))
    if (t) {
      const v = { width: t.w, height: t.h, type: 'image/jpeg' }
      cache.set(url, v)
      return v
    }
  }

  try {
    const res = await fetch(url, {
      headers: { range: 'bytes=0-131071', 'user-agent': 'Mozilla/5.0 (LinkPreviewStudio image size)' },
      redirect: 'follow',
      signal: AbortSignal.timeout(3000),
    })
    if (!res.ok) { cache.set(url, null); return null }
    const reader = res.body?.getReader()
    const chunks: Uint8Array[] = []
    let total = 0
    while (reader && total < 131072) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(value)
      total += value.length
    }
    reader?.cancel().catch(() => {})
    const head = Buffer.concat(chunks)
    const dims = imageDimensions(head)
    const type = detectImageType(head)?.type || (res.headers.get('content-type') || '').split(';')[0]!.trim()
    const v = dims ? { ...dims, type } : null
    if (cache.size > 500) cache.clear()
    cache.set(url, v)
    return v
  } catch {
    return null // don't cache network hiccups
  }
}
