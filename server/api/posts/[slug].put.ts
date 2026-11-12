export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const post = await getPost(getRouterParam(event, 'slug'))
  if (!post) throw createError({ statusCode: 404, statusMessage: 'Post not found' })
  return await savePost(post.slug, cleanPost((await readBody(event)) || {}), post)
})
