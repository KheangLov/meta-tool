/**
 * Sends a message with a customised link preview. Returns a record the browser keeps (in IndexedDB)
 * so the message can be updated later.
 * Body: { owner, via: 'account'|'bot', chat, template, options, target: { url, title, description } }
 */
export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const body = (await readBody(event)) || {}
  const via = body.via === 'bot' ? 'bot' : 'account'
  const chat = String(body.chat || (via === 'account' ? 'me' : '')).trim()
  const options = cleanSendOptions(body.options)
  const template = String(body.template ?? '{link}').slice(0, 4096)
  const target = cleanTarget(body.target)
  const text = renderTemplate(template, target, options.parseMode === 'html')
  if (!text.trim()) throw createError({ statusCode: 400, statusMessage: 'Message text is empty' })

  const sent = via === 'bot'
    ? await sendViaBot(chat, text, target.url, options)
    : await withTelegram((client) => sendViaAccount(client, chat, text, target.url, options))

  const rec: SentRecord = {
    id: randomSlug(10), owner: String(body.owner || ''), via, chat, ...sent, template, options,
    url: target.url, sentAt: new Date().toISOString(), lastStatus: 'sent',
  }
  return rec
})
