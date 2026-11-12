export default defineEventHandler((event) => {
  const origin = getRequestURL(event).origin
  return TEST_MEDIA.map((m) => ({ ...m, url: `${origin}/test/${m.file}` }))
})
