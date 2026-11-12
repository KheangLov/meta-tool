/** Checks the Telegram connection and returns which account is logged in. */
export default defineEventHandler(async (event) => {
  requireAdmin(event)
  if (!telegramConfigured()) return { configured: false }
  return await withTelegram(async (client) => {
    const me = await client.getMe()
    return {
      configured: true,
      account: { id: String(me.id), username: me.username || '', name: [me.firstName, me.lastName].filter(Boolean).join(' ') },
    }
  })
})
