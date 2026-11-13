/**
 * Public post page. It's a real page with its own Open Graph tags,
 * so you can share /p/<slug> directly or point a /s/ share link at it.
 */
export default defineEventHandler(async (event) => {
  const post = await findPost(getRouterParam(event, 'slug'), getRequestURL(event).origin)
  if (!post) return notFoundPage(event, 'post', getRouterParam(event, 'slug'))

  const e = escapeHtml
  const reqUrl = getRequestURL(event)
  const url = `${reqUrl.origin}/p/${post.slug}${reqUrl.search}`
  const date = new Date(post.updatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  const paragraphs = post.body
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${e(p).replace(/\n/g, '<br>')}</p>`)
    .join('\n      ')

  setHeader(event, 'cache-control', 'no-store, max-age=0')
  setHeader(event, 'content-type', 'text/html; charset=utf-8')

  const q = getQuery(event)
  const ua = getHeader(event, 'user-agent') || ''
  const platform = parsePlatform(q.as) || platformFromUA(ua)
  const view = applyOverride({ siteName: post.siteName, title: post.title, description: post.excerpt, image: post.cover }, platform ? post.platforms?.[platform] : undefined)
  const baseExtra = { author: post.author || undefined, ...post.extra }
  setHeader(event, 'vary', 'User-Agent')
  const meta = renderMetaTags({
    url, ...view, imageStyle: post.imageStyle, defaultType: 'article',
    extra: view.imageOverridden ? { ...baseExtra, imageWidth: undefined, imageHeight: undefined, imageAlt: undefined } : baseExtra,
    fbAppId: String(useRuntimeConfig(event).facebookAppId || '') || undefined,
  }).filter((t) => !t.startsWith('<title>')).join('\n    ')

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${e(view.title)}${view.siteName ? ` · ${e(view.siteName)}` : ''}</title>
    ${meta}
    <style>
      :root { color-scheme: light dark; --muted: #6b7280; }
      body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans Khmer', sans-serif; line-height: 1.7; }
      header.site { padding: 14px 20px; border-bottom: 1px solid #8883; font-weight: 700; }
      main { max-width: 720px; margin: 0 auto; padding: 28px 20px 60px; }
      .cover { width: 100%; border-radius: 12px; display: block; margin-bottom: 24px; }
      h1 { font-size: clamp(26px, 5vw, 38px); line-height: 1.25; margin: 0 0 8px; }
      .meta { color: var(--muted); font-size: 14px; margin-bottom: 20px; }
      .lead { font-size: 19px; color: var(--muted); }
      p { font-size: 17px; }
    </style>
  </head>
  <body>
    ${post.siteName ? `<header class="site">${e(post.siteName)}</header>` : ''}
    <main>
      ${post.cover ? `<img class="cover" src="${e(post.cover)}" alt="${e(post.extra?.imageAlt || '')}">` : ''}
      ${post.extra?.videoUrl && /\.(mp4|webm|mov)(\?|$)/i.test(post.extra.videoUrl) ? `<video class="cover" src="${e(post.extra.videoUrl)}" controls playsinline${post.cover ? ` poster="${e(post.cover)}"` : ''}></video>` : ''}
      ${post.extra?.audioUrl ? `<audio src="${e(post.extra.audioUrl)}" controls style="width:100%;margin-bottom:20px"></audio>` : ''}
      <h1>${e(post.title)}</h1>
      <div class="meta">${post.author ? `${e(post.author)} · ` : ''}${date}</div>
      ${post.excerpt ? `<p class="lead">${e(post.excerpt)}</p>` : ''}
      ${paragraphs}
    </main>
  </body>
</html>`
})
