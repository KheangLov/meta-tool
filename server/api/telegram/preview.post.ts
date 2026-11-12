/** Returns the preview Telegram currently has cached for a URL. Body: { url } */
export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const { url } = (await readBody(event)) || {}
  if (!isHttpUrl(url)) throw createError({ statusCode: 400, statusMessage: 'Provide a full http(s) url' })
  return await withTelegram((client) => getTelegramPreview(client, url))
})
