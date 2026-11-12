/** Reads width/height from image bytes (JPEG, PNG, GIF, WebP) without extra libraries. */
export function imageDimensions(b: Buffer): { width: number; height: number } | null {
  try {
    if (b.length > 24 && b.readUInt32BE(0) === 0x89504e47) return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) }
    if (b.subarray(0, 3).toString() === 'GIF') return { width: b.readUInt16LE(6), height: b.readUInt16LE(8) }
    if (b.subarray(0, 4).toString() === 'RIFF' && b.subarray(8, 12).toString() === 'WEBP') {
      const chunk = b.subarray(12, 16).toString()
      if (chunk === 'VP8 ') return { width: b.readUInt16LE(26) & 0x3fff, height: b.readUInt16LE(28) & 0x3fff }
      if (chunk === 'VP8L') {
        const bits = b.readUInt32LE(21)
        return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 }
      }
      if (chunk === 'VP8X') return { width: b.readUIntLE(24, 3) + 1, height: b.readUIntLE(27, 3) + 1 }
    }
    if (b[0] === 0xff && b[1] === 0xd8) {
      let i = 2
      while (i < b.length - 9) {
        if (b[i] !== 0xff) { i++; continue }
        const marker = b[i + 1]!
        if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) { i += 2; continue }
        const len = b.readUInt16BE(i + 2)
        // SOF0..SOF15 except DHT(C4), JPG(C8), DAC(CC) carry the frame size
        if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
          return { height: b.readUInt16BE(i + 5), width: b.readUInt16BE(i + 7) }
        }
        i += 2 + len
      }
    }
  } catch {}
  return null
}

export type Verdict = 'ok' | 'warn' | 'error'
export interface PlatformCheck { platform: 'telegram' | 'facebook' | 'whatsapp'; verdict: Verdict; notes: string[] }

/** Checks an image against each app's published guidance */
export function checkImage(info: { bytes: number; width: number; height: number; type: string; https: boolean }): PlatformCheck[] {
  const { bytes, width: w, height: h } = info
  const kb = Math.round(bytes / 1024)
  const ratio = w && h ? w / h : 0
  const okType = /image\/(jpeg|png|gif|webp)/.test(info.type)

  const fb: PlatformCheck = { platform: 'facebook', verdict: 'ok', notes: [] }
  if (!okType) { fb.verdict = 'error'; fb.notes.push(`Unsupported type ${info.type || 'unknown'}`) }
  if (bytes > 8 * 1024 * 1024) { fb.verdict = 'error'; fb.notes.push('Over 8 MB (Facebook limit)') }
  if (w && h && (w < 200 || h < 200)) { fb.verdict = 'error'; fb.notes.push('Smaller than 200×200, so Facebook won\'t use it') }
  else if (w && h && (w < 600 || h < 315)) { fb.verdict = fb.verdict === 'ok' ? 'warn' : fb.verdict; fb.notes.push('Under 600×315, so it shows as a small thumbnail') }
  if (ratio && Math.abs(ratio - 1.91) > 0.25 && w >= 600) { fb.verdict = fb.verdict === 'ok' ? 'warn' : fb.verdict; fb.notes.push('Not 1.91:1, so Facebook will crop it') }
  if (!fb.notes.length) fb.notes.push('Large preview')

  const wa: PlatformCheck = { platform: 'whatsapp', verdict: 'ok', notes: [] }
  if (!okType) { wa.verdict = 'error'; wa.notes.push(`Unsupported type ${info.type || 'unknown'}`) }
  if (bytes > 600 * 1024) { wa.verdict = 'error'; wa.notes.push(`${kb} KB is over 600 KB, so WhatsApp drops the image`) }
  else if (bytes > 300 * 1024) { wa.verdict = 'warn'; wa.notes.push(`${kb} KB: some WhatsApp versions only show images under 300 KB`) }
  if (w && w < 300) { wa.verdict = 'error'; wa.notes.push('Narrower than 300 px') }
  if (ratio > 4) { wa.verdict = 'error'; wa.notes.push('Wider than 4:1') }
  if (!info.https) { wa.verdict = wa.verdict === 'ok' ? 'warn' : wa.verdict; wa.notes.push('Not https') }
  if (!wa.notes.length) wa.notes.push(`${kb} KB, fine`)

  const tg: PlatformCheck = { platform: 'telegram', verdict: 'ok', notes: [] }
  if (!okType) { tg.verdict = 'error'; tg.notes.push(`Unsupported type ${info.type || 'unknown'}`) }
  if (w && (w < 300 || ratio < 1)) { tg.verdict = 'warn'; tg.notes.push('Small or tall, so it usually shows as a thumbnail') }
  if (bytes > 5 * 1024 * 1024) { tg.verdict = 'warn'; tg.notes.push('Over 5 MB, which may load slowly or be skipped') }
  if (!tg.notes.length) tg.notes.push('Large preview')

  return [tg, fb, wa]
}

/** Downloads an image (max 15 MB) and returns its bytes and type */
export async function fetchImage(url: string) {
  const res = await fetch(url, {
    headers: { 'user-agent': 'Mozilla/5.0 (LinkPreviewStudio image check)', accept: 'image/*,*/*;q=0.5' },
    redirect: 'follow',
    signal: AbortSignal.timeout(12_000),
  })
  if (!res.ok) throw createError({ statusCode: 502, statusMessage: `Image answered HTTP ${res.status}` })
  const declared = Number(res.headers.get('content-length') || 0)
  if (declared > 15 * 1024 * 1024) throw createError({ statusCode: 413, statusMessage: 'Image is larger than 15 MB' })
  const data = Buffer.from(await res.arrayBuffer())
  if (data.length > 15 * 1024 * 1024) throw createError({ statusCode: 413, statusMessage: 'Image is larger than 15 MB' })
  return { data, type: (res.headers.get('content-type') || '').split(';')[0]!.trim(), finalUrl: res.url || url }
}
