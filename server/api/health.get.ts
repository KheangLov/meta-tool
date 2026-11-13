export default defineEventHandler((event) => {
  const cfg = storageConfig()
  return {
    storage: cfg.kind,
    storageEnv: cfg.envKey,
    storageHints: cfg.kind === 'memory' ? storageHints() : [],
    adminTokenSet: !!useRuntimeConfig(event).adminToken,
    telegram: telegramConfigured(),
    telegramBot: botConfigured(),
    facebook: facebookConfigured(),
    facebookPage: facebookPageConfigured(),
    facebookAppId: String(useRuntimeConfig(event).facebookAppId || ''),
    uploads: blobConfigured() ? 'blob' : cfg.kind,
  }
})
