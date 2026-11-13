/** Deletes a message/post the tool sent. Body: { record } */
export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const rec = ((await readBody(event)) || {}).record as SentRecord
  if (!rec?.via) throw createError({ statusCode: 400, statusMessage: 'Missing record' })
  if (rec.via === 'fbpage') await facebookPageDelete(String(rec.externalId))
  else if (rec.via === 'bot') await deleteViaBot(rec)
  else await withTelegram((client) => deleteViaAccount(client, rec))
  return { ok: true }
})
