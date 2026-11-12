export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const link = await getLink(getRouterParam(event, 'slug'))
  if (!link) throw createError({ statusCode: 404, statusMessage: 'Link not found' })
  await linkStore().removeItem(link.slug)
  return { ok: true }
})
