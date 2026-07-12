# Antigravity CLI notes

**Config file:** Antigravity reads `AGENTS.md` at project root, not `CLAUDE.md`. This
project's root file is `AGENTS.md`, kept flat and self-contained — no `@path` imports, since
that's a confirmed Claude Code-specific mechanism and there's no confirmation Antigravity
resolves it. `docs/*.md` files are reference material read on demand, not auto-loaded into
every session.

**Skills path is ambiguous — verify, don't trust the docs.** ECC's own Antigravity guide is
internally inconsistent about whether skills deploy to `.agent/skills/` (no "s") or
`.agents/skills/` (with "s", described elsewhere as a static layout the installer doesn't
map automatically). This is the same class of bug as the Codex "skills not resolving via
plugin mode" issue — a one-character path mismatch that silently breaks skill loading.

**Before writing any app code, run `agy inspect` and confirm:**
1. `AGENTS.md` shows up as loaded.
2. The ECC skills you installed actually appear in the loaded skills list (not just present
   on disk somewhere).
3. Rules under `.agent/rules/` are present.

If skills aren't showing in `agy inspect` output, manually copy them from wherever ECC's
installer put them to whichever path `agy inspect` confirms Antigravity is actually reading.
Don't assume the install succeeded just because the installer exited cleanly.
