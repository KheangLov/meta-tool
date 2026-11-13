/**
 * Publishes a link or post: writes published/<kind>s/<slug>.json to your GitHub repo.
 * Body: { kind: 'link' | 'post', item }
 */
export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const { kind, item } = (await readBody(event)) || {}
  if (!item || typeof item !== 'object') throw createError({ statusCode: 400, statusMessage: 'Missing item' })
  const slug = String(item.slug || '')
  if (!SLUG_RE.test(slug)) throw createError({ statusCode: 400, statusMessage: 'Slug: 3–64 characters, letters, numbers, - or _' })
  const now = new Date().toISOString()
  const version = Math.max(1, Math.round(Number(item.version) || 1))
  const dates = { createdAt: String(item.createdAt || now).slice(0, 40), updatedAt: now }

  let data: LinkMeta | Post
  if (kind === 'link') {
    const f = cleanFields(item)
    data = {
      slug, targetUrl: f.targetUrl!, siteName: f.siteName || '', title: f.title || '', description: f.description || '',
      image: f.image || '', imageStyle: f.imageStyle || 'large', extra: f.extra || {}, platforms: f.platforms || {},
      version, ...(item.postSlug && SLUG_RE.test(item.postSlug) ? { postSlug: item.postSlug, syncWithPost: !!item.syncWithPost } : {}),
      ...dates,
    }
  } else if (kind === 'post') {
    const f = cleanPost(item)
    data = {
      slug, siteName: f.siteName || '', title: f.title || 'Untitled post', excerpt: f.excerpt || '', body: f.body || '',
      cover: f.cover || '', imageStyle: f.imageStyle || 'large', author: f.author || '', extra: f.extra || {},
      platforms: f.platforms || {}, version, ...dates,
    }
  } else {
    throw createError({ statusCode: 400, statusMessage: 'kind must be "link" or "post"' })
  }

  await writeFile(`published/${kind}s/${slug}.json`, JSON.stringify(data, null, 2) + '\n', `Publish ${kind} ${slug} v${version}`)
  return { ok: true, item: data, target: publishTarget() }
})
