import { render } from 'ink'
import { spawnSync } from 'node:child_process'
import { App } from './ui.tsx'
import { createStore } from './store.ts'
import { runWorkflow } from './workflow.ts'

const store = createStore()
const inkApp = render(<App store={store} />)

process.on('SIGINT', () => {
  inkApp.unmount()
  process.exit(130)
})

try {
  const { outPath } = await runWorkflow(store)
  await new Promise((r) => setTimeout(r, 250))
  const result = spawnSync('npx', ['tsx', outPath], { encoding: 'utf8' })
  const out = (result.stdout || '') + (result.stderr || '')
  store.setRunOutput(out)
  await new Promise((r) => setTimeout(r, 250))
  inkApp.unmount()
  process.exit(result.status ?? 0)
} catch (err) {
  inkApp.unmount()
  console.error('\nWorkflow failed:', err instanceof Error ? err.message : err)
  process.exit(1)
}
