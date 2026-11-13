const POST_PREVIEW_FIELDS = ['siteName', 'title', 'excerpt', 'cover', 'imageStyle'] as const

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const before = await findPost(getRouterParam(event, 'slug'), getRequestURL(event).origin)
  if (!before) throw createError({ statusCode: 404, statusMessage: 'Post not found' })
  const fields = cleanPost((await readBody(event)) || {})
  const candidate = { ...before, ...fields }
  const previewChanged = POST_PREVIEW_FIELDS.some((k) => candidate[k] !== before[k]) || !sameExtra(candidate.extra, before.extra) || !sameOverrides(candidate.platforms, before.platforms)
  if (previewChanged) fields.version = (before.version || 1) + 1
  const post = await savePost(before.slug, fields, before)
  const syncedLinks = previewChanged ? await syncLinksForPost(post) : []
  return { ...post, previewChanged, syncedLinks }
})
