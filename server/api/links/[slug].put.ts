export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const slug = getRouterParam(event, 'slug')
  const link = await findLink(slug, getRequestURL(event).origin)
  if (!link) throw createError({ statusCode: 404, statusMessage: 'Link not found' })

  const body = (await readBody(event)) || {}
  const fields = cleanFields(body, true)
  const next: LinkMeta = { ...link, ...fields, updatedAt: new Date().toISOString() }

  if (body.syncWithPost !== undefined) next.syncWithPost = !!body.syncWithPost && !!link.postSlug
  if (next.syncWithPost && next.postSlug) {
    // A synced link always shows the post's current preview
    const post = await findPost(next.postSlug, getRequestURL(event).origin)
    if (post) Object.assign(next, previewFromPost(post))
    else next.syncWithPost = false
  }

  // Any change to what the preview shows gets a new version → new ?v= URL Telegram hasn't cached yet
  const previewChanged = linkPreviewDiffers(next, link)
  if (previewChanged) next.version = link.version + 1

  await linkStore().setItem(link.slug, next)
  return { ...next, previewChanged }
})
