// One-time setup: logs a Telegram account in and prints the session string
// to put in NUXT_TELEGRAM_SESSION. Run on your own computer: npm run telegram:login
import { createInterface } from 'node:readline/promises'
import { stdin, stdout } from 'node:process'
import { TelegramClient } from 'telegram'
import { StringSession } from 'telegram/sessions/index.js'

const rl = createInterface({ input: stdin, output: stdout })
const ask = (q) => rl.question(q)

console.log('\nGet api_id and api_hash at https://my.telegram.org → API development tools.')
console.log('Tip: use a separate Telegram account for this tool, not your personal one.\n')

const apiId = Number(process.env.NUXT_TELEGRAM_API_ID || (await ask('api_id: ')))
const apiHash = process.env.NUXT_TELEGRAM_API_HASH || (await ask('api_hash: '))

const client = new TelegramClient(new StringSession(''), apiId, apiHash, { connectionRetries: 3 })
client.setLogLevel('error')

await client.start({
  phoneNumber: () => ask('Phone number (with country code, e.g. +855…): '),
  phoneCode: () => ask('Login code Telegram sent you: '),
  password: () => ask('2-step verification password (leave empty if none): '),
  onError: (err) => console.error('Error:', err.message),
})

const me = await client.getMe()
console.log(`\nLogged in as ${me.firstName ?? ''} ${me.username ? '@' + me.username : ''}`)
console.log('\nAdd these to Vercel → Settings → Environment Variables (and to .env for local dev):\n')
console.log(`NUXT_TELEGRAM_API_ID=${apiId}`)
console.log(`NUXT_TELEGRAM_API_HASH=${apiHash}`)
console.log(`NUXT_TELEGRAM_SESSION=${client.session.save()}`)
console.log('\nKeep the session string secret — it gives full access to that Telegram account.\n')

rl.close()
await client.destroy()
process.exit(0)
