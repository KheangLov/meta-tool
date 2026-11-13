/** Serves uploaded images from your GitHub repo (used when Vercel Blob isn't connected). */
export default defineEventHandler(async (event) => {
  const name = getRouterParam(event, 'name') || ''
  if (!/^[a-z0-9-]+\.(jpg|png|gif|webp)$/.test(name)) throw createError({ statusCode: 404 })
  const data = await readFile(`published/uploads/${name}`)
  if (!data) throw createError({ statusCode: 404, statusMessage: 'Image not found' })
  setHeader(event, 'content-type', detectImageType(data)?.type || 'application/octet-stream')
  // Names are unique and never reused, so Vercel's CDN and the apps can cache the image for a year
  setHeader(event, 'cache-control', 'public, max-age=31536000, immutable')
  return data
})
