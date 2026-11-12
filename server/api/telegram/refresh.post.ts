/**
 * Asks @WebpageBot to refresh Telegram's preview.
 * Body: { url } or { urls: [...] } (max 5)
 *   withContent: also press "Update with content"
 *   verify (default true): for links/posts on this site, check Telegram now shows the saved
 *     title/description/image; if not, retry once with "Update with content".
 * Tip: send one URL per request when verifying — each can take 10–25 s.
 */
export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const body = (await readBody(event)) || {}
  const urls: string[] = (Array.isArray(body.urls) ? body.urls : [body.url]).filter(isHttpUrl)
  if (!urls.length) throw createError({ statusCode: 400, statusMessage: 'Provide url or urls (full http(s) URLs)' })
  if (urls.length > 5) throw createError({ statusCode: 400, statusMessage: 'At most 5 URLs per request' })
  const verify = body.verify !== false
  const origin = getRequestURL(event).origin

  return await withTelegram(async (client) => {
    const results = []
    for (const url of [...new Set(urls)]) {
      const expected = verify ? await expectedPreviewFor(url, origin) : null
      let r = await refreshWithWebpageBot(client, url, { withContent: !!body.withContent })
      let diffs = expected ? comparePreview(r.preview, expected) : []
      let retried = false
      if (expected && diffs.length && !body.withContent) {
        retried = true
        const again = await refreshWithWebpageBot(client, url, { withContent: true })
        r = { ...again, botReplies: [...r.botReplies, ...again.botReplies] }
        diffs = comparePreview(r.preview, expected)
      }
      results.push({
        url, ...r, retried,
        status: !expected ? 'unknown' : diffs.length ? 'mismatch' : 'match',
        diffs,
      })
    }
    return { results }
  })
})
