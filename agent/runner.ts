import { query } from '@anthropic-ai/claude-agent-sdk'
import type { Store } from './store.ts'

export interface RunOpts {
  cwd: string
  maxTurns?: number
}

const THINKING_THROTTLE_MS = 80

export async function runAgent(
  agentId: string,
  prompt: string,
  store: Store,
  opts: RunOpts,
): Promise<string> {
  store.patchAgent(agentId, { status: 'running', startedAt: Date.now() })
  store.appendLog(agentId, '› starting')

  let lastAssistantText = ''
  let resultText = ''
  let thinkingBuf = ''
  let lastThinkingFlush = 0

  try {
    for await (const message of query({
      prompt,
      options: {
        maxTurns: opts.maxTurns ?? 12,
        allowedTools: ['Read', 'Write', 'Edit', 'Bash'],
        permissionMode: 'bypassPermissions',
        allowDangerouslySkipPermissions: true,
        cwd: opts.cwd,
        maxThinkingTokens: 3000,
        includePartialMessages: true,
      },
    })) {
      if (message.type === 'stream_event') {
        const ev = (message as unknown as { event: any }).event
        if (!ev || typeof ev !== 'object') continue

        if (ev.type === 'content_block_start') {
          const block = ev.content_block
          if (block?.type === 'thinking') {
            thinkingBuf = ''
            store.setThinking(agentId, '')
          }
        } else if (ev.type === 'content_block_delta') {
          const d = ev.delta
          if (d?.type === 'thinking_delta' && typeof d.thinking === 'string') {
            thinkingBuf += d.thinking
            const now = Date.now()
            if (now - lastThinkingFlush >= THINKING_THROTTLE_MS) {
              lastThinkingFlush = now
              store.setThinking(agentId, thinkingBuf)
            }
          }
        } else if (ev.type === 'content_block_stop') {
          if (thinkingBuf) {
            const summary = thinkingBuf.replace(/\s+/g, ' ').trim().slice(0, 100)
            store.appendLog(agentId, `🧠 ${summary}`)
            thinkingBuf = ''
            store.setThinking(agentId, undefined)
          }
        }
        continue
      }

      if (message.type === 'assistant' && message.message?.content) {
        for (const block of message.message.content) {
          if (block.type === 'text' && block.text.trim()) {
            lastAssistantText = block.text
            const first = block.text.split('\n').map((l) => l.trim()).find(Boolean) ?? ''
            store.appendLog(agentId, `· ${first.slice(0, 100)}`)
          } else if (block.type === 'tool_use') {
            store.appendLog(agentId, `→ ${block.name}${summarizeInput(block.name, block.input)}`)
          }
        }
      } else if (message.type === 'result' && 'result' in message) {
        resultText = String(message.result ?? '')
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    store.patchAgent(agentId, { status: 'error', endedAt: Date.now(), error: msg })
    store.appendLog(agentId, `✗ ${msg}`)
    throw err
  }

  store.setThinking(agentId, undefined)
  const finalText = resultText || lastAssistantText
  store.patchAgent(agentId, { status: 'done', endedAt: Date.now(), result: finalText })
  store.appendLog(agentId, '✓ done')
  return finalText
}

function summarizeInput(name: string, input: unknown): string {
  if (!input || typeof input !== 'object') return ''
  const i = input as Record<string, unknown>
  if (name === 'Bash' && typeof i.command === 'string') {
    return ` ${i.command.split('\n')[0].slice(0, 60)}`
  }
  if ((name === 'Read' || name === 'Write' || name === 'Edit') && typeof i.file_path === 'string') {
    return ` ${i.file_path.split('/').slice(-2).join('/')}`
  }
  return ''
}
