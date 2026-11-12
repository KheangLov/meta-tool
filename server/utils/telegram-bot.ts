/**
 * Telegram Bot API (plain HTTPS). Set NUXT_TELEGRAM_BOT_TOKEN (from @BotFather).
 * A bot can post to channels/groups where it is an admin, or to people who have started it.
 */
export function botToken() {
  return String(useRuntimeConfig().telegramBotToken || '')
}
export function botConfigured() {
  return !!botToken()
}

export async function botCall<T = any>(method: string, params: Record<string, unknown>): Promise<T> {
  if (!botConfigured()) throw createError({ statusCode: 501, statusMessage: 'Telegram bot is not connected. Set NUXT_TELEGRAM_BOT_TOKEN (see README).' })
  let res: Response
  try {
    res = await fetch(`https://api.telegram.org/bot${botToken()}/${method}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(params),
      signal: AbortSignal.timeout(20_000),
    })
  } catch (e: any) {
    throw createError({ statusCode: 502, statusMessage: `Telegram Bot API unreachable: ${e?.message || e}` })
  }
  const data: any = await res.json().catch(() => ({}))
  if (!data.ok) {
    const err: any = createError({ statusCode: data.error_code === 429 ? 429 : 400, statusMessage: `Telegram bot: ${data.description || res.statusText}` })
    err.botDescription = String(data.description || '')
    throw err
  }
  return data.result as T
}
