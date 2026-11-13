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
      htmlAttrs: { lang: 'en' },
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        { name: 'theme-color', content: '#f2f4f1' },
      ],
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400..700&family=Noto+Sans+Khmer:wght@400..700&display=swap' },
      ],
    },
  },

  runtimeConfig: {
    // Set NUXT_ADMIN_TOKEN in Vercel → Project → Settings → Environment Variables
    adminToken: '',
    // Publishing to GitHub (see README → "Publishing to GitHub")
    githubToken: '',
    githubRepo: '',
    githubBranch: 'published-data',
    githubApi: '',
    // Telegram user account used to talk to @WebpageBot (see README → "Connect Telegram")
    telegramApiId: '',
    telegramApiHash: '',
    telegramSession: '',
    // Optional bot (from @BotFather) for posting to channels/groups
    telegramBotToken: '',
    // Facebook (see README → "Connect Facebook")
    facebookAppId: '',
    facebookAppSecret: '',
    facebookAccessToken: '',
    facebookPageId: '',
    facebookPageToken: '',
  },

  nitro: {
    // Talking to @WebpageBot can take 10–20 s
    vercel: { functions: { maxDuration: 60 } },
  },
})
