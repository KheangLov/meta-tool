/** Publish the newest link to your Facebook Page. Body: { owner, template } */
export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const body = (await readBody(event)) || {}
  const owner = String(body.owner || '')
  const template = String(body.template ?? '{title}').slice(0, 5000)
  const target = await latestTarget(owner, getRequestURL(event).origin)
  // Facebook shows the link as a card, so drop {link} from the text unless the user typed other text around it
  const message = renderTemplate(template, target, false).replaceAll(target.url, '').replace(/<[^>]+>/g, '').trim()
  const post = await facebookPagePost(message, target.url)
  const rec: SentRecord = {
    id: randomSlug(10), owner, via: 'fbpage', chat: 'page', chatId: facebookPage().id, chatTitle: 'Facebook Page',
    messageId: 0, externalId: post.id, template, options: cleanSendOptions({}), url: target.url,
    messageLink: post.permalink || undefined, sentAt: new Date().toISOString(), lastStatus: 'sent',
  }
  const list = await listSent(owner)
  list.unshift(rec)
  await saveSent(owner, list.slice(0, 50))
  return rec
})
