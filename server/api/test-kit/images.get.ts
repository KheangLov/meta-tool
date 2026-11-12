export default defineEventHandler((event) => {
  const origin = getRequestURL(event).origin
  return TEST_IMAGES.map((i) => ({ ...i, url: `${origin}/test/${i.file}` }))
})
