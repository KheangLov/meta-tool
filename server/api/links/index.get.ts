export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const postSlug = getQuery(event).postSlug
  const links = await listLinks()
  return postSlug ? links.filter((l) => l.postSlug === String(postSlug)) : links
})
