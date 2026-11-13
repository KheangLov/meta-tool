export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const post = await findPost(getRouterParam(event, 'slug'), getRequestURL(event).origin)
  if (!post) throw createError({ statusCode: 404, statusMessage: 'Post not found' })
  return post
})
