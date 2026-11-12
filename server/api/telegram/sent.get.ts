/** Messages this tool has sent for a link or post. Query: ?owner=link:<slug> */
export default defineEventHandler(async (event) => {
  requireAdmin(event)
  return await listSent(String(getQuery(event).owner || ''))
})
