export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const slug = getRouterParam(event, 'slug')
  const link = await getLink(slug)
  if (!link) throw createError({ statusCode: 404, statusMessage: 'Link not found' })

  const fields = cleanFields((await readBody(event)) || {}, true)
  const next: LinkMeta = { ...link, ...fields, updatedAt: new Date().toISOString() }

  // Any change to what the preview shows gets a new version → new ?v= URL Telegram hasn't cached yet
  const previewChanged = PREVIEW_FIELDS.some((k) => next[k] !== link[k])
  if (previewChanged) next.version = link.version + 1

  await linkStore().setItem(link.slug, next)
  return { ...next, previewChanged }
})
