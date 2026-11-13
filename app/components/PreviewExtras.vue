<script setup lang="ts">
/** Advanced Open Graph / Telegram fields. v-model is the `extra` object. */
const model = defineModel<PreviewExtra>({ required: true })
defineProps<{ imageSize?: { width: number; height: number } | null; disabled?: boolean }>()

const set = (k: keyof PreviewExtra, v: string) => {
  const next: any = { ...model.value }
  const numeric = ['imageWidth', 'imageHeight', 'videoWidth', 'videoHeight', 'videoDuration'].includes(k)
  if (v === '' || v === undefined) delete next[k]
  else next[k] = numeric ? Number(v) || undefined : v
  model.value = next
}
const count = computed(() => Object.values(model.value || {}).filter((v) => v !== undefined && v !== '').length)
</script>

<template>
  <details class="extras">
    <summary>
      Advanced: page type, author, video, audio, channel
      <span v-if="count" class="pill">{{ count }} set</span>
    </summary>
    <fieldset class="plain" :disabled="disabled">
      <div class="grid2">
        <label class="field">
          <span>Page type <em>(og:type)</em></span>
          <select class="input" :value="model.ogType || ''" @change="set('ogType', ($event.target as HTMLSelectElement).value)">
            <option value="">Automatic</option>
            <option value="website">website</option>
            <option value="article">article</option>
            <option value="video.other">video</option>
            <option value="video.movie">movie</option>
            <option value="music.song">song</option>
            <option value="profile">profile</option>
            <option value="book">book</option>
          </select>
        </label>
        <label class="field">
          <span>Author</span>
          <input class="input" :value="model.author || ''" placeholder="Jane Doe" @input="set('author', ($event.target as HTMLInputElement).value)" />
        </label>
        <label class="field">
          <span>Published</span>
          <input class="input" type="datetime-local" :value="(model.publishedTime || '').slice(0, 16)" @input="set('publishedTime', ($event.target as HTMLInputElement).value)" />
        </label>
        <label class="field">
          <span>Language <em>(og:locale)</em></span>
          <input class="input" :value="model.locale || ''" placeholder="km_KH or en_US" @input="set('locale', ($event.target as HTMLInputElement).value)" />
        </label>
      </div>

      <div class="subhead">Image details</div>
      <div class="grid3">
        <label class="field">
          <span>Width</span>
          <input class="input" type="number" min="1" :value="model.imageWidth || ''" :placeholder="imageSize?.width ? String(imageSize.width) : 'auto'" @input="set('imageWidth', ($event.target as HTMLInputElement).value)" />
        </label>
        <label class="field">
          <span>Height</span>
          <input class="input" type="number" min="1" :value="model.imageHeight || ''" :placeholder="imageSize?.height ? String(imageSize.height) : 'auto'" @input="set('imageHeight', ($event.target as HTMLInputElement).value)" />
        </label>
        <div class="field">
          <span>&nbsp;</span>
          <SqBtn variant="text" size="small" :disabled="!imageSize?.width" @click="model = { ...model, imageWidth: imageSize!.width, imageHeight: imageSize!.height }">Use real size</SqBtn>
        </div>
      </div>
      <label class="field">
        <span>Image description <em>(alt text)</em></span>
        <input class="input" :value="model.imageAlt || ''" placeholder="What the image shows" @input="set('imageAlt', ($event.target as HTMLInputElement).value)" />
      </label>

      <div class="subhead">Video <em class="muted">(og:video)</em></div>
      <label class="field">
        <span>Video URL <em>(a direct .mp4, or a player page like YouTube's embed URL)</em></span>
        <input class="input" type="url" :value="model.videoUrl || ''" placeholder="https://…/clip.mp4" @input="set('videoUrl', ($event.target as HTMLInputElement).value)" />
      </label>
      <div class="grid4">
        <label class="field"><span>Type</span>
          <select class="input" :value="model.videoType || ''" @change="set('videoType', ($event.target as HTMLSelectElement).value)">
            <option value="">Auto</option><option value="video/mp4">video/mp4</option><option value="video/webm">video/webm</option><option value="text/html">player page</option>
          </select>
        </label>
        <label class="field"><span>Width</span><input class="input" type="number" :value="model.videoWidth || ''" @input="set('videoWidth', ($event.target as HTMLInputElement).value)" /></label>
        <label class="field"><span>Height</span><input class="input" type="number" :value="model.videoHeight || ''" @input="set('videoHeight', ($event.target as HTMLInputElement).value)" /></label>
        <label class="field"><span>Seconds</span><input class="input" type="number" :value="model.videoDuration || ''" @input="set('videoDuration', ($event.target as HTMLInputElement).value)" /></label>
      </div>

      <div class="subhead">Audio <em class="muted">(og:audio)</em></div>
      <label class="field">
        <span>Audio URL</span>
        <input class="input" type="url" :value="model.audioUrl || ''" placeholder="https://…/track.mp3" @input="set('audioUrl', ($event.target as HTMLInputElement).value)" />
      </label>

      <div class="subhead">Telegram</div>
      <label class="field">
        <span>Your Telegram channel <em>(telegram:channel, used by Instant View)</em></span>
        <input class="input" :value="model.tgChannel || ''" placeholder="@mychannel" @input="set('tgChannel', ($event.target as HTMLInputElement).value)" />
      </label>

      <label class="field">
        <span>Accent colour <em>(theme-color: the colour bar on Discord's card)</em></span>
        <div class="row">
          <input type="color" :value="model.themeColor || '#0e6b55'" aria-label="Pick a colour" @input="set('themeColor', ($event.target as HTMLInputElement).value)" />
          <input class="input grow" :value="model.themeColor || ''" placeholder="#0e6b55" @input="set('themeColor', ($event.target as HTMLInputElement).value)" />
        </div>
      </label>

      <p class="muted small">
        Telegram stores these with the preview. How each app shows them varies (e.g. a video badge, an author line), so use
        "Show Telegram's saved preview" to see what Telegram kept. Video playback inside the preview is most reliable for small direct .mp4 files.
      </p>
    </fieldset>
  </details>
</template>

<style scoped>
.extras { border: 1px solid var(--line); border-radius: 8px; padding: 8px 12px; margin-bottom: 14px; }
.extras summary { cursor: pointer; font-size: 13px; font-weight: 600; display: flex; gap: 8px; align-items: center; }
.extras[open] summary { margin-bottom: 12px; }
.grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 0 10px; }
.grid3 { display: grid; grid-template-columns: 1fr 1fr auto; gap: 0 10px; }
.grid4 { display: grid; grid-template-columns: 1.4fr 1fr 1fr 1fr; gap: 0 10px; }
.subhead { font-size: 14px; font-weight: 650; color: var(--ink); margin: 10px 0 8px; padding-top: 10px; border-top: 1px solid var(--rule); }
@media (max-width: 560px) { .grid2, .grid4 { grid-template-columns: 1fr 1fr; } }
</style>
