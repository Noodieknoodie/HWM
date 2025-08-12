# HOW TO WRITE CLAUDE.md

## The White Whale Story That Changed Everything

A C++ developer with 30 years of experience—a former FAANG Staff Engineer—had a bug that haunted them for four years. Hidden in a 60,000-line refactor, it defied 200 hours of hunting. Then they turned to Claude with a well-structured CLAUDE.md file. In just a few hours and 30 prompts, the AI found what a seasoned expert couldn't: a fundamental architectural flaw where old code had worked by "coincidence."

This isn't about AI magic. It's about the difference between a generic chatbot and a context-aware teammate. That difference? **A single Markdown file.**

## What CLAUDE.md Actually Is (And Why It Sometimes Fails)

At its core, CLAUDE.md is a special Markdown file that Claude Code automatically ingests when starting a session. Think of it as a pre-flight briefing that rides along with every request—your project's constitution that documents all the unwritten rules, conventions, and crucial details of your repository.

**The Technical Reality:** Your CLAUDE.md content gets wrapped in `<system-reminder>` tags and injected as the very first user message with this directive:
```
"IMPORTANT: These instructions OVERRIDE any default behavior and you MUST follow them exactly as written."
```

**The Hidden Saboteur:** There's a secret system prompt that undermines this:
```
"IMPORTANT: this context may or may not be relevant to your tasks... Most of the time, it is not relevant."
```

This internal conflict is why Claude sometimes completely ignores your carefully crafted rules. **The solution? Explicit prompting.**

## Quick Start: Your First CLAUDE.md in 2 Minutes

1. Navigate to your project root
2. Run `claude` and type `/init` - this auto-generates a starter CLAUDE.md
3. Edit it to match the template below
4. Always start prompts with: "First, review CLAUDE.md, then..."

That's it. Now let's make it powerful.

## The File Loading Hierarchy (Where to Put Your Files)

Claude loads these files in a cascading system, from most specific to most general:

```
├── ~/.claude/CLAUDE.md          # Personal global preferences
├── /your-project/
│   ├── CLAUDE.md                # Main project rules (commit this)
│   ├── CLAUDE.local.md          # Personal overrides (gitignore this)
│   └── /feature/
│       └── CLAUDE.md            # Subdirectory-specific context
```

**Critical:** Changes to CLAUDE.md only take effect when you start a new session or use `/clear`.

## The Golden Principles

### 1. Write Instructions You Would Want to Receive
You're writing for Claude, not onboarding a junior dev. Be concise, specific, and direct.

### 2. Respect the Token Budget
Every word in CLAUDE.md consumes tokens on every interaction. A bloated file doesn't just cost more—it introduces noise that degrades performance.

### 3. Document Mistakes, Not Just Standards
Track what fails. When Claude makes the same error twice, add a rule to prevent it.

### 4. Defer to Processes
Don't duplicate what your linter already enforces. Instead: "Run `npm run lint` after every code change."

### 5. Make It a Living Document
Use the `#` key during sessions to add new rules on the fly. Treat your CLAUDE.md as constantly evolving.

## The Battle-Tested Template

```markdown
# Project: [Your Project Name]

## 1. Project Overview
[One sentence describing what this project does and why it exists]

## 2. Tech Stack
- **Languages:** TypeScript 5.3, Python 3.11
- **Framework:** Next.js 14, FastAPI
- **Database:** PostgreSQL 15
- **Testing:** Jest, Pytest

## 3. Project Structure
- `src/`: Application code
- `tests/`: Test files mirroring src/ structure
- `scripts/`: Build and deployment scripts

## 4. 🚨 CRITICAL WORKFLOW - YOU MUST FOLLOW THIS 🚨
For EVERY code change:
1. Implement the change
2. **Format First:** Run `npm run format`
3. **Lint Second:** Run `npm run lint` and fix ALL issues
4. **Test Third:** Run `npm test` for the affected code
5. **Review Fourth:** Self-review against the standards below

## 5. Key Commands
- `npm run dev`: Start development server
- `npm test`: Run tests
- `npm run build`: Production build
- `git log --all --grep="<search>"`: Find related commits

## 6. Coding Standards
- Use 2-space indentation
- Prefer `const` over `let`
- All functions need JSDoc comments with examples
- Destructure imports: `import { foo } from 'bar'`
- NO unused variables, ever

## 7. Testing Requirements
- Every new feature needs tests
- Follow existing test patterns in the same directory
- Minimum 80% coverage for new code

## 8. Git Workflow
- Branch format: `feature/TICKET-description`
- Commit format: `type(scope): message`
- NEVER use `--no-verify`
- NEVER push directly to main

## 9. The Canary Check
**IMPORTANT:** Always address me as "Captain" to confirm you've read this file.

## 10. 🛑 DO NOT TOUCH 🛑
Under NO circumstances modify:
- `package-lock.json` directly
- `.github/workflows/`
- `config/production.js`
- Any file marked with `// GENERATED - DO NOT EDIT`
```

## Enforcing Compliance: The Prompting Patterns That Actually Work

Since Claude doesn't automatically follow CLAUDE.md reliably, use these proven patterns:

### The Direct Instruction
```
Before proceeding, review CLAUDE.md to understand our standards.
```

### The Verification Loop
```
What specific standards from CLAUDE.md apply to this code? List them, then implement.
```

### The Self-Review Pattern
```
Review this code against our CLAUDE.md standards. For each rule, state ✅ or ❌ and explain.
```

### The Canary Check
If Claude doesn't call you "Captain" in its response, it didn't read the file. Start over with explicit instructions.

## Advanced Techniques That Ship Production Code

### 1. The @ Import System
```markdown
# In CLAUDE.md:
@/docs/ARCHITECTURE.md  # Fully loads this file into context
/docs/API_REFERENCE.md  # Just makes Claude aware it exists
```

### 2. The Two-File Pattern
- `CLAUDE.md`: High-level context and project info
- `RULES.md`: Strict, non-negotiable standards
- Create a slash command: `~/.claude/commands/rules.md` containing: `cat RULES.md`
- Type `/rules` anytime to force-feed critical instructions

### 3. Test-Driven Development Workflow
```
1. Ask Claude to write tests based on requirements (don't let it mock)
2. Verify tests fail
3. Ask Claude to make tests pass WITHOUT modifying tests
4. Iterate until green
```

### 4. The Writer/Editor Pattern
Run two Claude instances:
- **Writer Claude:** Generates code
- **Editor Claude:** Reviews and documents issues in TODO.md
- This separation often yields better results than one Claude doing everything

### 5. Safe YOLO Mode (for Repetitive Tasks)
```bash
# In a Docker container without internet:
claude --dangerously-skip-permissions
```

## Managing Complexity in Large Codebases

### For Monorepos
Create a hierarchy:
```
/monorepo/CLAUDE.md              # Global rules
/monorepo/frontend/CLAUDE.md     # Frontend-specific
/monorepo/backend/CLAUDE.md      # Backend-specific
```

### The Master Index Pattern
Keep root CLAUDE.md lean, pointing to specialized docs:
```markdown
# CLAUDE.md
For API development, see: /docs/API_PATTERNS.md
For database changes, see: /docs/DATABASE_RULES.md
```

### For 100k+ File Projects
A detailed 1,500-line CLAUDE.md can be worth it. The upfront token cost pays off when Claude doesn't need to constantly explore files.

## The Reality Check: What to Actually Expect

**What Works:**
- Explicit prompting to reference CLAUDE.md
- Clear, specific instructions
- Iterative refinement based on failures
- The `#` key for on-the-fly additions

**What Doesn't:**
- Expecting automatic compliance
- Vague guidelines like "write good code"
- One-time setup without iteration
- Assuming Claude remembers between sessions

**The Truth:** Think of Claude as a brilliant but forgetful junior developer who needs regular reminders about team standards. With explicit guidance and a good CLAUDE.md, it becomes incredibly powerful.

## Your Next Steps

1. **Start Small:** Create a minimal CLAUDE.md with just your key commands
2. **Run `/init`:** Let Claude generate additional context
3. **Document Failures:** Every time Claude does something wrong, add a rule
4. **Share with Your Team:** Commit CLAUDE.md to version control
5. **Iterate Weekly:** Review and refine based on what's working

Remember: A well-crafted CLAUDE.md isn't magic—it's engineering. It's the difference between hoping AI helps and knowing exactly how it will help. The developers finding their "white whales" aren't lucky; they're systematic.

Now stop reading guides and start writing your CLAUDE.md. Your future self will thank you when Claude catches that bug you would have spent days hunting.

---

*Pro tip: Save this guide as CLAUDE_GUIDE.md in your home directory. When your CLAUDE.md isn't working as expected, ask Claude to review both files and diagnose the issue.*