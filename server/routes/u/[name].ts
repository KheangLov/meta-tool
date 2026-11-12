/** Serves images uploaded to the app's own storage (used when Vercel Blob isn't connected). */
export default defineEventHandler(async (event) => {
  const name = getRouterParam(event, 'name') || ''
  if (!/^[a-z0-9-]+\.(jpg|png|gif|webp)$/.test(name)) throw createError({ statusCode: 404 })
  const item = await uploadStore().getItem(name)
  if (!item) throw createError({ statusCode: 404, statusMessage: 'Image not found' })
  setHeader(event, 'content-type', item.type)
  // Names are unique and never reused, so the image can be cached for a long time
  setHeader(event, 'cache-control', 'public, max-age=31536000, immutable')
  return Buffer.from(item.data, 'base64')
})
