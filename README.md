# ai-kiro-kit

Kiro IDE companion to [ai-dev-kit](https://github.com/noetic97/ai-dev-kit). Optimized for team use.

---

## What this is

A minimal Kiro toolkit that makes ai-dev-kit's skills available in Kiro, paired with Kiro-native agents, hooks, and steering templates designed for team contexts.

**Skills** are shared with ai-dev-kit — same format, imported via `sync-skills.ts`.
**Everything else** (agents, hooks, steering) is Kiro-native and written fresh for a team context.

This is not a port of ai-dev-kit. It is a companion: the two toolkits share a skill set and evolve independently.

---

## Team orientation

Unlike ai-dev-kit (a personal tool with opinionated defaults), ai-kiro-kit is team-neutral:

- Steering files are **templates**. Your team fills them in with your own conventions.
- Hooks are **off by default**. Teams opt in per-agent.
- Agents use **read-only tool scoping** where possible — safe for code review, diff exploration, security audits.

The kit gives you the structure. Your team provides the content.

---

## Relationship to ai-dev-kit

| Concern | ai-dev-kit | ai-kiro-kit |
|---|---|---|
| Skills | Source of truth | Imported via sync-skills.ts |
| Agents | Claude Code markdown format | Kiro JSON format |
| Hooks | Global (settings.json) | Per-agent, opt-in |
| Steering | Single CLAUDE.md | Directory of focused .md files |
| Audience | Solo developer | Team / org |

---

## Quick start

### Global install (skills, agents, hooks available in all Kiro sessions)

```bash
git clone https://github.com/noetic97/ai-kiro-kit.git
cd ai-kiro-kit
bun run install-global
```

This deploys to `~/.kiro/` — Kiro picks these up automatically.

### Scaffold a new project

```bash
cd /path/to/your/project
bun run init --kit /path/to/ai-kiro-kit
```

This creates `.kiro/` in your project with:
- Steering templates in `.kiro/steering/`
- Skills, agents, and hooks copied from the kit
- `AGENTS.md` at the project root (if not already present)

Then fill in the four steering files with your project's conventions.

### Sync skills from ai-dev-kit

If you have a local clone of ai-dev-kit and want to pull in updated skills:

```bash
bun run sync-skills --source /path/to/ai-dev-kit
```

---

## Hooks

Two hooks are included. Both are **off by default** — register them in whichever agent configs make sense for your team.

### `post-write-test.sh`

Runs `bun test` after every file write. Guards: requires `bun`, `package.json`, a `"test"` script, and at least one `*.test.ts` file. Safe to enable globally — exits silently if conditions aren't met.

To enable for an agent, add to its JSON config:

```json
"hooks": {
  "postToolUse": [
    { "matcher": "fs_write", "command": ".kiro/hooks/post-write-test.sh" }
  ]
}
```

### `session-end-reminder.sh`

Reminds you to commit and update context before ending a session. Only fires if there are uncommitted changes.

```json
"hooks": {
  "stop": [
    { "command": ".kiro/hooks/session-end-reminder.sh" }
  ]
}
```

---

## Steering files

After scaffolding, your project's `.kiro/steering/` contains four files to fill in:

| File | Purpose |
|---|---|
| `product.md` | Product vision, target users, core features |
| `structure.md` | Directory layout, domain layers, I/O boundaries |
| `tech.md` | Stack, runtime, testing framework, key dependencies |
| `context.md` | Living session context — current focus, active decisions, next up |

All four have `inclusion: always` frontmatter — Kiro includes them in every session automatically.

`context.md` is the most important one to keep current. Run `/update-context` at the end of each session.

---

## Transferring to your org

When your org is ready to adopt this kit, transfer the repo:

```
GitHub → Settings → Transfer → enter org name
```

Update the clone URL in your team's onboarding docs. Everything else stays the same.
