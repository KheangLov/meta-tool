/** Fetch any URL the way Telegram's crawler does and return the meta tags it would read. */
export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const url = String(getQuery(event).url || '')
  if (!isHttpUrl(url)) throw createError({ statusCode: 400, statusMessage: 'Provide a full http(s) url' })
  return await scrapeAsTelegram(url)
})
