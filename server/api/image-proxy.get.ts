/** Returns an image's bytes from our own origin so the browser can recompress it (avoids CORS). ?url=… */
export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const url = String(getQuery(event).url || '')
  if (!isHttpUrl(url)) throw createError({ statusCode: 400, statusMessage: 'Provide a full http(s) url' })
  const img = await fetchImage(url)
  const kind = detectImageType(img.data)
  if (!kind) throw createError({ statusCode: 415, statusMessage: 'That URL is not a JPEG, PNG, WebP or GIF image' })
  setHeader(event, 'content-type', kind.type)
  setHeader(event, 'cache-control', 'no-store')
  return img.data
})
