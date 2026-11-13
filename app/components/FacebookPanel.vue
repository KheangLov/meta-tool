<script setup lang="ts">
/**
 * Facebook & Messenger: re-scrape (both share Facebook's cache), check what Facebook stored,
 * share buttons, Sharing Debugger, and optional posting to your Facebook Page.
 */
interface FbPreview { title: string; description: string; siteName: string; type: string; image: string; imageWidth?: number; imageHeight?: number; updatedTime?: string }
interface Row { url: string; status: string; diffs: string[]; preview?: FbPreview; error?: string }

const props = defineProps<{
  primaryUrl: string; urls: string[]; owner: string; template: string; dirty?: boolean; title: string; description: string
  connected: boolean; pageConnected: boolean; appId?: string; theme: 'light' | 'dark'
}>()
const api = useApi()
const rows = ref<Row[]>([])
const busy = ref<'' | 'refresh' | 'cached' | 'post'>('')
const error = ref('')
const cached = ref<{ preview: FbPreview | null; engagement: any } | null>(null)
const posts = ref<any[]>([])
const postText = ref('{title}')

async function loadPosts() {
  if (!props.owner) return
  try { posts.value = (await db().sent.where('owner').equals(props.owner).toArray()).filter((r) => r.via === 'fbpage') } catch {}
}
onMounted(loadPosts)

/** Re-scrape every URL; returns true when Facebook shows what you saved everywhere */
async function refresh() {
  if (!props.connected) return true
  busy.value = 'refresh'
  error.value = ''
  cached.value = null
  try {
    const all = [...new Set(props.urls)]
    rows.value = []
    for (let i = 0; i < all.length; i += 10) {
      const res = await api<{ results: Row[] }>('/api/facebook/refresh', { method: 'POST', body: { urls: all.slice(i, i + 10) } })
      rows.value = [...rows.value, ...res.results]
    }
    return rows.value.every((r) => r.status === 'match' || r.status === 'unknown')
  } catch (e) { error.value = errMsg(e); return false }
  finally { busy.value = '' }
}

async function showCached() {
  busy.value = 'cached'
  error.value = ''
  try { cached.value = await api('/api/facebook/preview', { method: 'POST', body: { url: props.primaryUrl } }) }
  catch (e) { error.value = errMsg(e) }
  finally { busy.value = '' }
}

async function postToPage() {
  if (!confirm('Publish this link on your Facebook Page now?')) return
  busy.value = 'post'
  error.value = ''
  try {
    const rec = await api<SentRecord>('/api/facebook/post', {
      method: 'POST',
      body: { owner: props.owner, template: postText.value, target: { url: props.primaryUrl, title: props.title, description: props.description } },
    })
    await db().sent.put(plain(rec))
    posts.value = [rec, ...posts.value]
  } catch (e) { error.value = errMsg(e) }
  finally { busy.value = '' }
}

async function removePost(r: any, deleteMessage: boolean) {
  if (deleteMessage && !confirm('Delete this post from your Facebook Page?')) return
  try {
    if (deleteMessage) await api('/api/telegram/delete-sent', { method: 'POST', body: { record: plain(r) } })
    await db().sent.delete(r.id)
    posts.value = posts.value.filter((x) => x.id !== r.id)
  } catch (e) { error.value = errMsg(e) }
}

const enc = encodeURIComponent
const fbShare = computed(() => `https://www.facebook.com/sharer/sharer.php?u=${enc(props.primaryUrl)}`)
const msgrShare = computed(() => props.appId
  ? `https://www.facebook.com/dialog/send?app_id=${enc(props.appId)}&link=${enc(props.primaryUrl)}&redirect_uri=${enc(props.primaryUrl)}`
  : `fb-messenger://share/?link=${enc(props.primaryUrl)}`)
const debugger_ = computed(() => `https://developers.facebook.com/tools/debug/?q=${enc(props.primaryUrl)}`)
const icon: Record<string, string> = { match: '✅', mismatch: '⚠️', unknown: '✔️', error: '❌' }

defineExpose({ refresh })
</script>

<template>
  <div>
    <h2>Update on Facebook &amp; Messenger</h2>
    <p class="muted small">Facebook and Messenger share one saved copy of each link. Re-scraping updates it for new shares. Posts and messages that are already out usually keep their old card.</p>

    <details class="fix">
      <summary>Preview not showing on Facebook or Messenger?</summary>
      <ol class="small">
        <li><b>Publish</b>, then run <i>Check all apps</i> on the Check tab. Fix anything red on the Facebook line first.</li>
        <li>Open the <a :href="debugger_" target="_blank" rel="noopener">Sharing Debugger</a>, log in and press <i>Scrape Again</i>. What it says tells you the cause:</li>
      </ol>
      <dl class="small">
        <dt>It shows your title and image</dt>
        <dd>Facebook can read the link. Messenger was holding an old copy: send the newest <code>?v=</code> link.</dd>
        <dt>"Bad HTTP response code" 403</dt>
        <dd>Vercel's firewall stopped Facebook before it reached this site. Check <i>Did the app reach your link?</i> on the Check tab: no Facebook visit confirms it. In Vercel → Firewall, turn off Bot Protection and Attack Challenge Mode, then scrape again.</dd>
        <dt>"Goes against our Community Standards" or the link can't be shared</dt>
        <dd>Facebook is blocking the address itself. Free shared addresses like <code>*.vercel.app</code> get flagged. Add your own domain in Vercel → Domains.</dd>
        <dt>Title is right but there's no image</dt>
        <dd>The image is too small (under 200 × 200), over 8 MB, or Facebook couldn't download it. The Check tab names which.</dd>
        <dt>It shows the target page's preview, not yours</dt>
        <dd>You shared the target address. Share the <code>/s/…</code> link from this tool.</dd>
      </dl>
      <p class="muted small">Messenger has no checker of its own. It uses Facebook's saved copy, so once the Sharing Debugger is right, Messenger is too.</p>
    </details>

    <div class="step">
      <b>A. Share the newest link</b>
      <div class="copyrow">
        <code>{{ primaryUrl }}</code>
        <SqBtn variant="tonal" size="small" :href="fbShare" target="_blank">Share on Facebook</SqBtn>
        <SqBtn variant="text" size="small" :href="msgrShare" target="_blank">Send in Messenger</SqBtn>
      </div>
      <p class="muted small">Each saved change gets a new <code>?v=</code> link. Facebook hasn't seen it yet, so it always reads the latest preview.</p>
    </div>

    <div class="step">
      <b>B. Refresh Facebook's saved copy</b>
      <template v-if="connected">
        <div class="copyrow">
          <SqBtn color="primary" variant="flat" size="small" :disabled="!!busy || dirty" @click="refresh">{{ busy === 'refresh' ? 'Re-scraping…' : 'Re-scrape on Facebook' }}</SqBtn>
          <SqBtn variant="text" size="small" :disabled="!!busy" @click="showCached">{{ busy === 'cached' ? 'Loading…' : "Show Facebook's saved preview" }}</SqBtn>
          <SqBtn variant="text" size="small" :href="debugger_" target="_blank">Sharing Debugger ↗</SqBtn>
        </div>
        <p v-if="dirty" class="muted small">Save first.</p>
        <div v-for="r in rows" :key="r.url" class="fbrow">
          <div class="small"><span>{{ icon[r.status] || '·' }}</span> <code>{{ r.url.replace(/^https?:\/\//, '') }}</code>
            <span :class="r.status === 'match' ? 'ok' : r.status === 'unknown' ? 'muted' : 'error'"> {{ r.status === 'match' ? 'Up to date' : r.status === 'mismatch' ? 'Different' : r.status === 'error' ? 'Failed' : 'Refreshed' }}</span>
          </div>
          <p v-if="r.error" class="error small">{{ r.error }}</p>
          <ul v-if="r.diffs.length" class="small diffs"><li v-for="d in r.diffs" :key="d">Facebook's {{ d }}</li></ul>
          <FacebookPreview v-if="r.preview" :url="r.url" :title="r.preview.title" :description="r.preview.description" :image="r.preview.image" :theme="theme" />
        </div>
        <template v-if="cached">
          <p v-if="!cached.preview" class="muted small">Facebook hasn't saved this link yet. Re-scrape or share it once.</p>
          <template v-else>
            <p class="muted small">Saved by Facebook<span v-if="cached.preview.updatedTime"> on {{ new Date(cached.preview.updatedTime).toLocaleString() }}</span><span v-if="cached.engagement"> · {{ cached.engagement.share_count ?? 0 }} shares, {{ cached.engagement.reaction_count ?? 0 }} reactions</span></p>
            <FacebookPreview :url="primaryUrl" :title="cached.preview.title" :description="cached.preview.description" :image="cached.preview.image" :theme="theme" />
          </template>
        </template>
        <p v-if="error" class="error small">{{ error }}</p>
      </template>
      <template v-else>
        <ol class="small">
          <li>Open the <a :href="debugger_" target="_blank">Sharing Debugger</a> (log in to Facebook).</li>
          <li>Click <i>Scrape Again</i>. Messenger updates too.</li>
        </ol>
        <p class="muted small">💡 Add a Facebook app's ID and secret (README → "Connect Facebook") to do this from here, automatically after every save.</p>
      </template>
    </div>

    <div class="step">
      <b>C. Post to your Facebook Page</b>
      <template v-if="pageConnected">
        <label class="field" style="margin-top:6px">
          <span>Post text <em>{title}, {description} work here; the link is added as a card</em></span>
          <textarea v-model="postText" class="input" rows="2" />
        </label>
        <SqBtn color="primary" variant="flat" size="small" :disabled="!!busy || dirty" @click="postToPage">{{ busy === 'post' ? 'Posting…' : 'Publish on Page' }}</SqBtn>
        <div v-for="r in posts" :key="r.id" class="sentrow small">
          <span>📘</span>
          <span class="grow">{{ new Date(r.sentAt).toLocaleString() }}</span>
          <a v-if="r.messageLink" :href="r.messageLink" target="_blank">open ↗</a>
          <button class="linkbtn" @click="removePost(r, false)">forget</button>
          <button class="linkbtn error" @click="removePost(r, true)">delete</button>
        </div>
        <p class="muted small">Facebook doesn't let apps change a published post's link card. For a new card, delete the post and publish again.</p>
      </template>
      <p v-else class="muted small">Optional: set <code>NUXT_FACEBOOK_PAGE_ID</code> and <code>NUXT_FACEBOOK_PAGE_TOKEN</code> to publish to your Page from here.</p>
    </div>

    <CrawlerCheck :url="primaryUrl" as="facebook" label="Facebook" />
  </div>
</template>

<style scoped>
.fix { border: 1px solid color-mix(in srgb, var(--amber) 45%, var(--rule)); background: var(--amber-soft); color: var(--amber-ink); border-radius: var(--r-control); padding: 10px 12px; margin: 12px 0; }
.fix summary { cursor: pointer; font-weight: 650; }
.fix ol { margin: 10px 0 6px; padding-left: 18px; display: grid; gap: 4px; }
.fix dl { margin: 0; display: grid; gap: 2px; }
.fix dt { font-weight: 650; margin-top: 8px; }
.fix dd { margin: 0; }
.fbrow { margin-top: 10px; display: grid; gap: 6px; }
.diffs { margin: 0; padding-left: 18px; color: var(--warn); }
.sentrow { display: flex; gap: 8px; align-items: center; padding: 6px 8px; border: 1px solid var(--line); border-radius: 8px; margin-top: 6px; }
</style>
