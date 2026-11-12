/**
 * Edits messages this tool sent so they show the newest preview.
 * Each edit points the preview at the newest ?v= URL, which Telegram hasn't cached yet,
 * so it always fetches the latest title, description and image.
 * Body: { owner, ids? }
 */
export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const body = (await readBody(event)) || {}
  const owner = String(body.owner || '')
  const target = await latestTarget(owner, getRequestURL(event).origin)
  const list = await listSent(owner)
  // Facebook doesn't let apps change the link card of a published post, so only Telegram messages are edited
  const todo = list.filter((r) => r.via !== 'fbpage' && (!body.ids || body.ids.includes(r.id)))

  const run = async (client?: any) => {
    for (const rec of todo) {
      const text = renderTemplate(rec.template, target, rec.options.parseMode === 'html')
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

  const needsAccount = todo.some((r) => r.via === 'account')
  if (needsAccount) await withTelegram(async (client) => { await run(client) })
  else await run()

  await saveSent(owner, list)
  return { url: target.url, results: todo }
})
