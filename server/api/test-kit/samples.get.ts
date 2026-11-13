/** The built-in sample posts and test links, so the browser can copy them into its local database. */
export default defineEventHandler((event) => {
  requireAdmin(event)
  const origin = getRequestURL(event).origin
  return {
    posts: SAMPLES.map((s) => samplePost(s.slug, origin)!),
    links: SAMPLE_LINK_SLUGS.map((slug) => {
      const l = sampleLink(slug, origin)!
      const s = SAMPLES.find((x) => x.slug.replace(/^sample-/, 'test-') === slug)
      return { ...l, case: s?.case || (slug === OVERRIDE_LINK.slug ? OVERRIDE_LINK.case : PER_APP_LINK.case) }
    }),
  }
})
