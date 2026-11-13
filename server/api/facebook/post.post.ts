/** Publish a link to your Facebook Page. Body: { owner, template, target: { url, title, description } } */
export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const body = (await readBody(event)) || {}
  const template = String(body.template ?? '{title}').slice(0, 5000)
  const target = cleanTarget(body.target)
  // Facebook shows the link as a card, so the URL itself is removed from the text
  const message = renderTemplate(template, target, false).replaceAll(target.url, '').replace(/<[^>]+>/g, '').trim()
  const post = await facebookPagePost(message, target.url)
  const rec: SentRecord = {
    id: randomSlug(10), owner: String(body.owner || ''), via: 'fbpage', chat: 'page', chatId: facebookPage().id, chatTitle: 'Facebook Page',
    messageId: 0, externalId: post.id, template, options: cleanSendOptions({}), url: target.url,
    messageLink: post.permalink || undefined, sentAt: new Date().toISOString(), lastStatus: 'sent',
  }
  return rec
})
