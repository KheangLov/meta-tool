<script setup lang="ts">
interface ScrapeResult {
  ok: boolean; status: number; finalUrl: string; ms: number; error?: string
  tags: Record<string, string>
  resolved: { siteName: string; title: string; description: string; image: string }
}

const route = useRoute()
const api = useApi()
const slug = String(route.params.slug)

const link = ref<LinkMeta | null>(null)
const draft = reactive({ targetUrl: '', siteName: '', title: '', description: '', image: '', imageStyle: 'large' as 'large' | 'small' })
const theme = ref<'light' | 'dark'>('light')
const error = ref('')
const notice = ref('')
const saving = ref(false)
const importing = ref(false)
const imageInfo = ref<{ width: number; height: number; error: boolean } | null>(null)

const checking = ref(false)
const seen = ref<ScrapeResult | null>(null)
const showTags = ref(false)
const copied = ref('')

interface TgPreview { state: 'ready' | 'pending' | 'empty' | 'none'; url?: string; siteName?: string; title?: string; description?: string; hasLargeMedia?: boolean; image?: string }
interface TgRefresh { results: { url: string; botReplies: string[]; pressedButton?: string; preview: TgPreview }[] }

const tgReady = ref(false)
const autoRefresh = ref(true)
const withContent = ref(false)
const tgBusy = ref<'' | 'refresh' | 'cached'>('')
const tgError = ref('')
const tgRefresh = ref<TgRefresh | null>(null)
const tgCached = ref<TgPreview | null>(null)

onMounted(async () => {
  try { tgReady.value = !!(await $fetch<{ telegram: boolean }>('/api/health')).telegram } catch {}
})

/** Links people may already have posted: the plain link and the current ?v= link */
const refreshUrls = computed(() => [...new Set([baseShare.value, currentShare.value])])

async function refreshTelegram() {
  tgBusy.value = 'refresh'
  tgError.value = ''
  tgRefresh.value = null
  try {
    tgRefresh.value = await api<TgRefresh>('/api/telegram/refresh', {
      method: 'POST', body: { urls: refreshUrls.value, withContent: withContent.value },
    })
  } catch (e) { tgError.value = errMsg(e) }
  finally { tgBusy.value = '' }
}

async function loadCached() {
  tgBusy.value = 'cached'
  tgError.value = ''
  try { tgCached.value = await api<TgPreview>('/api/telegram/preview', { method: 'POST', body: { url: baseShare.value } }) }
  catch (e) { tgError.value = errMsg(e) }
  finally { tgBusy.value = '' }
}

const FIELDS = ['targetUrl', 'siteName', 'title', 'description', 'image', 'imageStyle'] as const

function fill(l: LinkMeta) {
  for (const k of FIELDS) (draft as any)[k] = l[k]
}

async function load() {
  try {
    link.value = await api<LinkMeta>(`/api/links/${slug}`)
    fill(link.value)
  } catch (e) { error.value = errMsg(e) }
}
onMounted(load)

const dirty = computed(() => !!link.value && FIELDS.some((k) => (draft as any)[k] !== link.value![k]))
const currentShare = computed(() => (link.value ? shareUrl(link.value) : ''))
const baseShare = computed(() => (link.value ? shareUrl(link.value, false) : ''))

async function save() {
  saving.value = true
  error.value = notice.value = ''
  try {
    const res = await api<LinkMeta & { previewChanged: boolean }>(`/api/links/${slug}`, { method: 'PUT', body: { ...draft } })
    link.value = res
    fill(res)
    seen.value = null
    notice.value = res.previewChanged
      ? `Saved as version ${res.version}.` + (tgReady.value && autoRefresh.value ? ' Refreshing Telegram…' : ' Share the new link below, or refresh the old one in Telegram.')
      : 'Saved.'
    if (res.previewChanged && tgReady.value && autoRefresh.value) {
      saving.value = false
      await refreshTelegram()
      if (!tgError.value) notice.value = `Saved as version ${res.version} and Telegram's preview was refreshed.`
    }
  } catch (e) { error.value = errMsg(e) }
  finally { saving.value = false }
}

async function importFromTarget() {
  importing.value = true
  error.value = ''
  try {
    const r = await api<ScrapeResult>('/api/inspect', { query: { url: draft.targetUrl } })
    if (!r.ok) throw new Error(r.error || `Target page answered with HTTP ${r.status}`)
    Object.assign(draft, r.resolved)
    notice.value = 'Imported from the target page. Review it, then save.'
  } catch (e) { error.value = errMsg(e) }
  finally { importing.value = false }
}

async function checkTelegram() {
  checking.value = true
  try { seen.value = await api<ScrapeResult>('/api/inspect', { query: { url: currentShare.value } }) }
  catch (e) { error.value = errMsg(e) }
  finally { checking.value = false }
}

async function copy(text: string, what: string) {
  try { await navigator.clipboard.writeText(text); copied.value = what; setTimeout(() => (copied.value = ''), 1500) } catch {}
}

async function remove() {
  if (!confirm(`Delete /s/${slug}? The short link will stop working.`)) return
  try { await api(`/api/links/${slug}`, { method: 'DELETE' }); await navigateTo('/') }
  catch (e) { error.value = errMsg(e) }
}

const tgShare = computed(() => `https://t.me/share/url?url=${encodeURIComponent(currentShare.value)}`)

const imageWarning = computed(() => {
  const i = imageInfo.value
  if (!draft.image || !i) return ''
  if (i.error) return 'The image could not be loaded. Use a public https URL that opens without logging in.'
  if (draft.imageStyle === 'large' && (i.width < 300 || i.width / i.height < 1))
    return `Image is ${i.width}×${i.height}. Telegram usually shows small or tall images as a thumbnail. Use about 1200×630 for a large preview.`
  return `Image ${i.width}×${i.height}`
})
</script>

<template>
  <div v-if="!link && !error" class="muted">Loading…</div>
  <div v-else-if="!link" class="card"><p class="error">{{ error }}</p><NuxtLink to="/">← Back</NuxtLink></div>

  <div v-else class="editor">
    <!-- LEFT: form -->
    <section class="card">
      <div class="row between">
        <h1>Edit <code>/s/{{ link.slug }}</code></h1>
        <span class="pill">v{{ link.version }}</span>
      </div>

      <label class="field">
        <span>Target URL <em>(where people land)</em></span>
        <div class="row">
          <input v-model="draft.targetUrl" class="input grow" type="url" />
          <button class="btn ghost" :disabled="importing" @click="importFromTarget">{{ importing ? 'Importing…' : 'Import meta' }}</button>
        </div>
      </label>

      <label class="field">
        <span>Site name <em class="count">{{ draft.siteName.length }}</em></span>
        <input v-model="draft.siteName" class="input" placeholder="My Shop" />
      </label>

      <label class="field">
        <span>Title <em class="count" :class="{ over: draft.title.length > 90 }">{{ draft.title.length }}</em></span>
        <input v-model="draft.title" class="input" placeholder="Headline shown in bold" />
      </label>

      <label class="field">
        <span>Description <em class="count" :class="{ over: draft.description.length > 300 }">{{ draft.description.length }}</em></span>
        <textarea v-model="draft.description" class="input" rows="4" placeholder="A sentence or two" />
      </label>

      <div class="field">
        <span>Image URL</span>
        <div class="row">
          <input v-model="draft.image" class="input grow" type="url" placeholder="https://…/cover-1200x630.jpg" />
          <TestImagePicker @pick="draft.image = $event" />
        </div>
        <small v-if="imageWarning" class="hint" :class="{ warn: imageWarning.includes('Telegram') || imageWarning.includes('not') }">{{ imageWarning }}</small>
      </div>

      <div class="field">
        <span>Image style</span>
        <div class="seg">
          <button :class="{ on: draft.imageStyle === 'large' }" @click="draft.imageStyle = 'large'">Large image</button>
          <button :class="{ on: draft.imageStyle === 'small' }" @click="draft.imageStyle = 'small'">Small thumbnail</button>
        </div>
      </div>

      <div class="row actions">
        <button class="btn primary" :disabled="!dirty || saving" @click="save">{{ saving ? 'Saving…' : dirty ? 'Save changes' : 'Saved' }}</button>
        <button class="btn ghost" :disabled="!dirty" @click="fill(link)">Discard</button>
        <span class="grow" />
        <button class="btn danger ghost" @click="remove">Delete</button>
      </div>
      <label v-if="tgReady" class="check"><input v-model="autoRefresh" type="checkbox" /> Refresh Telegram automatically after saving</label>
      <p v-if="notice" class="notice">{{ notice }}</p>
      <p v-if="error" class="error">{{ error }}</p>
    </section>

    <!-- RIGHT: preview + publish -->
    <section class="side">
      <div class="card">
        <div class="row between">
          <h2>Telegram preview <span v-if="dirty" class="pill warn">unsaved</span></h2>
          <div class="seg sm">
            <button :class="{ on: theme === 'light' }" @click="theme = 'light'">Light</button>
            <button :class="{ on: theme === 'dark' }" @click="theme = 'dark'">Dark</button>
          </div>
        </div>
        <TelegramPreview
          :theme="theme" :url="currentShare"
          :site-name="draft.siteName" :title="draft.title" :description="draft.description"
          :image="draft.image" :image-style="draft.imageStyle"
          @image-info="imageInfo = $event"
        />
        <p class="muted small">This is a close copy of Telegram's layout. Telegram makes the final choice, for example it may show a large image as a small thumbnail.</p>
      </div>

      <div class="card">
        <h2>Update in Telegram</h2>
        <p class="muted small">Telegram saves a link's preview the first time anyone posts it. Saving here changes what your server sends, but Telegram keeps the old preview until you do one of these:</p>

        <div class="step">
          <b>A. Post the new versioned link</b> <span class="muted small">(works right away)</span>
          <div class="copyrow">
            <code>{{ currentShare }}</code>
            <button class="btn sm" @click="copy(currentShare, 'v')">{{ copied === 'v' ? 'Copied ✓' : 'Copy' }}</button>
            <a class="btn sm ghost" :href="tgShare" target="_blank">Share to Telegram</a>
          </div>
          <p class="muted small">Every saved change adds a new <code>?v=</code> number. Telegram sees it as a new link and reads the preview again.</p>
        </div>

        <div class="step">
          <b>B. Refresh a link you already posted</b>
          <template v-if="tgReady">
            <p class="muted small">Sends your link to Telegram's official @WebpageBot for you, then shows the preview Telegram has saved.</p>
            <div class="copyrow">
              <button class="btn sm primary" :disabled="!!tgBusy || dirty" @click="refreshTelegram">
                {{ tgBusy === 'refresh' ? 'Refreshing… (up to 20 s)' : 'Refresh in Telegram' }}
              </button>
              <button class="btn sm ghost" :disabled="!!tgBusy" @click="loadCached">
                {{ tgBusy === 'cached' ? 'Loading…' : "Show Telegram's saved preview" }}
              </button>
            </div>
            <label class="check"><input v-model="withContent" type="checkbox" /> Also press "Update with content" (use this if the image or description stays old)</label>
            <p v-if="dirty" class="muted small">Save your changes first.</p>
            <p v-if="tgError" class="error small">{{ tgError }}</p>

            <div v-for="r in tgRefresh?.results || []" :key="r.url" class="tgresult">
              <div class="small"><code>{{ r.url }}</code></div>
              <ul class="botreplies small">
                <li v-for="(t, i) in r.botReplies" :key="i">🤖 {{ t }}</li>
                <li v-if="!r.botReplies.length" class="muted">No reply from @WebpageBot yet</li>
                <li v-if="r.pressedButton" class="muted">Pressed "{{ r.pressedButton }}"</li>
              </ul>
              <TgRealPreview :preview="r.preview" :url="r.url" :theme="theme" />
            </div>

            <div v-if="tgCached && !tgRefresh" class="tgresult">
              <div class="small muted">Saved in Telegram right now for <code>{{ baseShare }}</code></div>
              <TgRealPreview :preview="tgCached" :url="baseShare" :theme="theme" />
            </div>
          </template>
          <template v-else>
            <ol class="small">
              <li>Open <a href="https://t.me/WebpageBot" target="_blank">@WebpageBot</a> and press Start.</li>
              <li>Send it the exact link you posted, for example
                <button class="linkbtn" @click="copy(baseShare, 'b')">{{ copied === 'b' ? 'copied ✓' : baseShare }}</button>
              </li>
              <li>If it still looks old, tap <i>Update with content</i>.</li>
            </ol>
            <p class="muted small">💡 Connect a Telegram account (see README → "Connect Telegram") to do this from here with one click.</p>
          </template>
        </div>

        <div class="step">
          <div class="row between">
            <b>Check what Telegram's crawler sees</b>
            <button class="btn sm" :disabled="checking" @click="checkTelegram">{{ checking ? 'Checking…' : 'Check live' }}</button>
          </div>
          <template v-if="seen">
            <p class="small" :class="seen.ok ? 'ok' : 'error'">
              HTTP {{ seen.status || '—' }} · {{ seen.ms }} ms<span v-if="seen.error"> · {{ seen.error }}</span>
            </p>
            <TelegramPreview
              compact :theme="theme" :url="currentShare"
              :site-name="seen.resolved.siteName" :title="seen.resolved.title"
              :description="seen.resolved.description" :image="seen.resolved.image"
              :image-style="seen.tags['twitter:card'] === 'summary' ? 'small' : 'large'"
            />
            <button class="linkbtn small" @click="showTags = !showTags">{{ showTags ? 'Hide' : 'Show' }} raw meta tags</button>
            <table v-if="showTags" class="tags">
              <tr v-for="(v, k) in seen.tags" :key="k"><td>{{ k }}</td><td>{{ v }}</td></tr>
            </table>
          </template>
        </div>
      </div>
    </section>
  </div>
</template>
