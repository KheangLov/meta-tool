/** Forget a sent message. Query: ?owner=…&id=…&deleteMessage=1 also deletes it in Telegram. */
export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const q = getQuery(event)
  const owner = String(q.owner || '')
  const list = await listSent(owner)
  const rec = list.find((r) => r.id === q.id)
  if (!rec) throw createError({ statusCode: 404, statusMessage: 'Message not found' })
  if (q.deleteMessage) {
    if (rec.via === 'bot') await deleteViaBot(rec)
    else await withTelegram((client) => deleteViaAccount(client, rec))
  }
  await saveSent(owner, list.filter((r) => r.id !== rec.id))
  return { ok: true }
})
