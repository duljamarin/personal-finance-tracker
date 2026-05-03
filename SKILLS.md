# Skills Guide — Personal Finance Tracker

Skills are pre-built AI behaviors you invoke with a `/` command in Claude Code.
They run specialized logic tailored to a specific task type.

---

## Available Skills & When to Use Them

### `/simplify`
**What it does:** Reviews recently changed code for quality issues — unused abstractions, duplication, over-engineering — and fixes them without changing behavior.

**Use when:**
- You just finished a feature and want a clean-up pass
- A component has grown messy after multiple edits
- You want to reduce complexity without breaking anything

**Example:**
```
/simplify
```

---

### `/review`
**What it does:** Reviews a pull request — reads the diff and checks for bugs, logic errors, missing edge cases, and style issues.

**Use when:**
- Before merging a branch into `main`
- After a focused bug fix or refactor
- You want a quick second opinion

**Example:**
```
/review
```

---

### `/ultrareview`
**What it does:** Multi-agent cloud review of the current branch or a specific GitHub PR. Spawns parallel agents to examine different concerns simultaneously — more thorough than `/review`.

**Use when:**
- Large PRs touching multiple layers (component + API + migration)
- Security-sensitive changes (auth, RLS, Paddle webhooks, Edge Functions)
- You want frontend + backend + i18n checked in one pass

**Example — review current branch:**
```
/ultrareview
```
**Example — review a specific GitHub PR:**
```
/ultrareview 7
```
> Requires a git repo. Billed per use.

---

### `/security-review`
**What it does:** Audits pending changes on the current branch for security vulnerabilities — XSS, missing auth checks, leaked secrets, RLS gaps, OWASP top 10.

**Use when:**
- After touching any auth-related code (LoginForm, RegisterForm, AuthContext)
- After modifying Paddle webhook logic (`paddle-webhook/` Edge Function)
- After adding or editing a SQL migration with RLS policies
- After adding a new Edge Function

**Example:**
```
/security-review
```

---

### `/init`
**What it does:** Scans the codebase and generates a new `CLAUDE.md` with accurate project documentation.

**Use when:**
- `CLAUDE.md` is significantly out of date after a major refactor
- New directories or patterns were introduced that aren't documented
- You want a fresh baseline for a new AI session

**Example:**
```
/init
```
> This project has a maintained `CLAUDE.md` — only use if a full regeneration is needed.

---

### `/loop`
**What it does:** Runs a prompt or slash command repeatedly on a recurring interval, self-pacing between runs.

**Use when:**
- Watching a background process (Netlify build, Supabase migration)
- Running a check every few minutes during active work
- Polling for a condition to become true

**Example — check build every 5 minutes:**
```
/loop 5m check if the Netlify deploy finished
```

---

### `/schedule`
**What it does:** Creates a scheduled background agent that runs on a cron schedule or one-time in the future.

**Use when:**
- A feature flag or temporary code needs removal in the future
- You want recurring automated checks (i18n parity, security audit)
- You shipped a staged rollout that needs a follow-up action

**Example — one-time cleanup:**
```
/schedule in 2 weeks, check if the onboarding_v2 experiment can be removed
```
**Example — weekly audit:**
```
/schedule every Monday, verify en and sq translation files have identical keys
```

---

### `/fewer-permission-prompts`
**What it does:** Scans recent transcripts and adds common read-only operations to an allowlist so Claude stops asking for permission on routine commands.

**Use when:**
- Claude keeps prompting for approval on the same bash commands
- You want smoother sessions without repeated permission dialogs

**Example:**
```
/fewer-permission-prompts
```

---

## Project-Specific Patterns

### After finishing a bug fix
```
/simplify          ← tighten the changed code
/security-review   ← verify no vulnerabilities were introduced
```

### Before merging any PR
```
/ultrareview       ← full parallel review across all changed areas
```

### After adding a new Edge Function
```
/security-review   ← verify auth checks, signature validation, no leaked secrets
```

### After touching RLS migrations
```
/security-review   ← verify policies are correct and complete for all operations
```

### For a large feature (new page + API + migration at once)
Use sub-agents in parallel — more efficient than skills for multi-file work:
- `backend-developer` agent → migration + API functions
- `frontend-developer` agent → React component + i18n keys
- `qa-developer` agent → review + i18n parity check

Then run `/simplify` at the end to clean up.

### When CLAUDE.md drifts from reality
```
/init              ← regenerate documentation from current codebase
```

---

## Sub-Agents vs Skills — When to Use Which

| Situation | Use |
|-----------|-----|
| Clean up code after a change | `/simplify` skill |
| Review a PR before merging | `/review` or `/ultrareview` skill |
| Security audit of a change | `/security-review` skill |
| Build a new feature across multiple files | Sub-agents (`backend-developer` + `frontend-developer`) |
| QA audit of the whole codebase | `qa-developer` sub-agent |
| Deploy Edge Functions | `devops` sub-agent or manual CLI |
| Watch a background process | `/loop` skill |
| Schedule a future task | `/schedule` skill |
