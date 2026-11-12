/** Upload an image (multipart form field "file"). Returns { url } to use as og:image. */
export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const len = Number(getHeader(event, 'content-length') || 0)
  if (len > MAX_UPLOAD_BYTES + 64 * 1024) throw createError({ statusCode: 413, statusMessage: 'Image is larger than 4 MB' })

  const parts = await readMultipartFormData(event)
  const file = parts?.find((p) => p.name === 'file' && p.data?.length)
  if (!file) throw createError({ statusCode: 400, statusMessage: 'No file received (use form field "file")' })

  return await saveUpload(Buffer.from(file.data), getRequestURL(event).origin)
})
