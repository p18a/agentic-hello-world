import { useEffect, useReducer, useState, useSyncExternalStore } from 'react'
import { Box, Text, useStdout } from 'ink'
import Spinner from 'ink-spinner'
import type { Store, AgentState, Stage } from './store.ts'

export function App({ store }: { store: Store }) {
  const state = useSyncExternalStore(store.subscribe, store.getState)
  const [, force] = useReducer((x: number) => x + 1, 0)

  useEffect(() => {
    const id = setInterval(() => force(), 200)
    return () => clearInterval(id)
  }, [])

  const rows = useTerminalRows()
  const stagesShown = Math.max(1, state.stages.length)
  const headerReserve = 3
  const finalReserve = (state.final ? 4 : 0) + (state.runOutput ? 5 : 0)
  const perStageChrome = 5 // title + 3 border/header lines + spacing
  const budget = rows - headerReserve - finalReserve - perStageChrome * stagesShown
  const bodyLines = Math.max(2, Math.min(8, Math.floor(budget / stagesShown)))

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold color="magenta">▶ agentic-hello-world</Text>
      </Box>

      {state.stages.map((stage) => {
        const agents = stage.agentIds.map((id) => state.agents[id]).filter(Boolean)
        const active = state.currentStageId === stage.id
        return <StageRow key={stage.id} stage={stage} agents={agents} active={active} bodyLines={bodyLines} />
      })}

      {state.final && (
        <Box marginTop={1} flexDirection="column" borderStyle="round" borderColor="green" paddingX={1}>
          <Text bold color="green">✓ wrote {state.final.outPath}</Text>
          <Text>{state.final.code.trimEnd()}</Text>
        </Box>
      )}

      {state.runOutput && (
        <Box marginTop={1} flexDirection="column" borderStyle="double" borderColor="magenta" paddingX={1}>
          <Text bold color="magenta">program output</Text>
          <Text>{state.runOutput.trimEnd()}</Text>
        </Box>
      )}
    </Box>
  )
}

function StageRow({ stage, agents, active, bodyLines }: { stage: Stage; agents: AgentState[]; active: boolean; bodyLines: number }) {
  const allDone = agents.length > 0 && agents.every((a) => a.status === 'done')
  const anyError = agents.some((a) => a.status === 'error')
  const titleColor = anyError ? 'red' : active ? 'cyan' : allDone ? 'green' : 'gray'

  return (
    <Box flexDirection="column">
      <Text bold color={titleColor}>{stage.name}</Text>
      {agents.length === 0 ? (
        <Box paddingLeft={2}><Text color="gray" dimColor>○ awaiting upstream stage…</Text></Box>
      ) : (
        <Box flexDirection="row" gap={1}>
          {agents.map((a) => <AgentPanel key={a.id} agent={a} bodyLines={bodyLines} />)}
        </Box>
      )}
    </Box>
  )
}

function AgentPanel({ agent, bodyLines }: { agent: AgentState; bodyLines: number }) {
  const elapsed = agent.startedAt ? ((agent.endedAt ?? Date.now()) - agent.startedAt) / 1000 : 0

  let borderColor = 'gray'
  let dimContent = false
  let titleDim = false
  if (agent.status === 'pending') { titleDim = true; dimContent = true }
  else if (agent.status === 'running') { borderColor = 'cyan' }
  else if (agent.status === 'error') { borderColor = 'red' }
  else if (agent.status === 'done') { dimContent = true }

  const thinkingTail = agent.thinking
    ? agent.thinking.replace(/\s+/g, ' ').trim().slice(-160)
    : ''
  const logBudget = thinkingTail ? Math.max(1, bodyLines - 1) : bodyLines
  const lines = agent.log.slice(-logBudget)
  while (lines.length < logBudget) lines.push('')

  return (
    <Box
      flexDirection="column"
      flexGrow={1}
      flexBasis={0}
      borderStyle="round"
      borderColor={borderColor}
      paddingX={1}
    >
      <Box>
        <StatusIcon status={agent.status} />
        <Text> </Text>
        <Text bold dimColor={titleDim} wrap="truncate">{agent.name}</Text>
        {agent.status !== 'pending' && (
          <>
            <Text>  </Text>
            <Text color="gray" dimColor={titleDim}>{elapsed.toFixed(1)}s</Text>
          </>
        )}
      </Box>
      <Box flexDirection="column">
        {lines.map((line, i) => (
          <Text key={i} dimColor={dimContent} wrap="truncate">{line || ' '}</Text>
        ))}
        {thinkingTail && (
          <Text color="magenta" dimColor wrap="truncate">🧠 {thinkingTail}</Text>
        )}
      </Box>
    </Box>
  )
}

function StatusIcon({ status }: { status: AgentState['status'] }) {
  if (status === 'pending') return <Text color="gray" dimColor>○</Text>
  if (status === 'running') return <Text color="cyan"><Spinner type="dots" /></Text>
  if (status === 'done') return <Text color="green">✓</Text>
  return <Text color="red">✗</Text>
}

function useTerminalRows(): number {
  const { stdout } = useStdout()
  const [rows, setRows] = useState(stdout.rows || 30)
  useEffect(() => {
    const onResize = () => setRows(stdout.rows || 30)
    stdout.on('resize', onResize)
    return () => { stdout.off('resize', onResize) }
  }, [stdout])
  return rows
}
