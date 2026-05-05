export type AgentStatus = 'pending' | 'running' | 'done' | 'error'

export interface AgentState {
  id: string
  name: string
  stageId: string
  status: AgentStatus
  log: string[]
  thinking?: string
  result?: string
  error?: string
  startedAt?: number
  endedAt?: number
}

export interface Stage {
  id: string
  name: string
  agentIds: string[]
}

export interface State {
  stages: Stage[]
  agents: Record<string, AgentState>
  currentStageId: string | null
  final: { code: string; outPath: string } | null
  runOutput: string | null
}

export interface Store {
  getState(): State
  subscribe(fn: () => void): () => void
  setStages(stages: Stage[]): void
  setStageAgents(stageId: string, agentIds: string[]): void
  registerAgent(agent: { id: string; name: string; stageId: string }): void
  patchAgent(id: string, patch: Partial<AgentState>): void
  appendLog(id: string, line: string): void
  setThinking(id: string, thinking: string | undefined): void
  setCurrentStage(id: string | null): void
  setFinal(final: { code: string; outPath: string }): void
  setRunOutput(out: string): void
}

const LOG_CAP = 30

export function createStore(): Store {
  let state: State = {
    stages: [],
    agents: {},
    currentStageId: null,
    final: null,
    runOutput: null,
  }
  const listeners = new Set<() => void>()
  const notify = () => { for (const fn of listeners) fn() }

  return {
    getState: () => state,
    subscribe(fn) {
      listeners.add(fn)
      return () => { listeners.delete(fn) }
    },
    setStages(stages) {
      state = { ...state, stages }
      notify()
    },
    setStageAgents(stageId, agentIds) {
      state = {
        ...state,
        stages: state.stages.map((s) => (s.id === stageId ? { ...s, agentIds } : s)),
      }
      notify()
    },
    registerAgent({ id, name, stageId }) {
      state = {
        ...state,
        agents: {
          ...state.agents,
          [id]: { id, name, stageId, status: 'pending', log: [] },
        },
      }
      notify()
    },
    patchAgent(id, patch) {
      const existing = state.agents[id]
      if (!existing) return
      state = { ...state, agents: { ...state.agents, [id]: { ...existing, ...patch } } }
      notify()
    },
    appendLog(id, line) {
      const existing = state.agents[id]
      if (!existing) return
      const log = [...existing.log, line].slice(-LOG_CAP)
      state = { ...state, agents: { ...state.agents, [id]: { ...existing, log } } }
      notify()
    },
    setThinking(id, thinking) {
      const existing = state.agents[id]
      if (!existing) return
      state = { ...state, agents: { ...state.agents, [id]: { ...existing, thinking } } }
      notify()
    },
    setCurrentStage(id) {
      state = { ...state, currentStageId: id }
      notify()
    },
    setFinal(final) {
      state = { ...state, final }
      notify()
    },
    setRunOutput(out) {
      state = { ...state, runOutput: out }
      notify()
    },
  }
}
