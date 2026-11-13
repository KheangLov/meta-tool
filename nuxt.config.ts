// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2026-11-01',
  devtools: { enabled: false },

  // The editor is a client-side app (admin token lives in localStorage).
  // Server routes (/s/:slug and /api/*) still run on the server.
  ssr: false,

  modules: ['@squirkle-ui/nuxt'],

  // Squirkle UI (KheangLov/squirkle-ui): components, squircle shapes, light/dark themes
  squirkle: {
    theme: {
      defaultTheme: 'light',
      themes: {
        light: {
          dark: false,
          colors: {
            primary: '#0e6b55', 'on-primary': '#ffffff',
            success: '#1f8f5f', warning: '#e6a23c', error: '#c43d3d',
            background: '#f2f4f1', surface: '#ffffff', 'surface-variant': '#e9eee8', 'surface-raised': '#ffffff',
            'on-background': '#16201b', 'on-surface': '#16201b', 'on-surface-variant': '#56645d',
            muted: '#7a877f', border: '#dde3dc', 'border-strong': '#c6cfc5',
          },
        },
        dark: {
          dark: true,
          colors: {
            primary: '#45c79c', 'on-primary': '#04211a',
            success: '#45c79c', warning: '#f0b450', error: '#ef6b6b',
            background: '#0c110f', surface: '#141a17', 'surface-variant': '#1c2420', 'surface-raised': '#18201c',
            'on-background': '#e4ebe7', 'on-surface': '#e4ebe7', 'on-surface-variant': '#a3b1a9',
            muted: '#7b8a82', border: '#25302b', 'border-strong': '#34413a',
          },
        },
      },
    },
    appearance: { font: "'Instrument Sans', 'Noto Sans Khmer', ui-sans-serif, system-ui, sans-serif", radiusScale: 1, smoothing: 0.6 },
    squircle: { mode: 'auto' },
  },

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
