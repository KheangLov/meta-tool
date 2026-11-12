/**
 * Sends a message with a fully customised link preview, and remembers it so it can be updated later.
 * Body: { owner: 'link:<slug>'|'post:<slug>', via: 'account'|'bot', chat, template, options }
 */
export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const body = (await readBody(event)) || {}
  const owner = String(body.owner || '')
  const via = body.via === 'bot' ? 'bot' : 'account'
  const chat = String(body.chat || (via === 'account' ? 'me' : '')).trim()
  const options = cleanSendOptions(body.options)
  const template = String(body.template ?? '{link}').slice(0, 4096)

  const target = await latestTarget(owner, getRequestURL(event).origin)
  const text = renderTemplate(template, target, options.parseMode === 'html')
  if (!text.trim()) throw createError({ statusCode: 400, statusMessage: 'Message text is empty' })

  const sent = via === 'bot'
    ? await sendViaBot(chat, text, target.url, options)
    : await withTelegram((client) => sendViaAccount(client, chat, text, target.url, options))

  const rec: SentRecord = {
    id: randomSlug(10), owner, via, chat, ...sent, template, options,
    url: target.url, sentAt: new Date().toISOString(), lastStatus: 'sent',
  }
  const list = await listSent(owner)
  list.unshift(rec)
  await saveSent(owner, list.slice(0, 50))
  return rec
})
