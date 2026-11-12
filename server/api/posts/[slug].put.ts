const POST_PREVIEW_FIELDS = ['siteName', 'title', 'excerpt', 'cover', 'imageStyle'] as const

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const before = await getPost(getRouterParam(event, 'slug'))
  if (!before) throw createError({ statusCode: 404, statusMessage: 'Post not found' })
  const post = await savePost(before.slug, cleanPost((await readBody(event)) || {}), before)
  const previewChanged = POST_PREVIEW_FIELDS.some((k) => post[k] !== before[k])
  const syncedLinks = previewChanged ? await syncLinksForPost(post) : []
  return { ...post, previewChanged, syncedLinks }
})
