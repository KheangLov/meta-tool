/** Unpublishes a link or post (deletes its file from GitHub). Query: ?kind=link|post&slug=… */
export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const q = getQuery(event)
  const kind = q.kind === 'post' ? 'post' : q.kind === 'link' ? 'link' : ''
  const slug = String(q.slug || '')
  if (!kind || !SLUG_RE.test(slug)) throw createError({ statusCode: 400, statusMessage: 'Provide kind and slug' })
  await deleteFile(`published/${kind}s/${slug}.json`, `Unpublish ${kind} ${slug}`)
  return { ok: true }
})
