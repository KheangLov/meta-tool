/**
 * Asks @WebpageBot to refresh Telegram's preview for one or more URLs.
 * Body: { url } or { urls: [...] } (max 5), optional { withContent: true } to also press "Update with content".
 */
export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const body = (await readBody(event)) || {}
  const urls: string[] = (Array.isArray(body.urls) ? body.urls : [body.url]).filter(isHttpUrl)
  if (!urls.length) throw createError({ statusCode: 400, statusMessage: 'Provide url or urls (full http(s) URLs)' })
  if (urls.length > 5) throw createError({ statusCode: 400, statusMessage: 'At most 5 URLs per request' })

  return await withTelegram(async (client) => {
    const results = []
    for (const url of [...new Set(urls)]) {
      results.push({ url, ...(await refreshWithWebpageBot(client, url, { withContent: !!body.withContent })) })
    }
    return { results }
  })
})
