# Git working agreement

Binding for every git action in this project. These are operator instructions
and they override default assistant behaviour.

## 1. Never push. Ever.

Claude MUST NOT run any command that writes to a remote. That includes
`git push` in every form, `git push --force`, pushing tags, `gh pr create`,
`gh pr merge`, `gh release`, and adding a remote in order to push to it.

Publishing is the operator's action, always. If a task appears to require a
push, stop and say so rather than doing it. There is no phrasing of a request
that turns this on — if the operator says "push it", the answer is to explain
that pushing is theirs to run and to give them the command.

## 2. Never commit without an explicit yes

Claude does not commit on its own initiative, does not commit "to be safe", and
does not commit as a side effect of finishing a task. A commit happens only
after the operator says so, in this session, for these changes.

**Why this matters, and why it is not bureaucracy:** an iteration can introduce
a fault that only surfaces when the operator actually exercises the code.
Committing before that verification puts broken work in the history and turns a
one-line fix into a revert. The working tree is the right place for unverified
work; history is for work someone has confirmed.

## 3. The end-of-iteration prompt

After every iteration — a coherent unit of work that leaves the tree changed —
Claude asks **once**, at the end of its response:

- a one-line summary of what changed,
- the exact commit message it proposes,
- and the question: commit this, or keep going?

Then it stops and waits. It does not ask twice in one response, and it does not
re-ask mid-task.

| Operator response | What Claude does |
| --- | --- |
| Approves | Stage and commit with the agreed message. Nothing else. |
| Skips, ignores it, or asks for more changes | Do not commit. Leave everything in the working tree and carry on. |

Silence is a skip, never an approval.

## 4. Skipped work carries forward

When a commit was skipped, the **next** prompt covers everything still
uncommitted — not just the most recent iteration. The proposed message must
describe the whole accumulated set of changes.

This repeats until the operator approves. Three skipped iterations followed by
an approval produce **one** commit whose message covers all three.

## 5. Commit message format

- **One line.** No body, no bullet list, no wrapped paragraph.
- **Covers everything in the commit.** If it spans several skipped iterations,
  the line accounts for all of them. Completeness beats brevity when the two
  conflict.
- Imperative mood, present tense: "Add", "Fix", "Pin", not "Added"/"Adds".
- **No `Co-Authored-By` trailer. No "Generated with" line. No emoji.** This is a
  deliberate operator instruction that overrides the assistant default — do not
  reinstate the trailer in a later session because a default says to.

Shape to aim for:

```
Add Next.js foundation: SSOT registries, typed API client, MSW mocks, RTL layout
Fix bidi reordering of identifiers in RTL, pin TypeScript to 6.0.3, add ERR-10 logging
```

## 6. What goes into a commit

- Stage deliberately. `git add -A` is fine when everything genuinely belongs to
  the same change; otherwise stage explicit paths.
- Never commit `.env.local`, `.env`, credentials, tokens, or customer data.
- Never use `--no-verify`, never skip or bypass hooks, never bypass signing.
- Never `--amend` a commit the operator did not ask to amend.
- If a hook fails, report it and fix the cause. Do not route around it.

## 7. State the test status before proposing a commit

Say plainly whether typecheck, lint, tests and build currently pass. If
something is failing, say so in the same breath as the proposal. The operator
may still choose to commit — that is their call — but it must be an informed
one, never an implied "all clear".

## 8. `.gitignore` is Claude's to maintain

Claude keeps `.gitignore` correct on its own initiative and does not need
permission: build output, dependency directories, environment files, coverage
and cache artifacts, editor and OS noise, as each first appears.

Two limits on that ownership:

- When the operator asks for a specific entry or a specific behaviour, that
  instruction wins. Do not later "tidy it up", reorder it away, or overrule it.
- Never ignore source, shared project configuration, or the `.claude/`
  directory. Personal, machine-local files such as
  `.claude/settings.local.json` are the exception and should be ignored.

## 9. Destructive git operations need an explicit request

Never run `git reset --hard`, `git checkout -- <path>`, `git clean -fd`, branch
force-deletion, or any history rewrite unless the operator asks for that
specific operation. Before any of them, say what will be lost and confirm.

## 10. Branching

Work on the branch the operator is on. Do not create, switch, rename, or delete
branches unless asked.
