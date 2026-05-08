# ai-kiro-kit — Team Demo Guide

30-minute walkthrough of the full kit workflow: init a project, spec a feature, build it,
run code review and adversarial review, then commit and PR.

---

## What you need installed (work computer)

- [Kiro IDE](https://kiro.dev)
- [Bun](https://bun.sh)
- [GitHub CLI](https://cli.github.com) (`gh`)
- Git

---

## Pre-demo setup (~15 min, before the presentation)

### 1. Clone the kit

```bash
git clone https://github.com/noetic97/ai-kiro-kit.git
cd ai-kiro-kit
```

### 2. Create the demo project repo

```bash
gh repo create kiro-demo-todo --public --description "CLI to-do manager — ai-kiro-kit team demo"
git clone https://github.com/<your-username>/kiro-demo-todo.git
```

### 3. Scaffold the demo project

```bash
# From the ai-kiro-kit directory:
bun run init /path/to/kiro-demo-todo
```

You should see 49 files created across `.kiro/steering/`, `.kiro/skills/`, `.kiro/agents/`,
`.kiro/hooks/`, and `AGENTS.md` at the project root.

### 4. Fill in the steering files

Open `kiro-demo-todo/.kiro/steering/` and paste the content below into each file.
Do this before the demo so you can just open the files live rather than type.

**`product.md`** — replace the placeholder body with:

```markdown
## Product Vision

CLI to-do manager for developers who want to track tasks without leaving the terminal.

## Target Users

Individual developers. Technical. Always in a terminal. Don't want to context-switch to a browser.

## Core Features

- Add a task with a description
- List all tasks with status and ID
- Mark a task done by ID
- Delete a task by ID
- Persist tasks between runs (JSON file in the project root)

## Non-Goals

- No sync, no cloud, no web UI
- No tags, priorities, or due dates in v1
- No multi-user support
```

**`tech.md`** — replace the placeholder body with:

```markdown
## Stack & Runtime

- Language: TypeScript (strict)
- Runtime: Bun

## Testing Framework

Bun test. Tests live alongside source (`*.test.ts`).

## Paradigm Preferences

Functional. No classes. Pure functions where possible. Immutable data structures.
Discriminated unions for state modeling.

## Key Dependencies

None beyond Bun built-ins.

## Linting & Formatting

Prettier defaults. No custom rules.
```

**`structure.md`** and **`context.md`** — leave as-is. You'll fill these in live during the demo.

### 5. Build plan B (insurance)

Build a working implementation on a safety branch before the demo.
If something goes wrong during the live build, switch to this branch and continue from the review step.

```bash
cd kiro-demo-todo
git checkout -b plan-b/working-impl
```

Then implement the to-do manager manually (or with Kiro in a private session).
Commit it, but do not push or mention it unless you need it.

### 6. Open both repos in Kiro

Have `ai-kiro-kit` and `kiro-demo-todo` open as separate workspaces in Kiro IDE before the presentation starts.

---

## Demo script (30 min)

### 0:00–3:00 — Init a project with one command

Switch to `kiro-demo-todo`. Show the empty repo, then switch back to the kit and run:

```bash
bun run init /path/to/kiro-demo-todo
```

Switch back to `kiro-demo-todo` and open the `.kiro/` directory. Walk through what appeared:

| Directory | What it is |
|---|---|
| `.kiro/steering/` | Four files Kiro loads in every session — conventions, stack, current focus |
| `.kiro/agents/` | Three read-only reviewer agents |
| `.kiro/hooks/` | Test runner and session-end reminder (off by default) |
| `AGENTS.md` | Auto-included by Kiro — points to `.kiro/steering/` |

> **Talking point:** "This is the entire onboarding cost for a new project. One command. Then you fill in four files with things your team already knows."

---

### 3:00–5:00 — Show what Kiro inherits

Open `.kiro/steering/product.md` and `.kiro/steering/tech.md` (you pre-filled these). Scroll through them.

> **Talking point:** "These files are in version control. Every AI session — regardless of who runs it — starts with the same context. No one copies the README into a prompt. No one re-explains the stack."

Open `.kiro/agents/adversarial-reviewer.json` briefly. Point out `"tools": ["read"]`.

> **Talking point:** "The reviewers are read-only by config. They can't change anything. They can only find problems."

---

### 5:00–12:00 — Spec the feature with Kiro's native spec workflow

Open a new Kiro session in `kiro-demo-todo`. Type:

> "I want a CLI to-do manager. A developer should be able to add tasks, list all tasks, mark a task done, and delete a task. Tasks should persist between runs."

Let Kiro run its native spec flow. It will:
1. Ask 2–3 clarifying questions (answer them briefly)
2. Generate requirements in EARS notation
3. Generate a design doc with data shapes and file structure
4. Generate an implementation task list

When the design appears, fill in `.kiro/steering/structure.md` with the proposed file layout.

> **Talking point:** "This spec lives in the repo. When someone joins the team mid-feature, they read the spec, not a Slack thread."

Approve the spec. Do not approve anything you're not comfortable defending — adjust it if needed.

---

### 12:00–22:00 — Build it

Let Kiro work through the task list. As it writes files, point out:

- It's following the functional style from `tech.md` — pure functions, no classes
- It's writing tests alongside implementation (Bun test)

At a natural pause (around minute 18), run it live:

```bash
bun todo.ts add "Migrate team to Kiro"
bun todo.ts add "Review adversarial findings"
bun todo.ts list
bun todo.ts done 1
bun todo.ts list
```

> **Talking point:** "The steering files aren't just documentation. They're instructions the model is actually following."

---

### 22:00–25:00 — Code review

In the Kiro session, run:

```
/code-review
```

Pick one concrete finding from the output, fix it live. Show the fix loop working.

> **Talking point:** "The review rubric is in `.kiro/skills/code-review/review-rubric.md`. That's the source of what you just saw. You can edit it."

---

### 25:00–28:00 — Adversarial review

```
/adversarial-review
```

This is the most visually striking part. Do NOT fix anything — just let the findings land.

Likely findings to highlight as they appear:
- First run fails if `todos.json` doesn't exist
- Empty task description is accepted silently
- `done` on an already-completed task is a silent no-op
- No bounds check on ID argument

> **Talking point:** "Different role, different lens. The previous review checked correctness. This one tried to break it. These are two separate agents — neither knows the other ran."

---

### 28:00–30:00 — Commit and PR

```
/commit
```

Watch it: inspect the diff, group logically related files, write a conventional commit message,
update `context.md` automatically.

> **Talking point:** "It updated `context.md` because the commit skill checks whether the current session state changed. That's a skill, not default behavior — it's in `.kiro/skills/commit/SKILL.md`."

Then create the PR:

```bash
gh pr create --title "feat: initial CLI to-do manager" \
  --body "Adds add/list/done/delete commands with JSON persistence. Functional style, Bun runtime, tests alongside source."
```

> **Talking point:** "The `pr-description` skill generates a full PR body from the diff. It uses Gitea today — one of the rough edges we found during dogfooding. GitHub support is on the backlog."

---

## Key messages (reference during Q&A)

**Why not just use the AI directly?**
The kit gives the AI durable context it can't get from a single prompt — stack, conventions, current focus, team decisions. Every session inherits it automatically.

**Is this a wrapper around Kiro?**
No. It's skills, agents, and steering files. Kiro loads them natively. Nothing is monkey-patched or scripted.

**What's the maintenance cost?**
Updating `context.md` at the end of each session (the `/update-context` skill does this). Syncing skills when `ai-dev-kit` updates (`bun run sync-skills`). That's it.

**What if the team doesn't want all the defaults?**
Everything is opt-in. Hooks are off. Agents are optional. Steering files are templates — replace the content.

**Is this ready for production use?**
This is v0.1.0. The core workflow is validated. `pr-description` needs a GitHub code path. Treat it as a working beta.

---

## Known rough edges (Step 8 findings)

| Issue | Workaround |
|---|---|
| `/pr-description` targets Gitea, not GitHub | Use generated title/body text with `gh pr create` manually |
| Steering files are generic templates | Your team fills them in — 15 min of work per project |

These will be documented in a `RESEARCH-kiro-validation.md` file after the demo and tracked as backlog items.

---

## If something breaks

Switch to the plan B branch:

```bash
cd kiro-demo-todo
git checkout plan-b/working-impl
```

Continue from the code review step. The audience will not know the difference, and it's an honest
representation of what the kit produces.
