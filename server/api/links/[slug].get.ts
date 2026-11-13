export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const link = await findLink(getRouterParam(event, 'slug'), getRequestURL(event).origin)
  if (!link) throw createError({ statusCode: 404, statusMessage: 'Link not found' })
  return link
})
