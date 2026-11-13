/**
 * App-side Squirkle setup:
 *  - remembers the colour mode (system / light / dark) on this device and follows the OS in "system"
 *  - registers the few app icons that aren't built into Squirkle (so no network is needed for icons)
 */
import { addIcons, config } from '@squirkle-ui/ui'

export type ColorMode = 'system' | 'light' | 'dark'
const KEY = 'lps-color-mode'

export default defineNuxtPlugin(() => {
  addIcons({
    'lps:link': { body: '<path fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>', width: 24, height: 24 },
    'lps:post': { body: '<g fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><rect x="4" y="3.5" width="16" height="17" rx="3"/><path d="M8 8.5h8M8 12h8M8 15.5h5"/></g>', width: 24, height: 24 },
    'lps:flask': { body: '<path fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3l-5-9V3M7.5 15h9"/>', width: 24, height: 24 },
    'lps:gear': { body: '<g fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M4.6 4.6l2.1 2.1M17.3 17.3l2.1 2.1M2.5 12h3M18.5 12h3M4.6 19.4l2.1-2.1M17.3 6.7l2.1-2.1"/></g>', width: 24, height: 24 },
    'lps:send': { body: '<path fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round" d="M21 3 3 10.5l7 2.5 2.5 7z M10 13l11-10"/>', width: 24, height: 24 },
    'lps:external': { body: '<path fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" d="M14 4h6v6M20 4l-9 9M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4"/>', width: 24, height: 24 },
    'lps:upload': { body: '<path fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" d="M12 16V4M7 9l5-5 5 5M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/>', width: 24, height: 24 },
    'lps:system': { body: '<g fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><rect x="3" y="4" width="18" height="12" rx="2.5"/><path d="M8 20h8M12 16v4"/></g>', width: 24, height: 24 },
  })

  const media = window.matchMedia('(prefers-color-scheme: dark)')
  const mode = useState<ColorMode>('color-mode', () => {
    try { return (localStorage.getItem(KEY) as ColorMode) || 'system' } catch { return 'system' }
  })
  const apply = () => {
    const dark = mode.value === 'dark' || (mode.value === 'system' && media.matches)
    config.theme.name = dark ? 'dark' : 'light'
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0c110f' : '#f2f4f1')
  }
  apply()
  media.addEventListener('change', apply)
  // The module's head tag re-adds "sq-theme--light" on navigation; keep only the active theme's class
  new MutationObserver(() => {
    const cl = document.documentElement.classList
    const want = `sq-theme--${config.theme.name}`
    for (const c of Array.from(cl)) if (c.startsWith('sq-theme--') && c !== want) cl.remove(c)
    if (!cl.contains(want)) cl.add(want)
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
  watch(mode, (m) => {
    try { localStorage.setItem(KEY, m) } catch {}
    apply()
  })
})
