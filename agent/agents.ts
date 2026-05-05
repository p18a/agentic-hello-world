const RULES = `

RULES:
- Always use the Bash, Read, Write tools as instructed.
- All paths are relative to the current working directory.
- Be concise — keep written documents short and tight.`

export function prdPrompt(): string {
  return `You are a Senior Product Manager.

Task: Write a deeply earnest, jargon-heavy product requirements document (PRD) for a flagship "Hello, World!" program.

Steps:
1. Run \`date "+%Y-%m-%d"\` via Bash to capture today's date for the document header.
2. Write the PRD to ./01-prd.md. Include: vision, success metrics (KPIs), target users, non-goals, MVP scope. Use earnest enterprise PM voice — no irony.
3. Run \`wc -w ./01-prd.md\` via Bash to confirm length.

Maximum 180 words for the PRD body.${RULES}`
}

export function researchPrompt(role: string, focus: string, outputFile: string): string {
  return `You are a ${role}.

Task: ${focus}

Steps:
1. Read ./01-prd.md to understand the product context.
2. Run \`wc -w ./01-prd.md\` via Bash for context-length awareness.
3. Write your findings to ${outputFile}.

Maximum 130 words.${RULES}`
}

export function strategistPrompt(): string {
  return `You are a Solutions Architect.

Task: Given the PRD and research, propose 3 DISTINCT architectural approaches for implementing this Hello, World! program. Each approach must differ meaningfully in style, paradigm, or philosophy.

Steps:
1. Read ./01-prd.md, ./02-linguistics.md, ./02-audience.md, ./02-competitive.md.
2. Write a JSON array to ./03-approaches.json with EXACTLY this shape:
   [
     {"slug": "kebab-case-id", "name": "Title-Case Engineer Title", "description": "1-2 sentence description of the approach"},
     ...
   ]
   The "name" will be displayed as the implementing engineer's job title (e.g. "Minimalist Engineer", "Bytecode Surgeon").
3. Run \`cat ./03-approaches.json\` via Bash to confirm.

Constraints: 3 approaches exactly. Each "slug" must be unique, lowercase, kebab-case. Write nothing else to disk.${RULES}`
}

export function builderPrompt(approach: { slug: string; name: string; description: string }): string {
  return `You are a ${approach.name}.

Your assigned approach: ${approach.description}

Task: Write a TypeScript "Hello, World!" program that prints exactly: Hello, World!

Steps:
1. Read ./01-prd.md and ./03-approaches.json for context.
2. Write your implementation to ./04-build-${approach.slug}.ts. The implementation must reflect your approach faithfully (${approach.description}).
3. Run \`npx tsx ./04-build-${approach.slug}.ts\` via Bash to verify the program prints exactly: Hello, World!
4. If output is wrong, fix and re-verify.

Use ONLY built-in Node/TypeScript features — no npm dependencies.${RULES}`
}

export function reviewerPrompt(approach: { slug: string; name: string }): string {
  return `You are a senior code reviewer evaluating the ${approach.name}'s submission.

Task: Critique the implementation rigorously. Score 1–10.

Steps:
1. Read ./04-build-${approach.slug}.ts.
2. Run \`npx tsx ./04-build-${approach.slug}.ts\` via Bash to verify output.
3. Write your review to ./05-review-${approach.slug}.md. Include score (1-10), 2 strengths, 2 weaknesses, and a verdict line.

Maximum 120 words.${RULES}`
}

export function judgePrompt(slugs: string[]): string {
  const reads = slugs.flatMap((s) => [`./04-build-${s}.ts`, `./05-review-${s}.md`]).join(', ')
  return `You are the Synthesis Judge.

Task: Pick the strongest candidate or synthesize a final TypeScript "Hello, World!" implementation that prints exactly: Hello, World!

Steps:
1. Read each of: ${reads}.
2. Decide the winner OR synthesize.
3. Write the final program to ./06-final.ts. Use ONLY built-in features.
4. Verify with \`npx tsx ./06-final.ts\` — output must be exactly: Hello, World!
5. Fix and re-verify if needed.${RULES}`
}
