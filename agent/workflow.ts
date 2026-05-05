import * as fs from 'node:fs'
import * as path from 'node:path'
import {
  prdPrompt,
  researchPrompt,
  strategistPrompt,
  builderPrompt,
  reviewerPrompt,
  judgePrompt,
} from './agents.ts'
import { runAgent } from './runner.ts'
import type { Store } from './store.ts'

interface Approach {
  slug: string
  name: string
  description: string
}

export async function runWorkflow(store: Store): Promise<{ outPath: string }> {
  const workdir = path.join(process.cwd(), '.workdir')
  fs.rmSync(workdir, { recursive: true, force: true })
  fs.mkdirSync(workdir, { recursive: true })
  const opts = { cwd: workdir }

  store.setStages([
    { id: 'requirements', name: 'Stage 1 · Requirements', agentIds: ['prd'] },
    { id: 'research', name: 'Stage 2 · Research (parallel ×3)', agentIds: ['linguistics', 'audience', 'competitive'] },
    { id: 'strategy', name: 'Stage 3 · Strategy', agentIds: ['strategist'] },
    { id: 'implementation', name: 'Stage 4 · Implementation (parallel, dynamic)', agentIds: [] },
    { id: 'review', name: 'Stage 5 · Review (parallel, dynamic)', agentIds: [] },
    { id: 'synthesis', name: 'Stage 6 · Synthesis', agentIds: ['judge'] },
  ])

  store.registerAgent({ id: 'prd', name: 'Senior Product Manager', stageId: 'requirements' })
  store.registerAgent({ id: 'linguistics', name: 'Linguistics Researcher', stageId: 'research' })
  store.registerAgent({ id: 'audience', name: 'UX Researcher', stageId: 'research' })
  store.registerAgent({ id: 'competitive', name: 'Competitive Analyst', stageId: 'research' })
  store.registerAgent({ id: 'strategist', name: 'Solutions Architect', stageId: 'strategy' })
  store.registerAgent({ id: 'judge', name: 'Synthesis Judge', stageId: 'synthesis' })

  store.setCurrentStage('requirements')
  await runAgent('prd', prdPrompt(), store, opts)

  store.setCurrentStage('research')
  await Promise.all([
    runAgent(
      'linguistics',
      researchPrompt(
        'Linguistics Researcher',
        'Research the etymology and historical use of the greeting "hello". Cite a few key milestones (Edison, telephone era, etc.).',
        './02-linguistics.md',
      ),
      store,
      opts,
    ),
    runAgent(
      'audience',
      researchPrompt(
        'UX Researcher',
        'Produce a target audience analysis with 2 user personas and jobs-to-be-done.',
        './02-audience.md',
      ),
      store,
      opts,
    ),
    runAgent(
      'competitive',
      researchPrompt(
        'Competitive Analyst',
        'Survey existing Hello World implementations across 4 programming languages. Brief SWOT analysis of the category.',
        './02-competitive.md',
      ),
      store,
      opts,
    ),
  ])

  store.setCurrentStage('strategy')
  await runAgent('strategist', strategistPrompt(), store, opts)

  const approaches = readApproaches(workdir)

  for (const a of approaches) {
    store.registerAgent({ id: `build-${a.slug}`, name: a.name, stageId: 'implementation' })
  }
  store.setStageAgents('implementation', approaches.map((a) => `build-${a.slug}`))

  store.setCurrentStage('implementation')
  await Promise.all(
    approaches.map((a) => runAgent(`build-${a.slug}`, builderPrompt(a), store, opts)),
  )

  for (const a of approaches) {
    store.registerAgent({ id: `review-${a.slug}`, name: `Reviewer · ${a.name}`, stageId: 'review' })
  }
  store.setStageAgents('review', approaches.map((a) => `review-${a.slug}`))

  store.setCurrentStage('review')
  await Promise.all(
    approaches.map((a) => runAgent(`review-${a.slug}`, reviewerPrompt(a), store, opts)),
  )

  store.setCurrentStage('synthesis')
  await runAgent('judge', judgePrompt(approaches.map((a) => a.slug)), store, opts)

  const finalSrc = path.join(workdir, '06-final.ts')
  const code = fs.readFileSync(finalSrc, 'utf8')
  const outDir = path.join(process.cwd(), 'output')
  fs.mkdirSync(outDir, { recursive: true })
  const outPath = path.join(outDir, 'hello.ts')
  fs.writeFileSync(outPath, code)
  store.setFinal({ code, outPath })
  return { outPath }
}

function readApproaches(workdir: string): Approach[] {
  const raw = fs.readFileSync(path.join(workdir, '03-approaches.json'), 'utf8')
  // Tolerate optional code fences if the model wrapped the JSON.
  const stripped = raw.replace(/^\s*```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim()
  const parsed = JSON.parse(stripped) as unknown
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error('strategist: 03-approaches.json is not a non-empty array')
  }
  return parsed.map((a, i) => {
    if (
      !a || typeof a !== 'object' ||
      typeof (a as Approach).slug !== 'string' ||
      typeof (a as Approach).name !== 'string' ||
      typeof (a as Approach).description !== 'string'
    ) {
      throw new Error(`strategist: approach ${i} missing required fields`)
    }
    return a as Approach
  })
}
