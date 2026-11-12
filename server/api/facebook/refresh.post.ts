/**
 * Re-scrapes URLs on Facebook (also updates Messenger) and checks the result matches what you saved.
 * Body: { url } or { urls: [...] } (max 10)
 */
export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const body = (await readBody(event)) || {}
  const urls: string[] = (Array.isArray(body.urls) ? body.urls : [body.url]).filter(isHttpUrl)
  if (!urls.length) throw createError({ statusCode: 400, statusMessage: 'Provide url or urls' })
  if (urls.length > 10) throw createError({ statusCode: 400, statusMessage: 'At most 10 URLs per request' })
  const origin = getRequestURL(event).origin
  const results = []
  for (const url of [...new Set(urls)]) {
    try {
      const preview = await facebookScrape(url)
      const expected = await expectedPreviewFor(url, origin, 'facebook')
      const diffs = expected ? compareFacebook(preview, expected) : []
      results.push({ url, preview, diffs, status: !expected ? 'unknown' : diffs.length ? 'mismatch' : 'match' })
    } catch (e: any) {
      results.push({ url, status: 'error', error: e?.statusMessage || e?.message || String(e), diffs: [] })
    }
  }
  return { results }
})
