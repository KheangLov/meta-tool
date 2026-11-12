export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const body = (await readBody(event)) || {}
  let slug = String(body.slug || '').trim()
  if (slug && !SLUG_RE.test(slug)) throw createError({ statusCode: 400, statusMessage: 'Slug: 3–64 characters, letters, numbers, - or _' })
  if (slug && (await postStore().hasItem(slug))) throw createError({ statusCode: 409, statusMessage: 'That slug is already used' })
  if (!slug) {
    do slug = randomSlug()
    while (await postStore().hasItem(slug))
  }
  return await savePost(slug, cleanPost(body))
})
