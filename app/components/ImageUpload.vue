<script setup lang="ts">
/**
 * Upload button + drop/paste zone for an image field.
 * Big photos are resized in the browser (max 2400 px, JPEG) so they fit Vercel's 4.5 MB request limit
 * and load quickly for Telegram.
 */
const emit = defineEmits<{ uploaded: [url: string] }>()
const api = useApi()
const input = ref<HTMLInputElement | null>(null)
const busy = ref(false)
const status = ref('')
const error = ref('')
const over = ref(false)

const MAX_SIDE = 2400
const MAX_BYTES = 3.8 * 1024 * 1024

async function prepare(file: File): Promise<Blob> {
  if (!file.type.startsWith('image/')) throw new Error('That file is not an image')
  const keepAsIs = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)
  let bmp: ImageBitmap
  try { bmp = await createImageBitmap(file) }
  catch { if (keepAsIs && file.size <= MAX_BYTES) return file; throw new Error('This browser can’t read that image. Try a JPEG or PNG.') }

  const big = Math.max(bmp.width, bmp.height) > MAX_SIDE
  if (keepAsIs && !big && file.size <= MAX_BYTES) { bmp.close(); return file }
  if (file.type === 'image/gif' && file.size <= MAX_BYTES) { bmp.close(); return file } // keep animation

  let scale = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height))
  for (let attempt = 0; attempt < 4; attempt++) {
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bmp.width * scale)
    canvas.height = Math.round(bmp.height * scale)
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#fff' // JPEG has no transparency
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', attempt ? 0.78 : 0.88))
    if (blob && blob.size <= MAX_BYTES) { bmp.close(); return blob }
    scale *= 0.75
  }
  bmp.close()
  throw new Error('Could not make the image small enough. Try a smaller file.')
}

async function upload(file: File | undefined | null) {
  if (!file || busy.value) return
  busy.value = true
  error.value = ''
  status.value = 'Preparing…'
  try {
    const blob = await prepare(file)
    status.value = `Uploading ${(blob.size / 1024).toFixed(0)} KB…`
    const form = new FormData()
    const ext = blob.type.split('/')[1] || 'jpg'
    form.append('file', blob, `${file.name.replace(/\.[^.]+$/, '') || 'image'}.${ext}`)
    const res = await api<{ url: string; bytes: number; storage: string }>('/api/uploads', { method: 'POST', body: form })
    status.value = `Uploaded (${(res.bytes / 1024).toFixed(0)} KB${res.storage === 'blob' ? ', Vercel Blob' : ''})`
    emit('uploaded', res.url)
  } catch (e) {
    error.value = errMsg(e)
    status.value = ''
  } finally {
    busy.value = false
    if (input.value) input.value.value = ''
  }
}

function onDrop(e: DragEvent) {
  over.value = false
  upload(e.dataTransfer?.files?.[0])
}
function onPaste(e: ClipboardEvent) {
  const item = [...(e.clipboardData?.items || [])].find((i) => i.type.startsWith('image/'))
  if (item) { e.preventDefault(); upload(item.getAsFile()) }
}
</script>

<template>
  <div
    class="upload" :class="{ over, busy }" tabindex="0"
    @dragover.prevent="over = true" @dragleave="over = false" @drop.prevent="onDrop" @paste="onPaste"
  >
    <button type="button" class="btn sm" :disabled="busy" @click="input?.click()">⬆ {{ busy ? 'Uploading…' : 'Upload image' }}</button>
    <span class="small muted">{{ status || 'or drop / paste an image here' }}</span>
    <span v-if="error" class="small error">{{ error }}</span>
    <input ref="input" type="file" accept="image/*" hidden @change="upload(($event.target as HTMLInputElement).files?.[0])" />
  </div>
</template>

<style scoped>
.upload { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin-top: 6px; padding: 8px 10px; border: 1.5px dashed var(--line); border-radius: 8px; font-weight: 400; outline: none; }
.upload:focus { border-color: var(--primary); }
.upload.over { border-color: var(--primary); background: #eef4fb; }
.upload.busy { opacity: .8; }
</style>
