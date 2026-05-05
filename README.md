# agentic-hello-world

A six-stage, eleven-agent pipeline that produces a Hello, World! program.

![screenshot](screenshot.png)

## Pipeline

| Stage | Agents |
|------:|:-------|
| 1 | Senior Product Manager — writes a PRD |
| 2 | Linguistics Researcher · UX Researcher · Competitive Analyst (parallel) |
| 3 | Solutions Architect — proposes 3 implementation approaches |
| 4 | Three engineers, dynamically titled per the architect's approaches (parallel) |
| 5 | Three reviewers, one per candidate (parallel) |
| 6 | Synthesis Judge — picks a winner or merges; writes the final program |

Stages 4 and 5 are populated at runtime from the architect's output. Each agent runs as a `query()` to the [Claude Agent SDK](https://www.npmjs.com/package/@anthropic-ai/claude-agent-sdk) with `Read`, `Write`, `Edit`, and `Bash` enabled, and shares state via files in `.workdir/`. Builders and reviewers verify code by executing it with `npx tsx`. The final program lands at `output/hello.ts`.

## CLI

The TUI is [Ink](https://github.com/vadimdemedes/ink). Each stage is a row of bordered panels — one per agent — with live tool-use logs. Extended thinking (`maxThinkingTokens: 3000`, `includePartialMessages: true`) is streamed into a `🧠 …` tail line. Panel height adapts to terminal rows.

## Run

```bash
npm install
npm start
```

Requires Claude Code installed and authenticated. A full run is ~3 minutes.

## Layout

```
agent/
  agents.ts     prompt builders
  cli.tsx       entry point
  runner.ts     single-agent execution + log/thinking capture
  store.ts     subscribable state
  ui.tsx        Ink components
  workflow.ts   stage orchestration
scripts/test-sdk.ts   SDK smoke test (npm run test:sdk)
```
