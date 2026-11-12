/**
 * The public share link.
 *  - Link-preview crawlers (TelegramBot, facebookexternalhit, …) get a tiny HTML page with the meta tags.
 *  - People get redirected to the target URL.
 *  - Add ?preview to see the crawler HTML in a browser.
 */
export default defineEventHandler(async (event) => {
  const link = await getLink(getRouterParam(event, 'slug'))
  if (!link) throw createError({ statusCode: 404, statusMessage: 'Link not found' })

  const ua = getHeader(event, 'user-agent') || ''
  const query = getQuery(event)
  const wantsHtml = BOT_RE.test(ua) || query.preview !== undefined

  // Never let Vercel's CDN cache this: bots and people get different responses from the same URL
  setHeader(event, 'cache-control', 'no-store, max-age=0')
  setHeader(event, 'vary', 'User-Agent')

  if (!wantsHtml) return sendRedirect(event, link.targetUrl, 302)

  const reqUrl = getRequestURL(event)
  const shareUrl = `${reqUrl.origin}/s/${link.slug}${query.v ? `?v=${encodeURIComponent(String(query.v))}` : ''}`
  const e = escapeHtml
  const card = link.imageStyle === 'small' ? 'summary' : 'summary_large_image'

  const tags = [
    `<meta charset="utf-8">`,
    `<title>${e(link.title)}</title>`,
    link.description && `<meta name="description" content="${e(link.description)}">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:url" content="${e(shareUrl)}">`,
    link.siteName && `<meta property="og:site_name" content="${e(link.siteName)}">`,
    `<meta property="og:title" content="${e(link.title)}">`,
    link.description && `<meta property="og:description" content="${e(link.description)}">`,
    link.image && `<meta property="og:image" content="${e(link.image)}">`,
    `<meta name="twitter:card" content="${card}">`,
    `<meta name="twitter:title" content="${e(link.title)}">`,
    link.description && `<meta name="twitter:description" content="${e(link.description)}">`,
    link.image && `<meta name="twitter:image" content="${e(link.image)}">`,
  ].filter(Boolean).join('\n    ')

  setHeader(event, 'content-type', 'text/html; charset=utf-8')
  return `<!doctype html>
<html>
  <head>
    ${tags}
  </head>
  <body style="font-family:system-ui,sans-serif;max-width:640px;margin:40px auto;padding:0 16px">
    <h1 style="font-size:20px">${e(link.title)}</h1>
    <p>${e(link.description)}</p>
    <p><a href="${e(link.targetUrl)}">Continue to ${e(link.targetUrl)}</a></p>
  </body>
</html>`
})
