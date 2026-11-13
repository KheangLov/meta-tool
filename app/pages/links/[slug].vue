<script setup lang="ts">
interface ScrapeResult {
  ok: boolean; status: number; finalUrl: string; ms: number; error?: string
  tags: Record<string, string>
  resolved: { siteName: string; title: string; description: string; image: string }
}

const route = useRoute()
const api = useApi()
const slug = String(route.params.slug)

const studio = useStudio()
/** Phones/tablets show one part at a time */
const mview = ref<'edit' | 'preview' | 'share'>('edit')
const panel = ref<'send' | 'update' | 'check'>('send')
const link = ref<LocalLink | null>(null)
const restoring = ref(false)
const draft = reactive({ targetUrl: '', siteName: '', title: '', description: '', image: '', imageStyle: 'large' as 'large' | 'small', extra: {} as PreviewExtra, platforms: {} as PlatformOverrides })
// Mock previews start in the same light/dark as the tool
const theme = ref<'light' | 'dark'>(useColorMode().isDark.value ? 'dark' : 'light')
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

const tgReady = ref(false)
const tgBot = ref(false)
const fbReady = ref(false)
const fbPage = ref(false)
const fbAppId = ref('')
const app = ref<PreviewApp>('telegram')
const overrideTab = ref<Platform>('telegram')
const fbPanel = ref<{ refresh: () => Promise<boolean> } | null>(null)
const waImageBytes = ref(0)
const notice2 = ref('')
const { options: sendOpts, template: sendTemplate } = useSendSettings()
const sender = ref<{ updateAll: () => Promise<boolean>; count: number } | null>(null)
const autoRefresh = ref(true)
const withContent = ref(false)
const tgBusy = ref<'' | 'refresh' | 'cached'>('')
const tgError = ref('')
const sync = ref<{ run: (urls: string[], o?: { withContent?: boolean }) => Promise<any[] | undefined>; running: boolean } | null>(null)
const syncDraft = ref(false)
const tgCached = ref<TgPreview | null>(null)

onMounted(async () => {
  try {
    const h = await $fetch<{ telegram: boolean; telegramBot: boolean; facebook: boolean; facebookPage: boolean; facebookAppId: string }>('/api/health')
    tgReady.value = !!h.telegram
    tgBot.value = !!h.telegramBot
    fbReady.value = !!h.facebook
    fbPage.value = !!h.facebookPage
    fbAppId.value = h.facebookAppId || ''
  } catch {}
})

/** Links people may already have posted: the plain link and the current ?v= link */
const refreshUrls = computed(() => [...new Set([baseShare.value, currentShare.value])])

async function refreshTelegram() {
  tgBusy.value = 'refresh'
  tgError.value = ''
  tgCached.value = null
  try {
    const rows = await sync.value?.run(refreshUrls.value, { withContent: withContent.value })
    return !!rows?.every((r) => r.state === 'match' || r.state === 'unknown')
  } finally { tgBusy.value = '' }
}

// Turning on "keep in sync" immediately shows the post's preview in the editor
watch(syncDraft, async (on) => {
  if (!on || !link.value?.postSlug || link.value.syncWithPost) return
  try {
    const p = await db().posts.get(link.value.postSlug)
    if (!p) throw new Error('The post this link follows isn\'t on this device. Open Test kit → Restore.')
    Object.assign(draft, { siteName: p.siteName, title: p.title, description: p.excerpt, image: p.cover, imageStyle: p.imageStyle, extra: { ...(p.extra || {}) }, platforms: JSON.parse(JSON.stringify(p.platforms || {})) })
  } catch (e) { error.value = errMsg(e) }
})

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
  draft.extra = { ...(l.extra || {}) }
  draft.platforms = JSON.parse(JSON.stringify(l.platforms || {}))
  syncDraft.value = !!l.syncWithPost
}

async function load() {
  try {
    const l = await db().links.get(slug)
    if (!l) throw new Error('This link isn\'t on this device.')
    link.value = l
    fill(l)
  } catch (e) { error.value = errMsg(e) }
}

/** Pull published links/posts from GitHub into this browser, then try again */
async function restore() {
  restoring.value = true
  try { await studio.restoreFromPublished(); error.value = ''; await load() }
  catch (e) { error.value = errMsg(e) }
  finally { restoring.value = false }
}

async function retryPublish() {
  if (!link.value) return
  const r = await studio.publish('link', link.value)
  link.value = r.item as LocalLink
}
const pub = computed(() => publishLabel(link.value || undefined))
onMounted(load)

const sameJson = (a: unknown, b: unknown) => JSON.stringify(a || {}) === JSON.stringify(b || {})
const dirty = computed(() => !!link.value && (
  FIELDS.some((k) => (draft as any)[k] !== link.value![k]) || syncDraft.value !== !!link.value.syncWithPost || !sameJson(draft.extra, link.value.extra) || !sameJson(draft.platforms, link.value.platforms)
))

/** What the selected app will show (its overrides applied) */
const view = computed(() => mergeOverride(
  { siteName: draft.siteName, title: draft.title, description: draft.description, image: draft.image },
  draft.platforms[overrideKey(app.value)],
))
const mockPlain = computed(() => plainMessage(mockText.value))
watch(app, (a) => { overrideTab.value = overrideKey(a) })

function useWhatsAppImage(url: string) {
  draft.platforms = { ...draft.platforms, whatsapp: { ...(draft.platforms.whatsapp || {}), image: url } }
  app.value = 'whatsapp'
  notice2.value = 'WhatsApp now has its own smaller image. Click Save to publish it.'
}

const mockText = computed(() => renderMessage(sendTemplate.value, { url: currentShare.value, title: draft.title, description: draft.description }, sendOpts.value.parseMode === 'html'))
const currentShare = computed(() => (link.value ? shareUrl(link.value) : ''))
const baseShare = computed(() => (link.value ? shareUrl(link.value, false) : ''))

async function save() {
  saving.value = true
  error.value = notice.value = ''
  try {
    const out = await studio.saveLink(slug, { ...plain(draft), syncWithPost: syncDraft.value })
    const res = out.link
    link.value = res
    fill(res)
    seen.value = null
    if (!out.published) {
      error.value = `Saved on this device, but not published: ${out.publishError}`
      return
    }
    notice.value = out.previewChanged
      ? `Published version ${res.version}.` + (tgReady.value && autoRefresh.value ? ' Updating Telegram…' : ` New link with the latest preview: ${shareUrl(res)}`)
      : 'Published.'
    if (out.previewChanged && autoRefresh.value && (tgReady.value || fbReady.value || sender.value?.count)) {
      saving.value = false
      const okRefresh = tgReady.value ? await refreshTelegram() : true
      const okSent = sender.value?.count ? await sender.value.updateAll() : true
      const okFb = fbReady.value ? await fbPanel.value?.refresh() !== false : true
      const done = [tgReady.value && 'Telegram', fbReady.value && 'Facebook & Messenger'].filter(Boolean).join(' and ')
      notice.value = okRefresh && okSent && okFb
        ? `Published version ${res.version}. ${done || 'Telegram'} now show${done.includes(' and ') ? '' : 's'} the latest preview${sender.value?.count ? ', and your sent messages were updated' : ''}.`
        : `Published version ${res.version}. Some updates didn't finish. See the details on the right.`
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
  try { await studio.deleteLink(slug); await navigateTo('/') }
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
  <div v-else-if="!link" class="card">
    <h1>Link not on this device</h1>
    <p class="muted">{{ error }} Links are kept in the browser you made them in. If you published it from another device, restore it from GitHub.</p>
    <div class="row wrap"><SqBtn color="primary" variant="flat" :disabled="restoring" @click="restore">{{ restoring ? 'Restoring…' : 'Restore from GitHub' }}</SqBtn><SqBtn variant="text" to="/">Back to links</SqBtn></div>
  </div>

  <div v-else class="editor" :class="`show-${mview}`">
    <header class="ed-head">
      <div class="grow">
        <NuxtLink to="/" class="ed-back">‹ Links</NuxtLink>
        <h1>{{ draft.title || link.slug }}</h1>
        <div class="ed-share">
          <code>{{ baseShare.replace(/^https?:\/\//, '') }}</code>
          <SqBtn variant="text" size="small" @click="copy(currentShare, 'v')">{{ copied === 'v' ? 'Copied' : 'Copy link' }}</SqBtn>
          <span :class="`pub pub-${pub.kind}`" :title="link.publishError">{{ pub.text }}</span>
        </div>
      </div>
      <SqBtn color="error" variant="text" size="small" @click="remove">Delete</SqBtn>
    </header>

    <div class="ed-switch">
      <SqTabs
        :model-value="mview" variant="segmented" grow
        :items="[{ title: 'Edit', value: 'edit', icon: 'edit' }, { title: dirty ? 'Preview •' : 'Preview', value: 'preview', icon: 'eye' }, { title: 'Share', value: 'share', icon: 'lps:send' }]"
        @update:model-value="(v: string | number) => (mview = v as typeof mview)"
      />
    </div>

    <!-- FORM -->
    <section class="ed-form">
      <div class="group">
        <h3>Where it goes</h3>
        <div class="field">
          <div class="row">
            <AppField v-model="draft.targetUrl" class="grow" label="Page people land on" input-type="url" inputmode="url" hide-details />
            <SqBtn variant="text" :disabled="importing || syncDraft" title="Copy title, description and image from that page" @click="importFromTarget">{{ importing ? 'Importing…' : 'Import' }}</SqBtn>
          </div>
        </div>
        <SqAlert v-if="link.publishError" type="error" variant="tonal" title="Not published" :text="link.publishError">
          <template #append><SqBtn variant="text" color="error" size="small" @click="retryPublish">Retry</SqBtn></template>
        </SqAlert>
        <div v-if="link.postSlug" class="syncbox">
          <div class="row between"><span>Use the preview of post <NuxtLink :to="`/posts/${link.postSlug}`">{{ link.postSlug }}</NuxtLink></span><SqSwitch v-model="syncDraft" inset aria-label="Use the post's preview" /></div>
          <p v-if="syncDraft" class="muted small">Edit the post to change this link's preview. Untick to give the link its own.</p>
        </div>
      </div>

      <fieldset class="plain" :disabled="syncDraft">
        <div class="group">
          <h3>What apps show</h3>
          <div class="fields">
            <AppField v-model="draft.siteName" label="Site name" placeholder="My Shop" counter :disabled="syncDraft" />
            <AppField v-model="draft.title" label="Title" placeholder="Headline shown in bold" :counter="90" :disabled="syncDraft" />
            <AppField v-model="draft.description" multiline label="Description" placeholder="A sentence or two" :rows="3" :counter="300" :disabled="syncDraft" />
          </div>
        </div>

        <div class="group">
          <h3>Image</h3>
          <div class="field">
            <div class="row">
              <AppField v-model="draft.image" class="grow" label="Image URL" input-type="url" inputmode="url" placeholder="Paste an image link, 1200 × 630 works best" hide-details :disabled="syncDraft" />
              <TestImagePicker @pick="draft.image = $event" />
            </div>
            <ImageUpload @uploaded="draft.image = $event" />
            <small v-if="imageWarning && imageInfo?.error" class="hint warn">{{ imageWarning }}</small>
            <ImageCheck :url="draft.image" />
          </div>
          <div class="field">
            <span>Image size in the preview</span>
            <div class="seg">
              <button :class="{ on: draft.imageStyle === 'large' }" @click="draft.imageStyle = 'large'">Large</button>
              <button :class="{ on: draft.imageStyle === 'small' }" @click="draft.imageStyle = 'small'">Small thumbnail</button>
            </div>
          </div>
        </div>

        <div class="group">
          <PlatformOverridesForm
            v-model="draft.platforms" v-model:tab="overrideTab"
            :base="{ siteName: draft.siteName, title: draft.title, description: draft.description, image: draft.image }"
          />
          <PreviewExtras v-model="draft.extra" :image-size="imageInfo && !imageInfo.error ? imageInfo : null" />
        </div>
      </fieldset>
    </section>

    <!-- PREVIEW + PANELS -->
    <aside class="ed-side">
      <div class="stage">
        <div class="stage-top">
          <div class="seg sm apptabs" role="tablist" aria-label="App">
            <button v-for="a in PREVIEW_APPS" :key="a.id" :class="{ on: app === a.id }" @click="app = a.id">
              {{ a.label }}<span v-if="draft.platforms[overrideKey(a.id)]" title="Has its own text or image"> •</span>
            </button>
          </div>
          <div class="seg sm" aria-label="Theme">
            <button :class="{ on: theme === 'light' }" @click="theme = 'light'">Light</button>
            <button :class="{ on: theme === 'dark' }" @click="theme = 'dark'">Dark</button>
          </div>
        </div>
        <TelegramPreview
          v-show="app === 'telegram'"
          :theme="theme" :url="currentShare"
          :site-name="view.siteName" :title="view.title" :description="view.description"
          :image="view.image" :image-style="mockImageStyle(sendOpts.size, draft.imageStyle)"
          :text="mockText" :html="sendOpts.parseMode === 'html'" :position="sendOpts.position" :no-preview="sendOpts.disablePreview"
          :video="!!draft.extra.videoUrl" :duration="draft.extra.videoDuration" :audio="!!draft.extra.audioUrl"
          @image-info="imageInfo = $event"
        />
        <FacebookPreview v-if="app === 'facebook'" :theme="theme" :url="currentShare" :title="view.title" :description="view.description" :image="view.image" :text="mockPlain.replace(currentShare, '').trim()" />
        <MessengerPreview v-if="app === 'messenger'" :theme="theme" :url="currentShare" :title="view.title" :description="view.description" :image="view.image" :text="mockPlain" />
        <WhatsAppPreview v-if="app === 'whatsapp'" :theme="theme" :url="currentShare" :title="view.title" :description="view.description" :image="view.image" :text="mockPlain" :image-bytes="waImageBytes" />
        <p class="stage-note">A close copy of the app's layout<span v-if="dirty">, showing your unsaved changes</span>. The app makes the final call, such as shrinking an image to a thumbnail.</p>
      </div>

      <div class="panels">
        <div class="panel-tabs" role="tablist">
          <button :class="{ on: panel === 'send' }" @click="panel = 'send'">Message</button>
          <button :class="{ on: panel === 'update' }" @click="panel = 'update'">Update apps</button>
          <button :class="{ on: panel === 'check' }" @click="panel = 'check'">Check</button>
        </div>

        <div v-show="panel === 'send'" class="panel-body">
          <TelegramSend
            ref="sender" v-model:options="sendOpts" v-model:template="sendTemplate"
            :owner="`link:${link.slug}`" :latest-url="currentShare" :account="tgReady" :bot="tgBot" :dirty="dirty" :title="draft.title" :description="draft.description"
          />
        </div>

        <div v-show="panel === 'update'" class="panel-body">
          <SqSwitch v-if="tgReady || tgBot || fbReady" v-model="autoRefresh" inset class="mb" label="Update apps automatically each time I publish" />
          <div class="seg sm" style="margin-bottom:12px">
            <button v-for="a in PREVIEW_APPS" :key="a.id" :class="{ on: app === a.id }" @click="app = a.id">{{ a.label }}</button>
          </div>

          <div v-show="app === 'facebook' || app === 'messenger'">
            <FacebookPanel
              ref="fbPanel" :primary-url="currentShare" :urls="refreshUrls" :owner="`link:${link.slug}`" :template="sendTemplate"
              :dirty="dirty" :connected="fbReady" :page-connected="fbPage" :app-id="fbAppId" :theme="theme" :title="draft.title" :description="draft.description"
            />
          </div>

          <div v-show="app === 'whatsapp'">
            <WhatsAppPanel
              :primary-url="currentShare" :image="view.image" :text="mockPlain" :has-override-image="!!draft.platforms.whatsapp?.image" :locked-to="syncDraft ? link.postSlug : undefined"
              @use-image="useWhatsAppImage" @image-bytes="waImageBytes = $event"
            />
          </div>

          <div v-show="app === 'telegram'">
            <h2>Update in Telegram</h2>
            <p class="muted small">Telegram keeps the preview it saw first. After you publish a change, do one of these.</p>

            <div class="step">
              <h3>Share the newest link</h3>
              <div class="copyrow">
                <code>{{ currentShare }}</code>
                <SqBtn variant="tonal" size="small" @click="copy(currentShare, 'v')">{{ copied === 'v' ? 'Copied' : 'Copy' }}</SqBtn>
                <SqBtn variant="text" size="small" :href="tgShare" target="_blank" rel="noopener">Open Telegram</SqBtn>
              </div>
              <p class="muted small">Each publish adds a new <code>?v=</code> number, so Telegram treats it as a new link and reads the latest preview.</p>
            </div>

            <div class="step">
              <h3>Refresh a link you already posted</h3>
              <template v-if="tgReady">
                <p class="muted small">Sends your link to Telegram's @WebpageBot, then checks that Telegram shows what you published, pressing "Update with content" if needed.</p>
                <div class="copyrow">
                  <SqBtn color="primary" variant="flat" size="small" :disabled="!!tgBusy || dirty" @click="refreshTelegram">{{ tgBusy === 'refresh' ? 'Updating…' : 'Refresh in Telegram' }}</SqBtn>
                  <SqBtn variant="text" size="small" :disabled="!!tgBusy" @click="loadCached">{{ tgBusy === 'cached' ? 'Loading…' : "Show Telegram's copy" }}</SqBtn>
                </div>
                <SqCheckbox v-model="withContent" label="Also press &quot;Update with content&quot; (if the image or description stays old)" />
                <p v-if="dirty" class="muted small">Publish your changes first.</p>
                <p v-if="tgError" class="error small">{{ tgError }}</p>
                <TelegramSync ref="sync" :theme="theme" />
                <div v-if="tgCached" class="tgresult">
                  <div class="small muted">Telegram's saved copy of <code>{{ baseShare }}</code></div>
                  <TgRealPreview :preview="tgCached" :url="baseShare" :theme="theme" />
                </div>
              </template>
              <template v-else>
                <ol class="small">
                  <li>Open <a href="https://t.me/WebpageBot" target="_blank" rel="noopener">@WebpageBot</a> and press Start.</li>
                  <li>Send it the link you posted: <button class="linkbtn" @click="copy(baseShare, 'b')">{{ copied === 'b' ? 'copied' : baseShare }}</button></li>
                  <li>If it still looks old, tap <i>Update with content</i>.</li>
                </ol>
                <p class="muted small">Connect a Telegram account (see the README) to do this here with one tap.</p>
              </template>
            </div>
          </div>
        </div>

        <div v-show="panel === 'check'" class="panel-body">
          <AppsCheck :url="currentShare" />
          <div class="step">
            <div class="row between">
              <h3>What Telegram's crawler reads</h3>
              <SqBtn variant="tonal" size="small" :disabled="checking" @click="checkTelegram">{{ checking ? 'Checking…' : 'Check' }}</SqBtn>
            </div>
            <template v-if="seen">
              <p class="small" :class="seen.ok ? 'ok' : 'error'">HTTP {{ seen.status || '—' }}, {{ seen.ms }} ms<span v-if="seen.error">: {{ seen.error }}</span></p>
              <TelegramPreview
                compact :theme="theme" :url="currentShare"
                :site-name="seen.resolved.siteName" :title="seen.resolved.title"
                :description="seen.resolved.description" :image="seen.resolved.image"
                :image-style="seen.tags['twitter:card'] === 'summary' ? 'small' : 'large'"
              />
              <button class="linkbtn small" @click="showTags = !showTags">{{ showTags ? 'Hide' : 'Show' }} the raw tags</button>
              <table v-if="showTags" class="tags">
                <tr v-for="(v, k) in seen.tags" :key="k"><td>{{ k }}</td><td>{{ v }}</td></tr>
              </table>
            </template>
          </div>
        </div>
      </div>
    </aside>

    <!-- SAVE BAR -->
    <div class="savebar" :class="{ idle: !dirty && !saving && !notice && !error }">
      <div class="msg" aria-live="polite">
        <span v-if="error" class="error">{{ error }}</span>
        <span v-else-if="notice">{{ notice }}</span>
        <span v-else-if="notice2 && dirty">{{ notice2 }}</span>
        <span v-else-if="dirty" class="quiet">Unpublished changes</span>
        <span v-else class="quiet">Everything is published.</span>
      </div>
      <SqBtn variant="text" :disabled="!dirty || saving" @click="fill(link)">Discard</SqBtn>
      <SqBtn color="primary" variant="flat" :disabled="!dirty || saving" @click="save">{{ saving ? 'Publishing…' : 'Publish' }}</SqBtn>
    </div>
  </div>
</template>
