<script setup lang="ts">
const studio = useStudio()
const restoring = ref(false)
const restoreMsg = ref('')
async function restore() {
  restoring.value = true
  restoreMsg.value = ''
  try {
    const r = await studio.restoreFromPublished()
    restoreMsg.value = r.total ? `Restored ${r.added} of ${r.total} published items into this browser.` : 'Nothing is published yet.'
  } catch (e) { restoreMsg.value = errMsg(e) }
  finally { restoring.value = false }
}
const images = ref<{ file: string; url: string; w: number; h: number; note: string }[]>([])
const media = ref<{ file: string; url: string; note: string }[]>([])
const seeding = ref(false)
const created = ref<{ case: string; post?: string; link: string }[]>([])
const error = ref('')
const copied = ref('')

onMounted(async () => {
  try { images.value = await $fetch('/api/test-kit/images') } catch {}
  try { media.value = await $fetch('/api/test-kit/media') } catch {}
})

async function seed() {
  seeding.value = true
  error.value = ''
  try { created.value = await studio.loadSamples() }
  catch (e) { error.value = errMsg(e) }
  finally { seeding.value = false }
}

async function copy(text: string) {
  try { await navigator.clipboard.writeText(text); copied.value = text; setTimeout(() => (copied.value = ''), 1500) } catch {}
}
const abs = (p: string) => `${location.origin}${p}`
const sampleUrl = ref('')
onMounted(() => { sampleUrl.value = `${location.origin}/s/test-large` })
</script>

<template>
  <section id="github" class="card">
    <GitHubCheck />
  </section>

  <section class="card">
    <AppsCheck :url="sampleUrl" editable />
  </section>

  <section class="card">
    <h1>Test kit</h1>
    <p class="muted">Everything you need to try sharing in Telegram: sample posts, share links and test images, all hosted on this site.</p>

    <h2 style="margin-top:18px">1. Create sample content</h2>
    <p class="muted small">
      Copies 8 sample posts (<code>/p/sample-…</code>) and their share links (<code>/s/test-…</code>) into this browser so you can edit them.
      They're already live on the site even before you do this. Saving an edited sample publishes your version. Running this again resets them.
    </p>
    <div class="row">
    <button class="btn primary" :disabled="seeding" @click="seed">{{ seeding ? 'Loading…' : created.length ? 'Reset sample content' : 'Load sample posts & links' }}</button>
    <button class="btn ghost" :disabled="restoring" @click="restore">{{ restoring ? 'Restoring…' : '⟳ Restore published items from GitHub' }}</button>
    </div>
    <p v-if="restoreMsg" class="small">{{ restoreMsg }}</p>
    <p v-if="error" class="error">{{ error }}</p>

    <table v-if="created.length" class="kit">
      <thead><tr><th>Test case</th><th>Post page</th><th>Share link</th></tr></thead>
      <tbody>
        <tr v-for="c in created" :key="c.link">
          <td>{{ c.case }}</td>
          <td>
            <template v-if="c.post">
              <NuxtLink :to="`/posts/${c.post.slice(3)}`">{{ c.post }}</NuxtLink>
              <button class="linkbtn small" @click="copy(abs(c.post))">{{ copied === abs(c.post) ? '✓' : 'copy' }}</button>
            </template>
            <span v-else class="muted">—</span>
          </td>
          <td>
            <NuxtLink :to="`/links/${c.link.slice(3)}`">{{ c.link }}</NuxtLink>
            <button class="linkbtn small" @click="copy(abs(c.link))">{{ copied === abs(c.link) ? '✓' : 'copy' }}</button>
          </td>
        </tr>
      </tbody>
    </table>
  </section>

  <section class="card">
    <h2>2. Try these in Telegram</h2>
    <ol class="steps small">
      <li><b>Basic:</b> paste <code>/s/test-large</code> into Saved Messages and check that the preview matches.</li>
      <li><b>Change it live:</b> open that link in the editor, switch the image to the <i>red</i> test image, save, then press <i>Refresh in Telegram</i> (or post the new <code>?v=</code> link) and paste it again.</li>
      <li><b>Thumbnail vs large:</b> compare <code>/s/test-thumbnail</code> with <code>/s/test-large</code>.</li>
      <li><b>Text only:</b> <code>/s/test-no-image</code> should show no picture.</li>
      <li><b>Khmer:</b> <code>/s/test-khmer</code> checks Khmer letters in the title and description.</li>
      <li><b>Limits:</b> <code>/s/test-long-text</code> shows where Telegram cuts long text on your phone and desktop.</li>
      <li><b>Safety:</b> <code>/s/test-emoji</code> should show emoji, quotes and &lt;tags&gt; as plain text.</li>
      <li><b>Override:</b> <code>/s/test-override</code> shows a different title and image from the page it opens.</li>
      <li><b>Video &amp; audio:</b> <code>/s/test-video</code> and <code>/s/test-audio</code> carry og:video / og:audio. Use <i>Show Telegram's saved preview</i> to see the type and duration Telegram stored.</li>
      <li><b>Message options:</b> in any editor, try <i>Larger / Smaller</i> media, <i>Above text</i>, HTML formatting, a hidden link (remove <code>{link}</code>) and <i>No preview</i>. The mock updates as you click. Then <i>Send to Telegram</i> (Saved Messages works well).</li>
      <li><b>Live update of sent messages:</b> send a link from the tool, change its image and save. The tool edits the sent message so it shows the new preview.</li>
      <li><b>Per app:</b> paste <code>/s/test-per-app</code> into Telegram, Facebook, Messenger and WhatsApp. Each one should show its own title and image color (blue, red, green).</li>
      <li><b>Facebook &amp; Messenger:</b> in an editor, pick the <i>Facebook</i> tab, change something, save, then <i>Re-scrape on Facebook</i> (needs a Facebook app, see README). Or use the Sharing Debugger link.</li>
      <li><b>WhatsApp image size:</b> on the WhatsApp tab, use <i>Make a WhatsApp-safe copy</i> on the 2400×1260 image and compare the size check before and after.</li>
      <li><b>People vs Telegram:</b> tap a <code>/s/</code> link on your phone. You should land on the post page, not on the preview page.</li>
    </ol>
  </section>

  <section class="card">
    <h2>3. Test images</h2>
    <p class="muted small">Use these in any image field (there's also a "Use a test image…" menu in the editors).</p>
    <div class="imggrid">
      <div v-for="i in images" :key="i.file" class="imgcard">
        <img :src="i.url" alt="" />
        <div class="small"><b>{{ i.w }}×{{ i.h }}</b> · {{ i.note }}</div>
        <button class="btn sm" @click="copy(i.url)">{{ copied === i.url ? 'Copied ✓' : 'Copy URL' }}</button>
      </div>
    </div>
    <h2 style="margin-top:18px">Test video &amp; audio</h2>
    <div v-for="m in media" :key="m.file" class="copyrow small">
      <code>{{ m.url }}</code> <span class="muted">{{ m.note }}</span>
      <button class="btn sm" @click="copy(m.url)">{{ copied === m.url ? 'Copied ✓' : 'Copy URL' }}</button>
    </div>
  </section>
</template>
