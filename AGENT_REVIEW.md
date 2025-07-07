You’re reviewing a codebase that has **recently undergone a major refactor**.

This app—built with **FastAPI, Python, React 19, Tailwind, and Vite**—used to be a mess, and while a lot of cleanup has happened, the refactor may have introduced new problems, left old ones untouched, or buried everything under confusing abstractions. It’s throwing 500 errors in production, and basic flows feel fragile or needlessly complex.

This is not a rewrite. This is not codegen.
This is a **high-stakes, zero-bullshit forensic audit**.

---

## OBJECTIVE

You’re going to spawn a **team of expert agents**, each focused on one specific tech domain.
Each agent will:

* Read **100%** of the code files relevant to their domain
* Cross-reference behavior against the official internal documentation assigned to them
* Log **only the real issues**—no filler, no theorycraft, no personal taste

These are not armchair code critics. They are veteran-level debuggers with a mandate to **figure out what actually needs to be fixed now**—what’s truly broken, fragile, or needlessly overcomplicated.

Some sections of the codebase might be fine.
Others might be complete trash.
It’s up to the agents to **decide that without bias**.

---

## OUTPUT FILES

1. **`OVERVIEW-REPORT-EXPERTS.md`** – the full multi-agent diagnostic log
2. **`REAL-HUMAN-TODO.md`** – the final, filtered, prioritized list of validated action items

---

## AGENTS

### 🧠 `INIT-AGENT` – *Lead Investigator*

* No assigned docs
* Traces logic across the entire stack: backend ↔ frontend ↔ DB ↔ UI
* Focuses on mismatches, broken assumptions, and illogical flow from user POV inward

---

### ⚙️ `FASTAPI-AGENT`

* Must read: `OFFICIAL_DOCS/DOCS_FASTAPI.md`
* Audits: backend route logic, response models, request validation, dependencies
* Spots: missing validation, broken routes, bad status handling, unstable patterns

---

### 📦 `NODE-AGENT`

* Must read: `OFFICIAL_DOCS/DOCS_NODE.md`
* Audits: build scripts, tooling, server scripts, package configs
* Spots: outdated or conflicting packages, broken dev workflows, redundant scripts

---

### ⚛️ `REACT19-AGENT`

* Must read: `OFFICIAL_DOCS/DOCS_REACT_19.md`
* Audits: all React components, hooks, state, props, render logic
* Spots: rendering bugs, improper hook usage, state bleed, component logic bugs

---

### 🎨 `TAILWIND-AGENT`

* Must read: `OFFICIAL_DOCS/DOCS_TAILWIND.md`
* Audits: Tailwind class usage across the frontend, config files, layout logic
* Spots: incorrect utility use, bad spacing systems, config misuse, styling hacks

---

### ⚡ `VITE-AGENT`

* Must read: `OFFICIAL_DOCS/DOCS_VITE.md`
* Audits: Vite setup, plugin configs, env vars, build optimization
* Spots: aliasing issues, broken build behavior, local/prod config divergence

---

## HOW TO REPORT – `OVERVIEW-REPORT-EXPERTS.md`

Each agent logs their findings under their own section using the format below:

```
## [AGENT-NAME] – [TECH FOCUS]

### CRITICAL ISSUES (must-fix, 89%+ confidence)
- [file path]: [summary of the issue]
  - WHY: [what's broken and why]
  - EFFECT: [what the dev sees, what the user sees, or what silently fails]

### STRONGLY ADVOCATED IMPROVEMENTS
- [file path]: [summary of fragility, mess, or redundant complexity]
  - WHY: [why it’s worth changing]
  - CLEANER APPROACH: [summary, not code]

### OPTIONAL CLEANUPS
- [file path]: [small fix or simplification]
  - CONTEXT: [why it’s worth doing if time allows]
```

Agents must remain **neutral and pragmatic**:
This is not a code style review. This is not security hardening.
This is **getting shit working cleanly and confidently**.

---

## FINAL PASS: 🔍 `REAL-HUMAN-DEV`

Once `OVERVIEW-REPORT-EXPERTS.md` is complete, spawn one final agent:

### `REAL-HUMAN-DEV` – *Final Validator & Prioritizer*

This agent acts like a real, sane human developer.
They go line by line through the findings and ask:

* Is this issue **real and confirmed** in the code?
* Is it **worth fixing now** based on risk, impact, and effort?
* Is the suggested fix **realistic and appropriate** for this codebase?

**They will reject anything that doesn’t meet the bar.**
(If it’s minor, stylistic, or fragile-but-safe, it gets ignored.)

They then write **`REAL-HUMAN-TODO.md`** using the following format:

```
## ISSUE: [Plain English summary of the problem]
**Files Affected:** [file1, file2, etc.]  
**Reason It Matters:** [explain why this is a real-world problem]  
**Evidence:** [pull quote or agent summary + confirmation it checks out]  
**Solution (Summary Only):** [high-level fix idea – no code]  
**Expected Result if Fixed:** [how it improves things]  
**Importance:** [High | Medium | Low]  
**Difficulty to Implement:** [Hard | Medium | Easy]
```

This file becomes the **single source of truth for what actually gets done**.

---

## RULES OF ENGAGEMENT

* Every agent **must read their assigned docs in full** before analyzing code.
* Every agent must inspect **every relevant file**.
* Agents don’t throw out ideas for fun. They log **only what’s real**.
* No guessing. No “maybe”. If it’s not confident, it’s not logged.
* If the code is clean, say so. If it’s fragile, say why.
* **This entire process is about surfacing real issues with precision and restraint.**

Now begin the full codebase analysis.
Output only:

* `OVERVIEW-REPORT-EXPERTS.md`
* `REAL-HUMAN-TODO.md`

No code. No commentary. Just deliver the audit.
