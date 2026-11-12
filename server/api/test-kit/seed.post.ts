/**
 * Creates (or resets) the sample posts plus a /s/test-… share link for each one.
 * Safe to run again: it only overwrites slugs starting with sample- and test-.
 */
export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const origin = getRequestURL(event).origin
  const img = (f: string) => (f ? `${origin}/test/${f}` : '')
  const now = new Date().toISOString()
  const created: { case: string; post?: string; link: string }[] = []

  for (const s of SAMPLES) {
    const existing = await getPost(s.slug)
    await savePost(s.slug, {
      siteName: s.post.siteName, title: s.post.title, excerpt: s.post.excerpt, body: s.post.body,
      cover: img(s.post.image), imageStyle: s.post.imageStyle, author: s.post.author,
    }, existing)

    const linkSlug = s.slug.replace(/^sample-/, 'test-')
    const old = await getLink(linkSlug)
    const link: LinkMeta = {
      slug: linkSlug,
      targetUrl: `${origin}/p/${s.slug}`,
      siteName: s.post.siteName,
      title: s.post.title,
      description: s.post.excerpt,
      image: img(s.post.image),
      imageStyle: s.post.imageStyle,
      version: (old?.version || 0) + 1,
      createdAt: old?.createdAt || now,
      updatedAt: now,
    }
    await linkStore().setItem(linkSlug, link)
    created.push({ case: s.case, post: `/p/${s.slug}`, link: `/s/${linkSlug}` })
  }

  const o = OVERRIDE_LINK
  const base = SAMPLES.find((s) => s.slug === o.target)!
  const old = await getLink(o.slug)
  await linkStore().setItem(o.slug, {
    slug: o.slug,
    targetUrl: `${origin}/p/${o.target}`,
    siteName: base.post.siteName,
    title: o.title,
    description: o.description,
    image: img(o.image),
    imageStyle: 'large',
    version: (old?.version || 0) + 1,
    createdAt: old?.createdAt || now,
    updatedAt: now,
  })
  created.push({ case: o.case, link: `/s/${o.slug}` })

  return { created }
})
