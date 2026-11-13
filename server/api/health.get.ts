export default defineEventHandler((event) => {
  const g = githubConfig()
  return {
    publish: publishTarget(),
    githubRepo: g.repo,
    githubBranch: g.branch,
    adminTokenSet: !!useRuntimeConfig(event).adminToken,
    telegram: telegramConfigured(),
    telegramBot: botConfigured(),
    facebook: facebookConfigured(),
    facebookPage: facebookPageConfigured(),
    facebookAppId: String(useRuntimeConfig(event).facebookAppId || ''),
    uploads: uploadTarget(),
  }
})
