/**
 * Step-by-step check of the GitHub publishing setup, with a fix for each failing step.
 * Ends with a real test write (published/.connection-check), the same kind of write "Publish" does.
 */
export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const g = githubConfig()
  const steps: { name: string; ok: boolean; detail: string; fix?: string }[] = []
  const done = () => ({ ok: steps.every((s) => s.ok), repo: g.repo, branch: g.branch, steps })

  if (!g.token || !g.repo) {
    steps.push({
      name: 'Settings in Vercel', ok: false,
      detail: `${g.token ? '' : 'NUXT_GITHUB_TOKEN is missing. '}${g.repo ? '' : 'NUXT_GITHUB_REPO is missing.'}`.trim(),
      fix: 'Add NUXT_GITHUB_TOKEN and NUXT_GITHUB_REPO (e.g. KheangLov/meta-tool) in Vercel → Settings → Environment Variables, for Production, then redeploy.',
    })
    return done()
  }
  if (!/^[\w.-]+\/[\w.-]+$/.test(g.repo)) {
    steps.push({ name: 'Repo name', ok: false, detail: `"${g.repo}" isn't in owner/name form.`, fix: 'Set NUXT_GITHUB_REPO to e.g. KheangLov/meta-tool (no https://github.com/ and no .git).' })
    return done()
  }
  steps.push({ name: 'Settings in Vercel', ok: true, detail: `Repo ${g.repo}, branch ${g.branch}` })

  steps.push(...(await githubDiagnose()))
  if (!steps.every((s) => s.ok)) return done()

  try {
    await writeFile('published/.connection-check', `${new Date().toISOString()}\n`, 'Connection check')
    steps.push({ name: 'Test write', ok: true, detail: `Wrote published/.connection-check on ${g.branch}` })
  } catch (e: any) {
    steps.push({
      name: 'Test write', ok: false, detail: e?.statusMessage || e?.message || String(e),
      fix: 'Give the token "Contents: Read and write" for this repo (fine-grained), or the "repo" scope (classic). Then redeploy.',
    })
  }
  return done()
})
