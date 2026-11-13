/**
 * The public share link.
 *  - Link-preview crawlers (TelegramBot, facebookexternalhit, …) get a tiny HTML page with the meta tags.
 *  - People (and any fetcher we don't recognise) get the same page plus a script that forwards them,
 *    so in-app link fetchers read our tags instead of following a redirect. ?go = plain 302.
 *  - Add ?preview to see the crawler HTML in a browser.
 */
export default defineEventHandler(async (event) => {
  const link = await findLink(getRouterParam(event, 'slug'), getRequestURL(event).origin)
  if (!link) return notFoundPage(event, 'link', getRouterParam(event, 'slug'))

  const ua = getHeader(event, 'user-agent') || ''
  const query = getQuery(event)
  const isCrawler = BOT_RE.test(ua)
  // ?preview / ?as=… show the crawler page in a browser without forwarding
  const forward = !isCrawler && query.preview === undefined && query.as === undefined

  // Never let Vercel's CDN cache this: bots and people get different responses from the same URL
  setHeader(event, 'cache-control', 'no-store, max-age=0')
  setHeader(event, 'vary', 'User-Agent')

  // Known browsers and anything we don't recognise get the preview page plus a script that forwards
  // people to the target. Link fetchers don't run scripts, so they read *this* page's tags instead of
  // following a redirect to the target's. ?go sends a plain redirect.
  if (query.go !== undefined) return sendRedirect(event, link.targetUrl, 302)

  const reqUrl = getRequestURL(event)
  const shareUrl = `${reqUrl.origin}/s/${link.slug}${query.v ? `?v=${encodeURIComponent(String(query.v))}` : ''}`
  const e = escapeHtml
  // Each app's crawler gets its own overrides (?as=telegram|facebook|whatsapp to preview one in a browser)
  const platform = parsePlatform(query.as) || platformFromUA(ua)
  const view = applyOverride(link, platform ? link.platforms?.[platform] : undefined)
  const extra = view.imageOverridden ? { ...link.extra, imageWidth: undefined, imageHeight: undefined, imageAlt: undefined } : link.extra
  const imageInfo = view.image && !(extra?.imageWidth && extra?.imageHeight) ? await imageDims(view.image, reqUrl.origin) : null
  // JSON-encoded (and </ escaped) so the URL can't break out of the script
  const targetJs = JSON.stringify(link.targetUrl).replace(/</g, '\\u003c')
  const tags = [
    `<meta charset="utf-8">`,
    forward ? `<script>location.replace(${targetJs})</script>` : '',
    `<meta name="viewport" content="width=device-width, initial-scale=1">`,
    ...renderMetaTags({ ...view, extra, url: shareUrl, imageInfo, fbAppId: String(useRuntimeConfig(event).facebookAppId || '') || undefined }),
  ].filter(Boolean).join('\n    ')

  setHeader(event, 'content-type', 'text/html; charset=utf-8')
  return `<!doctype html>
<html>
  <head>
    ${tags}
  </head>
  <body style="font-family:system-ui,sans-serif;max-width:640px;margin:40px auto;padding:0 16px">
    ${forward ? `<p style="color:#6b7280">Opening…</p>` : ''}
    <h1 style="font-size:20px">${e(view.title)}</h1>
    <p>${e(view.description)}</p>
    <p><a href="${e(link.targetUrl)}">Continue to ${e(link.targetUrl)}</a></p>
  </body>
</html>`
})
