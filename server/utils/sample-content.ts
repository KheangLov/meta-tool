import type { H3Event } from 'h3'
/**
 * The built-in sample posts and test links, built from code. Pages fall back to these when they're
 * missing from storage, so the samples always open, even before "Create sample posts" or without a database.
 */
const SAMPLE_DATE = '2026-11-12T00:00:00.000Z'
const img = (origin: string, f?: string) => (f ? `${origin}/test/${f}` : '')
const extraFor = (origin: string, x?: PreviewExtra) =>
  cleanExtra({ ...x, videoUrl: x?.videoUrl && img(origin, x.videoUrl), audioUrl: x?.audioUrl && img(origin, x.audioUrl) })

export function samplePost(slug: string, origin: string): Post | null {
  const s = SAMPLES.find((x) => x.slug === slug)
  if (!s) return null
  return {
    slug: s.slug, siteName: s.post.siteName, title: s.post.title, excerpt: s.post.excerpt, body: s.post.body,
    cover: img(origin, s.post.image), imageStyle: s.post.imageStyle, author: s.post.author,
    extra: extraFor(origin, s.extra), platforms: {}, version: 1, createdAt: SAMPLE_DATE, updatedAt: SAMPLE_DATE,
  }
}

export function sampleLink(slug: string, origin: string): LinkMeta | null {
  const base = { version: 1, createdAt: SAMPLE_DATE, updatedAt: SAMPLE_DATE }
  const s = SAMPLES.find((x) => x.slug.replace(/^sample-/, 'test-') === slug)
  if (s) {
    return {
      ...base, slug, targetUrl: `${origin}/p/${s.slug}`, siteName: s.post.siteName, title: s.post.title,
      description: s.post.excerpt, image: img(origin, s.post.image), imageStyle: s.post.imageStyle,
      extra: cleanExtra({ author: s.post.author, ...extraFor(origin, s.extra) }), postSlug: s.slug, syncWithPost: true,
    }
  }
  if (slug === OVERRIDE_LINK.slug) {
    const o = OVERRIDE_LINK
    const t = SAMPLES.find((x) => x.slug === o.target)!
    return {
      ...base, slug, targetUrl: `${origin}/p/${o.target}`, siteName: t.post.siteName, title: o.title,
      description: o.description, image: img(origin, o.image), imageStyle: 'large', postSlug: o.target, syncWithPost: false,
    }
  }
  if (slug === PER_APP_LINK.slug) {
    const pa = PER_APP_LINK
    return {
      ...base, slug, targetUrl: `${origin}/p/${pa.target}`, ...pa.base, image: img(origin, pa.base.image), imageStyle: 'large',
      platforms: cleanOverrides(Object.fromEntries(Object.entries(pa.platforms).map(([k, v]) => [k, { ...v, image: img(origin, v.image) }]))),
      postSlug: pa.target, syncWithPost: false,
    }
  }
  return null
}

export const SAMPLE_LINK_SLUGS = [...SAMPLES.map((s) => s.slug.replace(/^sample-/, 'test-')), OVERRIDE_LINK.slug, PER_APP_LINK.slug]

/** Saved post, or the built-in sample with that slug */
export async function findPost(slug: string | undefined, origin: string) {
  return (await getPost(slug)) || (slug ? samplePost(slug, origin) : null)
}
/** Saved link, or the built-in test link with that slug */
export async function findLink(slug: string | undefined, origin: string) {
  const saved = await getLink(slug)
  if (saved) return saved
  const sample = slug ? sampleLink(slug, origin) : null
  // A built-in test link that follows its post shows the post's current (possibly edited) preview
  if (sample?.syncWithPost && sample.postSlug) {
    const post = await findPost(sample.postSlug, origin)
    if (post) return { ...sample, ...previewFromPost(post), version: post.version || 1 }
  }
  return sample
}

/** A real, styled page for links/posts that don't exist (still HTTP 404, so crawlers don't index it) */
export function notFoundPage(event: H3Event, what: 'post' | 'link', slug = '') {
  setResponseStatus(event, 404)
  setHeader(event, 'content-type', 'text/html; charset=utf-8')
  setHeader(event, 'cache-control', 'no-store, max-age=0')
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${what === 'post' ? 'Post' : 'Link'} not found</title><meta name="robots" content="noindex">
<style>body{margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Noto Sans Khmer',sans-serif;display:grid;place-items:center;min-height:100vh;background:#f4f5f7;color:#16181d}
main{max-width:460px;padding:32px;background:#fff;border:1px solid #e4e6eb;border-radius:16px;text-align:center}
h1{font-size:22px;margin:8px 0}p{color:#6b7280;line-height:1.6}a{display:inline-block;margin-top:8px;background:#2481cc;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;font-weight:600}</style></head>
<body><main><div style="font-size:40px">🔍</div><h1>This ${what} isn't available</h1>
<p id="why">It may have been deleted, or the address is mistyped.</p><a id="go" href="/">Go to the home page</a></main>
<script>
// If this browser made the ${what} but it was never published, say so (and link to the editor)
(function () {
  var slug = ${JSON.stringify(slug)}, store = ${JSON.stringify(what === 'link' ? 'links' : 'posts')}
  if (!slug || !window.indexedDB) return
  var req = indexedDB.open('link-preview-studio')
  req.onupgradeneeded = function () { req.transaction.abort() } // no local data: don't create a database
  req.onsuccess = function () {
    var db = req.result
    if (!db.objectStoreNames.contains(store)) return
    var get = db.transaction(store).objectStore(store).get(slug)
    get.onsuccess = function () {
      if (!get.result) return
      document.getElementById('why').textContent = 'This ${what} is saved in this browser but has not been published yet, so apps and other people cannot see it.' + (get.result.publishError ? ' Last error: ' + get.result.publishError : '')
      var a = document.getElementById('go')
      a.textContent = 'Open it and publish'
      a.href = '/${what === 'link' ? 'links' : 'posts'}/' + encodeURIComponent(slug)
    }
  }
})()
</script></body></html>`
}
