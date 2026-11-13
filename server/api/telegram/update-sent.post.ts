/**
 * Edits messages the tool sent so they show the newest preview (points them at the newest ?v= URL,
 * which Telegram hasn't cached yet). Body: { records: SentRecord[], target: { url, title, description } }
 * Returns the updated records for the browser to save.
 */
export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const body = (await readBody(event)) || {}
  const target = cleanTarget(body.target)
  const records: SentRecord[] = (Array.isArray(body.records) ? body.records : []).slice(0, 50)
  // Facebook doesn't let apps change the link card of a published post
  const todo = records.filter((r) => r && (r.via === 'account' || r.via === 'bot') && Number(r.messageId) > 0)

  const run = async (client?: any) => {
    for (const rec of todo) {
      rec.options = cleanSendOptions(rec.options)
      const text = renderTemplate(String(rec.template ?? '{link}'), target, rec.options.parseMode === 'html')
      try {
        rec.lastStatus = rec.via === 'bot' ? await editViaBot(rec, text, target.url) : await editViaAccount(client, rec, text, target.url)
        rec.url = target.url
        rec.updatedAt = new Date().toISOString()
        rec.lastError = undefined
      } catch (e: any) {
        rec.lastStatus = 'error'
        rec.lastError = e?.statusMessage || e?.errorMessage || e?.message || String(e)
      }
    }
  }
  if (todo.some((r) => r.via === 'account')) await withTelegram(async (client) => { await run(client) })
  else await run()
  return { results: todo }
})
