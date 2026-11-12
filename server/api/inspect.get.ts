/** Fetch any URL the way an app's crawler does and return the meta tags it would read. ?url=…&as=telegram|facebook|whatsapp */
export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const q = getQuery(event)
  const url = String(q.url || '')
  if (!isHttpUrl(url)) throw createError({ statusCode: 400, statusMessage: 'Provide a full http(s) url' })
  const as = parsePlatform(q.as) || 'telegram'
  return { as, ...(await scrapeAs(url, CRAWLER_UA[as])) }
})
