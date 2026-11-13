/**
 * Saves (or resets) the sample posts and test links so they can be edited.
 * They're built from the same definitions the pages fall back to, so they also work before this is run.
 */
export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const origin = getRequestURL(event).origin
  const now = new Date().toISOString()
  const created: { case: string; post?: string; link: string }[] = []

  for (const s of SAMPLES) {
    const fresh = samplePost(s.slug, origin)!
    const existing = await getPost(s.slug)
    await postStore().setItem(s.slug, { ...fresh, version: (existing?.version || 0) + 1, createdAt: existing?.createdAt || now, updatedAt: now })
  }
  for (const slug of SAMPLE_LINK_SLUGS) {
    const fresh = sampleLink(slug, origin)!
    const old = await getLink(slug)
    await linkStore().setItem(slug, { ...fresh, version: (old?.version || 0) + 1, createdAt: old?.createdAt || now, updatedAt: now })
    const s = SAMPLES.find((x) => x.slug.replace(/^sample-/, 'test-') === slug)
    created.push({
      case: s?.case || (slug === OVERRIDE_LINK.slug ? OVERRIDE_LINK.case : PER_APP_LINK.case),
      post: s ? `/p/${s.slug}` : undefined,
      link: `/s/${slug}`,
    })
  }
  return { created }
})
