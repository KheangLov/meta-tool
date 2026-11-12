// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2026-11-01',
  devtools: { enabled: false },

  // The editor is a client-side app (admin token lives in localStorage).
  // Server routes (/s/:slug and /api/*) still run on the server.
  ssr: false,

  css: ['~/assets/css/main.css'],

  app: {
    head: {
      title: 'Link Preview Studio',
      meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1' }],
    },
  },

  runtimeConfig: {
    // Set NUXT_ADMIN_TOKEN in Vercel → Project → Settings → Environment Variables
    adminToken: '',
    // Telegram user account used to talk to @WebpageBot (see README → "Connect Telegram")
    telegramApiId: '',
    telegramApiHash: '',
    telegramSession: '',
    // Optional bot (from @BotFather) for posting to channels/groups
    telegramBotToken: '',
  },

  nitro: {
    // Talking to @WebpageBot can take 10–20 s
    vercel: { functions: { maxDuration: 60 } },
  },
})
