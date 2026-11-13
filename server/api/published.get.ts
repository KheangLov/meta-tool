/** Everything that's published, so another browser/device can restore its local copy. */
export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const read = async <T>(kind: 'links' | 'posts') => {
    const names = (await listDir(`published/${kind}`)).filter((n) => n.endsWith('.json')).slice(0, 300)
    const items = await Promise.all(names.map((n) => readJson<T>(`published/${kind}/${n}`).catch(() => null)))
    return items.filter(Boolean) as T[]
  }
  const [links, posts] = await Promise.all([read<LinkMeta>('links'), read<Post>('posts')])
  return { links, posts, target: publishTarget() }
})
