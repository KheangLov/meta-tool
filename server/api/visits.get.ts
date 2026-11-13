/** Recent visits by apps' crawlers to a share link or post (best effort, in memory). ?slug=&kind=link|post */
export default defineEventHandler((event) => {
  requireAdmin(event)
  const q = getQuery(event)
  return listVisits(q.slug ? String(q.slug) : undefined, q.kind ? String(q.kind) : undefined)
})
