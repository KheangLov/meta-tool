/** Size, dimensions and per-app checks for an image URL. ?url=… */
export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const url = String(getQuery(event).url || '')
  if (!isHttpUrl(url)) throw createError({ statusCode: 400, statusMessage: 'Provide a full http(s) url' })
  const img = await fetchImage(url)
  const dims = imageDimensions(img.data)
  const type = detectImageType(img.data)?.type || img.type
  const info = { bytes: img.data.length, width: dims?.width || 0, height: dims?.height || 0, type, https: img.finalUrl.startsWith('https:') }
  return { ...info, checks: checkImage(info) }
})
