/**
 * Create a link. Body: { targetUrl, slug?, importMeta? }
 * When importMeta is true (default), the target page's current Open Graph tags are copied in as a starting point.
 */
export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const body = (await readBody(event)) || {}
  const fields = cleanFields(body)

  let slug = String(body.slug || '').trim()
  if (slug && !SLUG_RE.test(slug)) {
    throw createError({ statusCode: 400, statusMessage: 'Slug: 3–64 characters, letters, numbers, - or _' })
  }
  const store = linkStore()
  if (slug && (await store.hasItem(slug))) throw createError({ statusCode: 409, statusMessage: 'That slug is already used' })
  if (!slug) {
    do slug = randomSlug()
    while (await store.hasItem(slug))
  }

  let imported = { siteName: '', title: '', description: '', image: '' }
  if (body.importMeta !== false) {
    const r = await scrapeAsTelegram(fields.targetUrl!)
    if (r.ok) imported = r.resolved
  }

  const now = new Date().toISOString()
  const link: LinkMeta = {
    slug,
    targetUrl: fields.targetUrl!,
    siteName: fields.siteName ?? imported.siteName,
    title: fields.title ?? imported.title,
    description: fields.description ?? imported.description,
    image: fields.image ?? imported.image,
    imageStyle: fields.imageStyle ?? 'large',
    version: 1,
    createdAt: now,
    updatedAt: now,
  }
  await store.setItem(slug, link)
  return link
})
