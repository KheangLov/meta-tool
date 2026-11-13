/**
 * The public share link.
 *  - Link-preview crawlers (TelegramBot, facebookexternalhit, …) get a tiny HTML page with the meta tags.
 *  - People get redirected to the target URL.
 *  - Add ?preview to see the crawler HTML in a browser.
 */
export default defineEventHandler(async (event) => {
  const link = await findLink(getRouterParam(event, 'slug'), getRequestURL(event).origin)
  if (!link) return notFoundPage(event, 'link')

  const ua = getHeader(event, 'user-agent') || ''
  const query = getQuery(event)
  const wantsHtml = BOT_RE.test(ua) || query.preview !== undefined || query.as !== undefined

  // Never let Vercel's CDN cache this: bots and people get different responses from the same URL
  setHeader(event, 'cache-control', 'no-store, max-age=0')
  setHeader(event, 'vary', 'User-Agent')

  if (!wantsHtml) return sendRedirect(event, link.targetUrl, 302)

  const reqUrl = getRequestURL(event)
  const shareUrl = `${reqUrl.origin}/s/${link.slug}${query.v ? `?v=${encodeURIComponent(String(query.v))}` : ''}`
  const e = escapeHtml
  // Each app's crawler gets its own overrides (?as=telegram|facebook|whatsapp to preview one in a browser)
  const platform = parsePlatform(query.as) || platformFromUA(ua)
  const view = applyOverride(link, platform ? link.platforms?.[platform] : undefined)
  const extra = view.imageOverridden ? { ...link.extra, imageWidth: undefined, imageHeight: undefined, imageAlt: undefined } : link.extra
  const tags = [
    `<meta charset="utf-8">`,
    ...renderMetaTags({ ...view, extra, url: shareUrl, fbAppId: String(useRuntimeConfig(event).facebookAppId || '') || undefined }),
  ].join('\n    ')

  setHeader(event, 'content-type', 'text/html; charset=utf-8')
  return `<!doctype html>
<html>
  <head>
    ${tags}
  </head>
  <body style="font-family:system-ui,sans-serif;max-width:640px;margin:40px auto;padding:0 16px">
    <h1 style="font-size:20px">${e(view.title)}</h1>
    <p>${e(view.description)}</p>
    <p><a href="${e(link.targetUrl)}">Continue to ${e(link.targetUrl)}</a></p>
  </body>
</html>`
})
